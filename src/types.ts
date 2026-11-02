// Định nghĩa dữ liệu cho từng loại thuốc trong toa
export interface MedicineItem {
  name: string;        // Tên thuốc (ví dụ: Paracetamol, Amoxicillin)
  dosage?: string;     // Hàm lượng / Số lượng (ví dụ: 500mg, 10 viên, 2 vỉ)
  usage?: string;      // Hướng dẫn sử dụng (ví dụ: Ngày uống 2 lần, mỗi lần 1 viên sau ăn)
}

// Cấu trúc một bản ghi Toa Thuốc trong cơ sở dữ liệu
export interface Prescription {
  id: string;
  user_id: string;
  customer_name: string;        // Tên khách hàng (trường quan trọng nhất)
  name_search: string;          // Tên đã bỏ dấu tiếng Việt để tìm kiếm
  birth_date: string | null;    // Ngày sinh YYYY-MM-DD
  phone: string | null;         // Số điện thoại liên hệ
  address: string | null;       // Địa chỉ
  medicines: MedicineItem[];    // Danh sách thuốc trong đơn
  image_path: string | null;    // Đường dẫn ảnh đại diện chính trong Storage
  image_paths: string[];        // Danh sách tất cả các ảnh của toa (tối đa 20 ảnh)
  note: string | null;          // Ghi chú thêm
  created_at: string;           // Thời điểm tạo
}

// Kết quả trả về từ AI Gemini khi quét ảnh toa thuốc
export interface ScanResult {
  customer_name: string | null;
  birth_date: string | null;
  phone: string | null;
  address: string | null;
  medicines: MedicineItem[];
}

