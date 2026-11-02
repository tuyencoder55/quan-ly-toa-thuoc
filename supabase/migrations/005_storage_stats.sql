-- Hàm thống kê dung lượng bộ nhớ đã sử dụng trên Supabase
create or replace function public.get_storage_stats()
returns json
language plpgsql
security definer
as $$
declare
  total_images bigint := 0;
  storage_bytes bigint := 0;
  total_prescriptions bigint := 0;
  db_bytes bigint := 0;
begin
  -- 1. Tính tổng số ảnh và dung lượng bucket 'prescriptions' trong Storage
  select count(*), coalesce(sum((metadata->>'size')::bigint), 0)
  into total_images, storage_bytes
  from storage.objects
  where bucket_id = 'prescriptions';

  -- 2. Tính số lượng toa và dung lượng bảng prescriptions trong Database
  select count(*), pg_total_relation_size('public.prescriptions')
  into total_prescriptions, db_bytes
  from public.prescriptions;

  return json_build_object(
    'total_prescriptions', total_prescriptions,
    'total_images', total_images,
    'storage_bytes', storage_bytes,
    'storage_mb', round((storage_bytes / 1024.0 / 1024.0)::numeric, 2),
    'storage_limit_mb', 1024, -- Hạn mức 1GB (1024MB) miễn phí của Supabase Storage
    'db_bytes', db_bytes,
    'db_mb', round((db_bytes / 1024.0 / 1024.0)::numeric, 2),
    'db_limit_mb', 500 -- Hạn mức 500MB miễn phí của Supabase Postgres
  );
end;
$$;

-- Cấp quyền gọi hàm cho người dùng đã đăng nhập và anon
grant execute on function public.get_storage_stats() to authenticated, anon;
