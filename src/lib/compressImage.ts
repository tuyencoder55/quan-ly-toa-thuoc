/**
 * Nén và thu nhỏ ảnh trực tiếp trên trình duyệt bằng Canvas
 * Tác dụng: Giảm dung lượng ảnh chụp điện thoại từ 5-8MB xuống còn ~200KB
 * Giúp tải lên Supabase và gửi sang AI nhanh hơn gấp 10 lần.
 */
export async function compressImage(
  file: File | Blob,
  maxSide = 1280,
  quality = 0.7
): Promise<Blob> {
  // Tạo bitmap từ file ảnh, giữ nguyên chiều xoay gốc của máy ảnh
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  // Tính tỷ lệ thu nhỏ sao cho cạnh dài nhất không vượt quá maxSide
  const currentMax = Math.max(bitmap.width, bitmap.height);
  const scale = currentMax > maxSide ? maxSide / currentMax : 1;

  const targetWidth = Math.round(bitmap.width * scale);
  const targetHeight = Math.round(bitmap.height * scale);

  // Vẽ lên canvas để xuất ra định dạng JPEG nén
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Trình duyệt không hỗ trợ Canvas 2D context');
  }

  // Vẽ hình ảnh với chất lượng làm mượt cao
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  // Xuất ra Blob định dạng JPEG
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Nén ảnh thất bại'));
        }
      },
      'image/jpeg',
      quality
    );
  });
}
