-- Cập nhật hàm admin_get_users ép kiểu bigint cho storage_bytes
create or replace function public.admin_get_users()
returns table (
  id uuid,
  username text,
  full_name text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  prescription_count bigint,
  storage_bytes bigint,
  storage_mb numeric
)
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền xem danh sách tài khoản.';
  end if;

  return query
  select 
    u.id,
    coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as username,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)) as full_name,
    coalesce(u.raw_user_meta_data->>'role', 'user') as role,
    u.created_at,
    u.last_sign_in_at,
    coalesce(p_stat.p_count, 0)::bigint as prescription_count,
    coalesce(s_stat.s_bytes, 0)::bigint as storage_bytes,
    round((coalesce(s_stat.s_bytes, 0) / 1024.0 / 1024.0)::numeric, 2) as storage_mb
  from auth.users u
  left join (
    select user_id, count(*)::bigint as p_count
    from public.prescriptions
    group by user_id
  ) p_stat on p_stat.user_id = u.id
  left join (
    select (storage.foldername(name))[1]::uuid as user_id, coalesce(sum((metadata->>'size')::bigint), 0)::bigint as s_bytes
    from storage.objects
    where bucket_id = 'prescriptions'
    group by (storage.foldername(name))[1]
  ) s_stat on s_stat.user_id = u.id
  order by u.created_at desc;
end;
$$;
