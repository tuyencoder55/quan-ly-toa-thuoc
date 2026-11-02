# Rule: Toa Thuốc — quy tắc chung của dự án

> Rule này luôn được áp dụng (Always On). Agent đọc trước khi viết bất kỳ dòng code nào.

## Dự án là gì
Web app **cá nhân** (1 người dùng) để lưu và tra cứu toa thuốc.
Chụp toa bằng điện thoại -> AI đọc ra **tên KH, ngày sinh, địa chỉ** -> lưu vào Supabase kèm ảnh toa.
Trọng tâm: **tên KH** chính xác và **tốc độ**.

## Tech stack (không tự ý đổi)
- Frontend: Vite + React + TypeScript + Tailwind, cài thêm `vite-plugin-pwa` (để mở như app trên điện thoại)
- Backend: Supabase (Postgres + Auth + Storage + Edge Functions)
- AI đọc toa: Gemini Flash, gọi **chỉ từ Edge Function**, không bao giờ gọi trực tiếp từ trình duyệt
- Biến môi trường: `GEMINI_API_KEY` chỉ nằm trong Supabase secrets. Frontend chỉ có `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`
- Tên model để trong biến `GEMINI_MODEL` để dễ đổi, không hard-code

## Phạm vi dữ liệu (rất quan trọng)
- AI chỉ trích xuất 3 trường: `customer_name`, `birth_date`, `address`
- **Không** trích xuất, không lưu: chẩn đoán, tên thuốc, mã bệnh, số điện thoại, mã BHYT. Ảnh toa gốc đã chứa các thông tin này rồi, không cần nhân bản vào database
- Nếu muốn thêm trường mới, hỏi người dùng trước

## Quy ước code
- Người dùng là designer, không phải coder chuyên nghiệp -> **comment tiếng Việt, giải thích "đoạn này để làm gì"** ở những chỗ không hiển nhiên
- Mỗi file 1 nhiệm vụ rõ ràng, tên file dễ đoán (`ScanButton.tsx`, `useScan.ts`)
- Không cài thêm thư viện nếu có thể làm bằng code thuần. Khi cần cài, nói rõ tại sao
- Giao diện: mobile-first (thiết kế cho màn hình điện thoại trước), nút lớn dễ bấm bằng ngón cái, chữ dễ đọc
- Text hiển thị cho người dùng: tiếng Việt

## Cách làm việc với người dùng
- Làm từng bước nhỏ, chạy được ngay, rồi mới sang bước tiếp
- Sau mỗi bước, nói ngắn gọn: đã làm gì, người dùng cần bấm/chạy gì để thử
- Gặp chỗ mơ hồ thì hỏi, đừng đoán
