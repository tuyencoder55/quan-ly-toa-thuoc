---
description: Khởi tạo dự án Toa Thuốc từ đầu (Vite + React + Tailwind + PWA + Supabase)
---

# /setup-project

Làm lần lượt, xong mỗi bước báo người dùng rồi mới sang bước sau.

1. Đọc rule `project-rules` và `privacy-security`.
2. Tạo project: `npm create vite@latest toa-thuoc -- --template react-ts`, cài Tailwind, cài `@supabase/supabase-js` và `vite-plugin-pwa`.
3. Tạo cấu trúc thư mục:
   - `src/lib/` (supabase client, compressImage, normalizeName)
   - `src/pages/` (Login, Home, Confirm, Detail)
   - `src/components/`
   - `supabase/migrations/`, `supabase/functions/`
4. Tạo `.env.example` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`; thêm `.env*` vào `.gitignore`.
5. **Dừng lại, nhờ người dùng:** tạo project Supabase, dán URL và anon key vào `.env.local`.
6. Theo skill `supabase-setup`: tạo file migration, hướng dẫn người dùng dán vào SQL Editor, tạo bucket private, tạo tài khoản và tắt đăng ký.
7. Làm màn Đăng nhập + bảo vệ route (chưa đăng nhập thì không vào được).
8. Chạy `npm run dev`, báo người dùng mở thử và đăng nhập.
