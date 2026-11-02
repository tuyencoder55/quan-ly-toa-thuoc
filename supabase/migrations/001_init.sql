-- ====================================================================
-- MIGRATION: KHỞI TẠO BẢNG VÀ STORAGE CHO DỰ ÁN TOA THUỐC
-- ====================================================================

-- 1. Bảng lưu trữ toa thuốc
create table if not exists public.prescriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  customer_name text not null,                      -- Tên khách hàng (trường quan trọng nhất)
  name_search   text not null default '',           -- Tên bỏ dấu + viết thường để tìm kiếm tức thì
  birth_date    date,                               -- Ngày sinh khách hàng
  address       text,                               -- Địa chỉ liên hệ
  medicines     jsonb not null default '[]'::jsonb, -- Danh sách thuốc: [{ "name": "...", "dosage": "...", "usage": "..." }]
  image_path    text,                               -- Đường dẫn file ảnh trong Supabase Storage
  note          text,                               -- Ghi chú bổ sung
  created_at    timestamptz not null default now()
);

-- Index tối ưu tốc độ tra cứu
create index if not exists prescriptions_user_created_idx 
  on public.prescriptions (user_id, created_at desc);

create index if not exists prescriptions_name_search_idx  
  on public.prescriptions (user_id, name_search text_pattern_ops);

-- 2. Thiết lập RLS (Row Level Security) - Bảo mật dữ liệu người dùng
alter table public.prescriptions enable row level security;

-- Xóa policy cũ nếu có để tránh lỗi khi chạy lại
drop policy if exists "own rows - select" on public.prescriptions;
drop policy if exists "own rows - insert" on public.prescriptions;
drop policy if exists "own rows - update" on public.prescriptions;
drop policy if exists "own rows - delete" on public.prescriptions;

create policy "own rows - select" on public.prescriptions 
  for select using (auth.uid() = user_id);

create policy "own rows - insert" on public.prescriptions 
  for insert with check (auth.uid() = user_id);

create policy "own rows - update" on public.prescriptions 
  for update using (auth.uid() = user_id);

create policy "own rows - delete" on public.prescriptions 
  for delete using (auth.uid() = user_id);

-- 3. Tạo Storage Bucket riêng tư (Private) 'prescriptions'
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

-- Storage Policies: chỉ người dùng mới có quyền truy cập folder ảnh của mình ({user_id}/...)
drop policy if exists "own folder - select" on storage.objects;
drop policy if exists "own folder - insert" on storage.objects;
drop policy if exists "own folder - update" on storage.objects;
drop policy if exists "own folder - delete" on storage.objects;

create policy "own folder - select" on storage.objects for select
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own folder - insert" on storage.objects for insert
  with check (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own folder - update" on storage.objects for update
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own folder - delete" on storage.objects for delete
  using (bucket_id = 'prescriptions' and (storage.foldername(name))[1] = auth.uid()::text);
