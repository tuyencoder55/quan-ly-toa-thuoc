# Toa Thuốc — bộ cấu hình cho Antigravity

## Cách dùng
1. Giải nén, mở thư mục `toa-thuoc` trong Antigravity (thư mục `.agent` phải nằm ở gốc project).
2. Trong khung chat của agent, gõ lần lượt:
   - `/setup-project`
   - `/build-scan-flow`
   - `/build-detail-search`
   - `/deploy`
3. Rule tự áp dụng. Skill tự được agent dùng khi đúng chủ đề.

## Có gì bên trong
| Loại | File | Việc |
|---|---|---|
| Rule | `project-rules.md` | Stack, phạm vi dữ liệu (chỉ 3 trường), quy ước code |
| Rule | `privacy-security.md` | RLS, bucket private, không lộ key |
| Skill | `prescription-scan` | Quét toa bằng Gemini Flash, tối ưu tốc độ |
| Skill | `camera-capture` | Chụp ảnh bằng điện thoại, PWA |
| Skill | `supabase-setup` | Bảng, Storage, Auth, Edge Function |
| Workflow | `/setup-project` `/build-scan-flow` `/build-detail-search` `/deploy` | Các bước làm theo thứ tự |

Nếu bản Antigravity của anh dùng tên thư mục khác (ví dụ `.agents/`), chỉ cần đổi tên thư mục `.agent` cho khớp.
