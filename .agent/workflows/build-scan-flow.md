---
description: Làm luồng chụp -> AI đọc toa -> xác nhận -> lưu
---

# /build-scan-flow

Điều kiện: đã xong `/setup-project`. Đọc skill `camera-capture` và `prescription-scan`.

1. Viết `src/lib/compressImage.ts` và `src/lib/normalizeName.ts` (bỏ dấu, viết thường, `đ` -> `d`).
2. Viết Edge Function `scan-prescription` theo skill `prescription-scan` (tắt thinking, JSON schema, maxOutputTokens thấp, kiểm tra JWT). Hướng dẫn người dùng đặt secret và deploy.
3. Viết màn **Home**: nút Chụp toa lớn, ô tìm kiếm, danh sách toa (tên KH, ngày sinh, ngày lưu).
4. Viết màn **Confirm**: ảnh xem trước hiện ngay, gọi AI ở nền, điền 3 ô khi có kết quả, focus ô Tên KH, có nút Lưu / Chụp lại / Hủy.
5. Khi bấm Lưu: upload ảnh vào Storage, insert dòng vào `prescriptions` (kèm `name_search`).
6. Thêm đo thời gian (chỉ log số ms, không log dữ liệu KH).
7. Nhờ người dùng thử với 3 toa thật. Hỏi: tên có đúng không, mất bao lâu. Nếu chậm hơn 3 giây, làm theo mục "Cách kiểm tra tốc độ" trong skill.
