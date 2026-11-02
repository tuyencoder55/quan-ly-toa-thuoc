---
name: supabase-setup
description: Dùng khi tạo hoặc sửa database, Storage, RLS, Auth và Edge Function trên Supabase cho app quản lý toa thuốc.
---

# Skill: Thiết lập Supabase cho Toa Thuốc

## 1. Bảng `prescriptions`
Chạy trong Supabase -> SQL Editor (hoặc lưu thành file `supabase/migrations/001_init.sql`):

```sql
-- Bảng lưu toa thuốc. Mỗi dòng = 1 toa.
create table public.prescriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,                 -- tên KH (trường quan trọng nhất)
  name_search   text not null default '',      -- tên đã bỏ dấu + viết thường, để tìm kiếm
  birth_date    date,                          -- ngày sinh (có thể trống)
  address       text,                          -- địa chỉ (có thể trống)
  image_path    text,                          -- đường dẫn ảnh trong Storage
  note          text,                          -- ghi chú tự do (tùy chọn)
  created_at    timestamptz not null default now()
);

create index prescriptions_user_created_idx on public.prescriptions (user_id, created_at desc);
create index prescriptions_name_search_idx  on public.prescriptions (user_id, name_search text_pattern_ops);

-- Bật RLS: không có policy thì không ai đọc được.
alter table public.prescriptions enable row level security;

create policy "own rows - select" on public.prescriptions for select using (auth.uid() = user_id);
create policy "own rows - insert" on public.prescriptions for insert with check (auth.uid() = user_id);
create policy "own rows - update" on public.prescriptions for update using (auth.uid() = user_id);
create policy "own rows - delete" on public.prescriptions for delete using (auth.uid() = user_id);
```

Tìm theo tên: frontend tự bỏ dấu từ khóa tìm (`normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase()`) rồi query `name_search ilike '%từ khóa%'`. Hàm bỏ dấu này dùng chung cho lúc lưu `name_search`.

## 2. Storage
- Tạo bucket `prescriptions`, **Public = OFF**
- Policy chỉ cho người dùng đụng vào thư mục của chính mình:

```sql
create policy "own folder - select" on storage.objects for select
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder - insert" on storage.objects for insert
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own folder - delete" on storage.objects for delete
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);
```
Đường dẫn file luôn bắt đầu bằng `{user_id}/`.

## 3. Auth
- Dùng Email + Password (1 tài khoản của chủ app)
- Tạo tài khoản xong thì **tắt "Allow new users to sign up"** trong Authentication settings
- Frontend: nếu chưa đăng nhập thì chỉ hiện màn Đăng nhập

## 4. Edge Function `scan-prescription`
- Tạo bằng `supabase functions new scan-prescription`
- Lưu key: `supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=...`
- Giữ bật xác thực JWT mặc định (không dùng `--no-verify-jwt`), để người lạ không gọi được và tốn tiền API của mình
- Thêm CORS header cho domain của app
- Chi tiết gọi Gemini: xem skill `prescription-scan`
- Deploy: `supabase functions deploy scan-prescription`

## 5. Kiểm tra sau khi setup
- Đăng nhập tài khoản khác (hoặc chưa đăng nhập) -> không thấy dòng nào, không mở được ảnh
- Mở link ảnh public thử -> phải bị từ chối
- Gọi function mà không có token -> 401
