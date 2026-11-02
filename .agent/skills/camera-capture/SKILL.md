---
name: camera-capture
description: Dùng khi làm chức năng chụp ảnh toa thuốc trên điện thoại (PWA), gồm mở camera, xem trước, chụp lại, lưu ảnh.
---

# Skill: Chụp ảnh toa thuốc trên điện thoại

## Cách đơn giản và ổn định nhất
Dùng thẻ `<input type="file" accept="image/*" capture="environment">`.
- Trên điện thoại, nó mở thẳng **camera sau** của máy
- Dùng camera gốc của máy: tự lấy nét, HDR, có sẵn đèn flash. Chất lượng chữ tốt hơn so với tự code camera bằng `getUserMedia`
- Không cần xin quyền camera phức tạp

```tsx
// Nút chụp toa. Bấm vào là mở camera của điện thoại.
<input
  ref={inputRef}
  type="file"
  accept="image/*"
  capture="environment"   // "environment" = camera sau
  className="hidden"
  onChange={(e) => e.target.files?.[0] && onPicked(e.target.files[0])}
/>
<button onClick={() => inputRef.current?.click()}>Chụp toa</button>
```
Thêm nút phụ "Chọn từ thư viện" dùng input thứ hai **không có** `capture`, để chọn ảnh có sẵn.

## Luồng màn hình
1. Màn chính: nút **Chụp toa** to ở dưới cùng (dễ bấm bằng ngón cái) + ô tìm theo tên KH + danh sách toa mới nhất
2. Chụp xong -> sang màn **Xác nhận**: ảnh xem trước ở trên, form 3 ô ở dưới (xem skill `prescription-scan`)
3. Nút: **Lưu** | **Chụp lại** | **Hủy**
4. Lưu xong -> về màn chính, toa mới nằm đầu danh sách

## Lưu ảnh
- Đặt tên file: `{user_id}/{uuid}.jpg` trong bucket `prescriptions` (private)
- Upload bằng `supabase.storage.from("prescriptions").upload(path, blob, { contentType: "image/jpeg" })`
- Lưu **đường dẫn** (`image_path`) vào bảng, không lưu URL
- Xem lại ảnh: `createSignedUrl(path, 60)`; bấm vào ảnh để phóng to (pinch-zoom), vì cần đọc lại chữ nhỏ

## Chụp lại / thay ảnh
- Ở màn Xác nhận: Chụp lại = bỏ ảnh cũ trong bộ nhớ, mở camera lại, chạy quét lại
- Ở màn Chi tiết toa đã lưu: nút "Thay ảnh" -> upload ảnh mới, **xóa ảnh cũ** trong Storage

## PWA (để mở như app thật)
- Dùng `vite-plugin-pwa`, `display: "standalone"`, `orientation: "portrait"`, icon 192 và 512
- Hướng dẫn người dùng: mở web bằng Safari/Chrome -> "Thêm vào Màn hình chính"
- Camera qua `capture` cần chạy trên **HTTPS** (Vercel/Netlify/Cloudflare Pages đều có sẵn)

## Mẹo cho ảnh toa
- Hiện gợi ý nhỏ trên màn chụp: "Đặt toa phẳng, đủ sáng, không che chữ"
- Nếu ảnh quá nhỏ (cạnh dài < 800px) thì báo chụp lại
