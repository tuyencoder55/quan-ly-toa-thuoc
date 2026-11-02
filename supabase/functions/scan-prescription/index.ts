// Edge Function: scan-prescription
// Nhiệm vụ: Nhận ảnh đã nén từ frontend -> Gọi Gemini Flash với tốc độ nhanh nhất -> Trả về JSON 3 trường + danh sách thuốc.
// Cơ chế thông minh: Tự động thử các model Flash dự phòng nếu Google AI báo 503 (quá tải) hoặc 404 (model cũ).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Danh sách các model Flash tối ưu theo thứ tự ưu tiên
const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
];

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

    // 3. Lấy API Key từ Supabase Secrets
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Chưa cấu hình GEMINI_API_KEY trong Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Model người dùng chỉ định nếu có
    const preferredModel = Deno.env.get("GEMINI_MODEL") || "gemini-flash-lite-latest";
    const modelsToTry = [
      preferredModel,
      ...CANDIDATE_MODELS.filter((m) => m !== preferredModel),
    ];

    // Làm sạch chuỗi base64 nếu có header data:image/jpeg;base64,
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    // 4. Prompt siêu ngắn và chuẩn xác để AI đọc toa thuốc
    const systemPrompt = `Đây là ảnh đơn thuốc/toa thuốc tiếng Việt. Hãy đọc và trích xuất đúng các thông tin:
- customer_name: Họ và tên của khách hàng / bệnh nhân (giữ nguyên dấu tiếng Việt, viết hoa chuẩn). Bỏ qua chức danh bác sĩ, người kê đơn.
- birth_date: Ngày sinh (định dạng YYYY-MM-DD). Nếu trên toa ghi ngày/tháng/năm hãy chuyển thành YYYY-MM-DD.
- address: Địa chỉ liên hệ của khách hàng.
- medicines: Danh sách các thuốc trong đơn gồm:
    * name: Tên thuốc
    * dosage: Hàm lượng, liều lượng hoặc số lượng (ví dụ: 500mg, 14 Viên, 2 hộp)
    * usage: Hướng dẫn sử dụng (ví dụ: Ngày uống 2 lần, mỗi lần 1 viên sau ăn)
Không tự bịa thông tin. Trường nào không có hoặc không rõ chữ thì để null hoặc chuỗi rỗng. Chỉ đọc tờ đơn thuốc ở trung tâm.`;

    const requestBody = {
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
        temperature: 0,
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    };

    let lastError = null;

    // 5. Cơ chế Fallback: Thử lần lượt các model Flash cho đến khi thành công
    for (const model of modelsToTry) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const rawContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

          if (rawContent) {
            const parsedResult = JSON.parse(rawContent);

            // Chuẩn hóa định dạng trước khi gửi về client
            const sanitized = {
              customer_name: parsedResult.customer_name ? String(parsedResult.customer_name).trim() : null,
              birth_date: parsedResult.birth_date ? String(parsedResult.birth_date).trim() : null,
              address: parsedResult.address ? String(parsedResult.address).trim() : null,
              medicines: Array.isArray(parsedResult.medicines)
                ? parsedResult.medicines
                    .map((m: any) => ({
                      name: String(m.name || "").trim(),
                      dosage: m.dosage ? String(m.dosage).trim() : "",
                      usage: m.usage ? String(m.usage).trim() : "",
                    }))
                    .filter((m: any) => m.name.length > 0)
                : [],
            };

            return new Response(JSON.stringify(sanitized), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          const errText = await aiResponse.text();
          console.warn(`Model ${model} trả về lỗi HTTP ${aiResponse.status}:`, errText);
          lastError = `Model ${model} (${aiResponse.status}): ${errText}`;
          // Tiếp tục thử model kế tiếp trong danh sách fallback
        }
      } catch (networkErr: any) {
        console.warn(`Lỗi mạng khi gọi model ${model}:`, networkErr.message);
        lastError = networkErr.message;
      }
    }

    return new Response(
      JSON.stringify({ error: "Tất cả các model AI đều đang bận", details: lastError }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Lỗi xử lý nội bộ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
