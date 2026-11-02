---
description: Làm màn chi tiết toa, tìm kiếm, sửa, thay ảnh, xóa
---

# /build-detail-search

1. Màn **Detail**: hiện ảnh toa (signed URL 60 giây, bấm để phóng to), 3 trường thông tin, ghi chú, ngày lưu.
2. Cho **sửa** 3 trường + ghi chú; khi sửa tên thì cập nhật lại `name_search`.
3. Nút **Thay ảnh**: upload ảnh mới (nén như lúc chụp), xóa ảnh cũ trong Storage.
4. Nút **Xóa toa**: hỏi xác nhận, xóa ảnh trong Storage trước rồi xóa dòng.
5. Tìm kiếm ở Home: gõ là lọc (debounce 250ms), tìm theo `name_search`, không phân biệt dấu.
6. Phân trang đơn giản: tải 20 toa đầu, nút "Xem thêm".
7. Kiểm tra bằng tay các trường hợp: toa không có ngày sinh, tên có dấu, tìm "quy" ra "QUÝ".
