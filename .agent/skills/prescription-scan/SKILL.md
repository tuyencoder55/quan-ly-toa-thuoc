---
name: prescription-scan
description: Dùng khi xây hoặc sửa chức năng quét toa thuốc bằng AI (Gemini Flash) để lấy tên KH, ngày sinh, địa chỉ. Tối ưu tốc độ, trả JSON ổn định.
---

# Skill: Quét toa thuốc bằng AI (tối ưu tốc độ)

Mục tiêu: từ lúc chụp xong đến lúc form được điền tự động **dưới ~3 giây**.
Thời gian chờ chủ yếu nằm ở: (1) upload ảnh to, (2) AI "suy nghĩ", (3) AI viết câu trả lời dài. Skill này cắt cả 3.

## 1. Nén ảnh ở trình duyệt TRƯỚC khi gửi (tiết kiệm nhiều nhất)
Ảnh điện thoại 4-8 MB, AI không cần nhiều thế để đọc chữ in.
- Resize cạnh dài còn **1280px** (nếu chữ nhỏ bị mờ thì tăng lên 1600px)
- Xuất JPEG, quality **0.7** -> thường còn 150-300 KB
- Dùng `createImageBitmap` + `canvas.toBlob` (không cần thư viện)
- Gửi 1 ảnh đã nén cho **cả hai việc**: gửi AI và lưu Storage (ảnh lưu có thể là bản 1600px riêng nếu muốn đẹp hơn, nhưng mặc định dùng chung cho đơn giản)

```ts
// src/lib/compressImage.ts
// Thu nhỏ ảnh để gửi lên nhanh. Giống như "Export for Web" trong Photoshop.
export async function compressImage(file: File, maxSide = 1280, quality = 0.7): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }); // giữ đúng chiều xoay
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", quality));
}
```

## 2. Gọi AI qua Edge Function, gửi ảnh dạng base64
File: `supabase/functions/scan-prescription/index.ts`
- Nhận ảnh nén, kiểm tra người dùng đã đăng nhập (có JWT hợp lệ)
- Gọi Gemini Flash với các thiết lập tăng tốc bên dưới
- Trả về đúng 3 trường, không gì thêm

### Thiết lập tăng tốc cho Gemini
| Thiết lập | Giá trị | Tác dụng |
|---|---|---|
| Model | biến `GEMINI_MODEL` (dòng Flash mới nhất, **kiểm tra tên model hiện hành trên tài liệu Google AI trước khi dùng**) | Flash nhanh và rẻ, đủ cho việc đọc chữ in |
| Thinking | tắt hoặc budget = 0 (nếu model hỗ trợ) | Việc đọc chữ không cần "suy nghĩ", tắt đi nhanh hơn rõ rệt |
| `responseMimeType` | `application/json` | Ép trả JSON, khỏi phải xử lý chữ thừa |
| `responseSchema` | 3 trường, xem dưới | Output ngắn, đúng cấu trúc |
| `temperature` | 0 | Kết quả ổn định, không "sáng tạo" |
| `maxOutputTokens` | 200 | Chặn trả lời dài dòng |
| `mediaResolution` | thấp/medium nếu có | Ảnh ít token hơn -> nhanh hơn |

### Schema trả về
```json
{
  "customer_name": "string | null",
  "birth_date": "YYYY-MM-DD | null",
  "address": "string | null"
}
```

### Prompt (ngắn gọn càng tốt, prompt dài = chậm)
```
Đây là ảnh đơn thuốc tiếng Việt. Chỉ trích xuất 3 trường:
- customer_name: dòng "Họ tên" (giữ nguyên dấu tiếng Việt, viết hoa như trên toa)
- birth_date: dòng "Ngày sinh", đổi từ dd/mm/yyyy sang YYYY-MM-DD
- address: dòng "Địa chỉ liên hệ"
Không đọc thông tin của bệnh viện hay bác sĩ. Nếu không thấy trường nào, trả null. Không thêm trường khác.
```
Lưu ý: toa có thể có **2 tờ chồng nhau** hoặc bị tay/vật che. Chỉ lấy tờ đang rõ nhất, nằm giữa ảnh.

## 3. Giao diện: làm cho người dùng thấy nhanh (cảm giác cũng quan trọng)
- Chụp xong: **hiện ảnh xem trước ngay lập tức**, chạy AI ở nền, đừng chặn màn hình
- Form có sẵn 3 ô; khi AI trả về thì điền vào, ô nào vừa được điền thì nháy nhẹ
- Ô **Tên KH tự focus** và cho sửa ngay. Người dùng có thể sửa trong lúc chờ
- Nếu AI lỗi hoặc quá 10 giây: báo "Không đọc được, nhập tay nhé", vẫn cho lưu ảnh
- Nút "Chụp lại" luôn hiện

## 4. Kiểm tra sau khi AI trả về (rẻ, không cần gọi AI lần 2)
- `birth_date`: phải là ngày hợp lệ, không ở tương lai, nếu không thì để trống
- `customer_name`: cắt khoảng trắng thừa; tạo thêm `name_search` = bỏ dấu + viết thường (để tìm "quy" ra "Quý")
- Luôn để người dùng xác nhận trước khi bấm Lưu, vì tên sai là lỗi nặng nhất

## 5. Cách kiểm tra tốc độ
Đo 3 mốc bằng `performance.now()`: nén ảnh, gọi function, tổng. In ra console (chỉ số thời gian, **không in dữ liệu KH**). Mục tiêu: nén < 300ms, function < 2s.
Nếu chậm: giảm `maxSide` xuống 1024, kiểm tra đã tắt thinking chưa, kiểm tra Edge Function đặt region gần Việt Nam (Singapore).
