// Edge Function: scan-prescription
// Nhiệm vụ: Nhận ảnh đã nén từ frontend -> Gọi Gemini Flash với tốc độ nhanh nhất -> Trả về JSON 3 trường + danh sách thuốc.
// Biến môi trường: GEMINI_API_KEY, GEMINI_MODEL (được thiết lập trong Supabase secrets)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Xử lý CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Kiểm tra xác thực người dùng (JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Yêu cầu đăng nhập để sử dụng tính năng này." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Lấy dữ liệu gửi lên (imageBase64)
    const { imageBase64, mimeType = "image/jpeg" } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Không tìm thấy dữ liệu ảnh (imageBase64)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Lấy API Key và Model từ Supabase Secrets
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trong Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Làm sạch chuỗi base64 nếu có header data:image/jpeg;base64,
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    // 4. Prompt siêu ngắn và tập trung để tối ưu tốc độ đọc của AI
    const systemPrompt = `Đây là ảnh đơn thuốc/toa thuốc tiếng Việt. Nhiệm vụ của bạn là đọc và trích xuất đúng các thông tin:
- customer_name: Họ và tên của khách hàng / bệnh nhân (giữ nguyên dấu tiếng Việt, viết hoa chuẩn). Bỏ qua chức danh bác sĩ, người kê đơn.
- birth_date: Ngày sinh (định dạng YYYY-MM-DD). Nếu trên toa chỉ ghi năm sinh (ví dụ 1990), trả về 1990-01-01.
- address: Địa chỉ liên hệ của khách hàng.
- medicines: Danh sách các thuốc trong đơn gồm:
    * name: Tên thuốc
    * dosage: Hàm lượng, liều lượng hoặc số lượng (ví dụ: 500mg, 10 viên, 2 hộp)
    * usage: Hướng dẫn sử dụng (ví dụ: Ngày uống 2 lần, mỗi lần 1 viên sau ăn)
Không tự bịa thông tin. Trường nào không có hoặc không rõ chữ thì để null hoặc chuỗi rỗng. Nếu có nhiều tờ toa chồng nhau, chỉ đọc tờ rõ nhất ở trung tâm.`;

    const requestBody: Record<string, any> = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0, // 0 = kết quả chính xác, không sáng tạo
        maxOutputTokens: 600, // Giới hạn token để phản hồi nhanh
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            customer_name: { type: "STRING", nullable: true },
            birth_date: { type: "STRING", nullable: true },
            address: { type: "STRING", nullable: true },
            medicines: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  dosage: { type: "STRING", nullable: true },
                  usage: { type: "STRING", nullable: true },
                },
                required: ["name"],
              },
            },
          },
          required: ["customer_name", "medicines"],
        },
      },
    };

    // Tắt thinking trên các model 2.5/Flash hỗ trợ để tăng tốc tối đa
    if (model.includes("2.5") || model.includes("flash")) {
      requestBody.generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const aiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      // Nếu lỗi do thinkingBudget không được hỗ trợ ở model hiện tại, thử lại 1 lần không kèm thinkingConfig
      if (requestBody.generationConfig.thinkingConfig) {
        delete requestBody.generationConfig.thinkingConfig;
        const retryResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          const rawText = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
          const parsed = JSON.parse(rawText || "{}");
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      return new Response(
        JSON.stringify({ error: `Lỗi từ Gemini AI: ${aiResponse.status}`, details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: "AI không trả về nội dung hợp lệ." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedResult = JSON.parse(rawContent);

    // Chuẩn hóa định dạng trước khi gửi về client
    const sanitized = {
      customer_name: parsedResult.customer_name ? String(parsedResult.customer_name).trim() : null,
      birth_date: parsedResult.birth_date ? String(parsedResult.birth_date).trim() : null,
      address: parsedResult.address ? String(parsedResult.address).trim() : null,
      medicines: Array.isArray(parsedResult.medicines)
        ? parsedResult.medicines.map((m: any) => ({
            name: String(m.name || "").trim(),
            dosage: m.dosage ? String(m.dosage).trim() : "",
            usage: m.usage ? String(m.usage).trim() : "",
          })).filter((m: any) => m.name.length > 0)
        : [],
    };

    return new Response(JSON.stringify(sanitized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Lỗi xử lý nội bộ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
