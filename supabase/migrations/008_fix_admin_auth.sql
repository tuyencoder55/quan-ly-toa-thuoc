-- ====================================================================
-- MIGRATION: KHẮC PHỤC LỖI DATABASE ERROR QUERYING SCHEMA & IDENTITY
-- ====================================================================

-- 1. Xóa tài khoản admin cũ bị thiếu trường token
delete from auth.identities where user_id in (select id from auth.users where email = 'admin@toathuoc.local');
delete from auth.users where email = 'admin@toathuoc.local';

-- 2. Cập nhật sửa lỗi NULL token cho toàn bộ user trong auth.users (ngăn lỗi GoTrue scan NULL to string)
update auth.users
set 
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, '')
where 
  confirmation_token is null 
  or recovery_token is null 
  or email_change_token_new is null 
  or email_change is null
  or email_change_token_current is null
  or phone_change is null
  or phone_change_token is null
  or reauthentication_token is null;

-- 3. Tạo lại tài khoản Admin chuẩn Supabase GoTrue kèm auth.identities
do $$
declare
  admin_id uuid := gen_random_uuid();
  admin_pw text := extensions.crypt('123456aA@', extensions.gen_salt('bf'));
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user
  ) values (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'admin@toathuoc.local',
    admin_pw,
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('username', 'admin', 'full_name', 'Quản Trị Viên', 'role', 'admin'),
    now(),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    admin_id,
    admin_id,
    jsonb_build_object('sub', admin_id::text, 'email', 'admin@toathuoc.local'),
    'email',
    admin_id::text,
    now(),
    now(),
    now()
  );
end;
$$;

-- 4. Cập nhật hàm admin_create_user để luôn tạo đủ auth.identities và không có NULL token
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
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    is_sso_user
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
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_id,
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', clean_email),
    'email',
    new_id::text,
    now(),
    now(),
    now()
  );

  return json_build_object(
    'id', new_id,
    'username', clean_user,
    'full_name', trim(p_full_name)
  );
end;
$$;

-- 5. Cập nhật hàm admin_delete_user xóa sạch cả auth.identities và prescriptions
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

  -- Xóa ảnh trong Storage của user
  delete from storage.objects
  where bucket_id = 'prescriptions'
    and (storage.foldername(name))[1] = p_user_id::text;

  -- Xóa identities
  delete from auth.identities where user_id = p_user_id;

  -- Xóa prescriptions của user
  delete from public.prescriptions where user_id = p_user_id;

  -- Xóa user trong auth.users
  delete from auth.users where id = p_user_id;
end;
$$;
