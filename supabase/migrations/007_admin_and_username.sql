-- ====================================================================
-- MIGRATION: QUẢN LÝ TÀI KHOẢN ADMIN VÀ ĐỒNG NGHIỆP BẰNG USERNAME
-- ====================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Hàm kiểm tra quyền Quản trị viên (Admin)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid()
      and (
        raw_user_meta_data->>'role' = 'admin'
        or email = 'admin@toathuoc.local'
      )
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- 2. Hàm Admin lấy danh sách toàn bộ người dùng và thống kê
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
    coalesce(p_stat.p_count, 0) as prescription_count,
    coalesce(s_stat.s_bytes, 0) as storage_bytes,
    round((coalesce(s_stat.s_bytes, 0) / 1024.0 / 1024.0)::numeric, 2) as storage_mb
  from auth.users u
  left join (
    select user_id, count(*) as p_count
    from public.prescriptions
    group by user_id
  ) p_stat on p_stat.user_id = u.id
  left join (
    select (storage.foldername(name))[1]::uuid as user_id, coalesce(sum((metadata->>'size')::bigint), 0) as s_bytes
    from storage.objects
    where bucket_id = 'prescriptions'
    group by (storage.foldername(name))[1]
  ) s_stat on s_stat.user_id = u.id
  order by u.created_at desc;
end;
$$;

grant execute on function public.admin_get_users() to authenticated;

-- 3. Hàm Admin tạo tài khoản mới cho đồng nghiệp bằng username và mật khẩu
create or replace function public.admin_create_user(
  p_username text,
  p_full_name text,
  p_password text
)
returns json
language plpgsql
security definer
as $$
declare
  clean_user text := lower(trim(p_username));
  clean_email text;
  new_id uuid := gen_random_uuid();
  encrypted_pw text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền tạo tài khoản.';
  end if;

  if clean_user = '' or length(clean_user) < 2 then
    raise exception 'Tên đăng nhập tối thiểu 2 ký tự.';
  end if;

  if length(p_password) < 6 then
    raise exception 'Mật khẩu phải từ 6 ký tự trở lên.';
  end if;

  clean_email := clean_user || '@toathuoc.local';

  -- Kiểm tra trùng tên đăng nhập
  if exists (select 1 from auth.users where email = clean_email or lower(raw_user_meta_data->>'username') = clean_user) then
    raise exception 'Tên đăng nhập "%" đã tồn tại. Vui lòng chọn tên khác.', clean_user;
  end if;

  encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_id,
    'authenticated',
    'authenticated',
    clean_email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', clean_user, 'full_name', trim(p_full_name), 'role', 'user'),
    now(),
    now(),
    encode(extensions.gen_random_bytes(32), 'hex')
  );

  return json_build_object(
    'id', new_id,
    'username', clean_user,
    'full_name', trim(p_full_name)
  );
end;
$$;

grant execute on function public.admin_create_user(text, text, text) to authenticated;

-- 4. Hàm Admin đặt lại mật khẩu cho đồng nghiệp khi quên
create or replace function public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
returns void
language plpgsql
security definer
as $$
declare
  encrypted_pw text;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền đặt lại mật khẩu.';
  end if;

  if length(p_new_password) < 6 then
    raise exception 'Mật khẩu mới phải từ 6 ký tự trở lên.';
  end if;

  encrypted_pw := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  update auth.users
  set encrypted_password = encrypted_pw,
      updated_at = now()
  where id = p_user_id;
end;
$$;

grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;

-- 5. Hàm Admin xóa tài khoản đồng nghiệp
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới có quyền xóa tài khoản.';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Không thể tự xóa tài khoản quản trị viên đang đăng nhập.';
  end if;

  -- Xóa toàn bộ ảnh trong Storage của user đó
  delete from storage.objects
  where bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = p_user_id::text;

  -- Xóa user trong auth.users (cascade xóa luôn các dòng prescriptions)
  delete from auth.users where id = p_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;

-- 6. TỰ ĐỘNG TẠO HOẶC CẬP NHẬT TÀI KHOẢN ADMIN (admin / 123456aA@)
do $$
declare
  admin_id uuid;
  admin_pw text := extensions.crypt('123456aA@', extensions.gen_salt('bf'));
begin
  select id into admin_id from auth.users where email = 'admin@toathuoc.local';

  if admin_id is not null then
    update auth.users
    set encrypted_password = admin_pw,
        raw_user_meta_data = jsonb_build_object('username', 'admin', 'full_name', 'Quản Trị Viên', 'role', 'admin'),
        email_confirmed_at = now(),
        updated_at = now()
    where id = admin_id;
  else
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@toathuoc.local',
      admin_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('username', 'admin', 'full_name', 'Quản Trị Viên', 'role', 'admin'),
      now(),
      now(),
      encode(extensions.gen_random_bytes(32), 'hex')
    );
  end if;
end;
$$;
