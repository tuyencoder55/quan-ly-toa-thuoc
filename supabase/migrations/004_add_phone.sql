-- Thêm trường số điện thoại (phone) cho bảng prescriptions
alter table public.prescriptions 
add column if not exists phone text;

-- Index hỗ trợ tìm kiếm nhanh theo số điện thoại
create index if not exists prescriptions_phone_idx 
on public.prescriptions (user_id, phone);
