---
description: Đưa app lên mạng (HTTPS) và cài vào màn hình chính điện thoại
---

# /deploy

1. Chạy `npm run build`, sửa lỗi nếu có.
2. Chạy kiểm tra bảo mật theo rule `privacy-security`: bucket private, RLS bật, không có key trong code, tắt đăng ký mới.
3. Deploy frontend lên Vercel, Netlify hoặc Cloudflare Pages (chọn cái người dùng đã quen). Thêm 2 biến `VITE_SUPABASE_*` trong cài đặt của dịch vụ.
4. Thêm domain của app vào danh sách cho phép (CORS/Site URL) trong Supabase.
5. Deploy Edge Function: `supabase functions deploy scan-prescription`.
6. Hướng dẫn người dùng mở link trên điện thoại -> "Thêm vào Màn hình chính" -> thử chụp 1 toa thật.
