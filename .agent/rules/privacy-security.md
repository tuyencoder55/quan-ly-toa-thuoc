# Rule: Bảo mật và quyền riêng tư

> Toa thuốc là dữ liệu sức khỏe của người khác. Dù app chỉ dùng cá nhân, vẫn phải giữ an toàn.

## Bắt buộc
1. **Bật RLS (Row Level Security)** trên mọi bảng. Policy: chỉ `auth.uid() = user_id` mới đọc/ghi được
2. **Bucket ảnh phải PRIVATE.** Không bao giờ dùng public URL. Hiển thị ảnh bằng `createSignedUrl` (link tạm, hết hạn sau 60 giây)
3. Phải đăng nhập (Supabase Auth, email + mật khẩu hoặc magic link) mới thấy bất kỳ dữ liệu nào. Tắt đăng ký tài khoản mới sau khi tạo xong tài khoản của mình
4. API key của Gemini **không bao giờ** xuất hiện trong code frontend, trong git, hay trong log
5. Không `console.log` tên KH, địa chỉ, ngày sinh hay nội dung ảnh
6. Không gửi dữ liệu toa sang bất kỳ dịch vụ nào ngoài Supabase và Gemini

## Nên làm
- Trong Edge Function: không lưu ảnh ở nơi nào khác ngoài Supabase Storage, không ghi log nội dung trả về từ AI
- Thêm nút "Xóa toa" xóa luôn cả ảnh trong Storage, không để file mồ côi
- `.gitignore` phải có `.env`, `.env.local`, `supabase/.env`

## Khi agent không chắc
Chọn phương án an toàn hơn và nói cho người dùng biết.
