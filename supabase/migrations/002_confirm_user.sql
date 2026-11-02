-- Xác nhận kích hoạt tài khoản gia đình để tự động đăng nhập ngầm không cần mật khẩu
update auth.users 
set email_confirmed_at = now() 
where email = 'toathuoc.giadinh@gmail.com';
