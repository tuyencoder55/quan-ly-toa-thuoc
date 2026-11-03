-- ====================================================================
-- MIGRATION: HỖ TRỢ ĐA NGƯỜI DÙNG & TỰ ĐỘNG KÍCH HOẠT TÀI KHOẢN KHI ĐĂNG KÝ
-- ====================================================================

-- 1. Trigger tự động xác nhận email khi đồng nghiệp đăng ký mới
-- Giúp đồng nghiệp đăng ký xong là vào dùng được ngay, không cần đợi mail xác nhận
create or replace function public.auto_confirm_user()
returns trigger as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  before insert on auth.users
  for each row execute function public.auto_confirm_user();

-- 2. Cập nhật hàm get_storage_stats() tính toán dung lượng riêng cho từng người dùng
create or replace function public.get_storage_stats()
returns json
language plpgsql
security definer
as $$
declare
  current_user_id uuid := auth.uid();
  user_images bigint := 0;
  storage_bytes bigint := 0;
  user_prescriptions bigint := 0;
  db_bytes bigint := 0;
begin
  -- Nếu chưa đăng nhập thì trả về 0
  if current_user_id is null then
    return json_build_object(
      'total_prescriptions', 0,
      'total_images', 0,
      'storage_bytes', 0,
      'storage_mb', 0,
      'storage_limit_mb', 1024,
      'db_bytes', 0,
      'db_mb', 0,
      'db_limit_mb', 500
    );
  end if;

  -- 1. Tính tổng số ảnh và dung lượng trong thư mục riêng của người dùng {user_id}/...
  select count(*), coalesce(sum((metadata->>'size')::bigint), 0)
  into user_images, storage_bytes
  from storage.objects
  where bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = current_user_id::text;

  -- 2. Tính số lượng toa thuốc của riêng người dùng
  select count(*)
  into user_prescriptions
  from public.prescriptions
  where user_id = current_user_id;

  -- Ước lượng dung lượng DB tương ứng (khoảng 2KB mỗi bản ghi chữ)
  db_bytes := user_prescriptions * 2048;

  return json_build_object(
    'total_prescriptions', user_prescriptions,
    'total_images', user_images,
    'storage_bytes', storage_bytes,
    'storage_mb', round((storage_bytes / 1024.0 / 1024.0)::numeric, 2),
    'storage_limit_mb', 1024,
    'db_bytes', db_bytes,
    'db_mb', round((db_bytes / 1024.0 / 1024.0)::numeric, 2),
    'db_limit_mb', 500
  );
end;
$$;
