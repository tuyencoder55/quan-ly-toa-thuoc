/**
 * Chuẩn hóa họ tên: bỏ dấu tiếng Việt, chuyển chữ thường, 'đ' -> 'd'
 * Giúp tìm kiếm "quy" vẫn ra "Nguyễn Văn Quý", tìm "dung" vẫn ra "Dũng"
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .normalize('NFD') // Tách tổ hợp ký tự có dấu
    .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu thanh
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Gộp nhiều khoảng trắng thành 1
}
