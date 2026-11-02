import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { compressImage } from '../lib/compressImage';
import { normalizeName } from '../lib/normalizeName';
import { MedicineItem, ScanResult } from '../types';
import { MedicineListEditor } from '../components/MedicineListEditor';
import { ImageViewerModal } from '../components/ImageViewerModal';
import {
  Check,
  RotateCcw,
  X,
  Sparkles,
  AlertCircle,
  Maximize2,
  Calendar,
  MapPin,
  User as UserIcon,
  FileText
} from 'lucide-react';

interface ConfirmProps {
  originalFile: File;
  onSaveSuccess: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

export const Confirm: React.FC<ConfirmProps> = ({
  originalFile,
  onSaveSuccess,
  onRetake,
  onCancel,
}) => {
  const { user } = useAuth();

  // URL xem trước ảnh
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);

  // Dữ liệu form
  const [customerName, setCustomerName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [medicines, setMedicines] = useState<MedicineItem[]>([]);
  const [note, setNote] = useState('');

  // Trạng thái AI
  const [isScanning, setIsScanning] = useState(true);
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('scanning');
  const [scanDuration, setScanDuration] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Xem ảnh phóng to
  const [showImageModal, setShowImageModal] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // 1. Tạo ảnh xem trước và nén ảnh ngay lập tức
  useEffect(() => {
    let objectUrl = '';
    const init = async () => {
      try {
        objectUrl = URL.createObjectURL(originalFile);
        setPreviewUrl(objectUrl);

        const compressStart = performance.now();
        const blob = await compressImage(originalFile, 1280, 0.7);
        setCompressedBlob(blob);
        const compressEnd = performance.now();
        console.log(`[Performance] Nén ảnh hoàn tất trong: ${Math.round(compressEnd - compressStart)} ms`);

        // Bắt đầu gọi AI đọc toa
        scanWithAI(blob);
      } catch (err: any) {
        console.error('Lỗi khi nén ảnh:', err);
        setErrorMessage('Không thể xử lý ảnh chụp.');
        setIsScanning(false);
        setScanStatus('failed');
      }
    };

    init();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [originalFile]);

  // 2. Chuyển Blob thành base64 để gửi sang Edge Function
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 3. Gọi AI qua Supabase Edge Function scan-prescription
  const scanWithAI = async (blob: Blob) => {
    setIsScanning(true);
    setScanStatus('scanning');
    const startTime = performance.now();

    try {
      const base64Data = await blobToBase64(blob);

      // Gọi Edge Function
      const { data, error } = await supabase.functions.invoke<ScanResult>('scan-prescription', {
        body: { imageBase64: base64Data, mimeType: 'image/jpeg' },
      });

      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setScanDuration(elapsed);
      console.log(`[Performance] Quét AI hoàn tất trong: ${elapsed} ms`);

      if (error || !data) {
        console.warn('Edge Function trả về lỗi:', error);
        setScanStatus('failed');
        setErrorMessage('AI chưa đọc được toa, bạn vui lòng nhập tay nhé.');
      } else {
        setScanStatus('success');
        if (data.customer_name) setCustomerName(data.customer_name);
        if (data.birth_date) setBirthDate(data.birth_date);
        if (data.address) setAddress(data.address);
        if (Array.isArray(data.medicines)) setMedicines(data.medicines);

        // Tự động focus vào ô Tên KH
        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 150);
      }
    } catch (err: any) {
      console.error('Lỗi khi gọi AI quét toa:', err);
      setScanStatus('failed');
      setErrorMessage('Không thể kết nối đến AI, hãy nhập thông tin thủ công.');
    } finally {
      setIsScanning(false);
    }
  };

  // 4. Lưu toa thuốc vào Supabase
  const handleSave = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Vui lòng điền Họ tên khách hàng.');
      nameInputRef.current?.focus();
      return;
    }

    if (!user) {
      setErrorMessage('Bạn chưa đăng nhập.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let imagePath: string | null = null;

      // Upload ảnh nén vào Storage bucket 'prescriptions' (Private)
      if (compressedBlob) {
        const fileExt = 'jpg';
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const path = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(path, compressedBlob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Lỗi tải ảnh lên: ${uploadError.message}`);
        }
        imagePath = path;
      }

      // Lưu thông tin vào bảng prescriptions
      const { error: insertError } = await supabase.from('prescriptions').insert({
        user_id: user.id,
        customer_name: customerName.trim(),
        name_search: normalizeName(customerName),
        birth_date: birthDate ? birthDate : null,
        address: address.trim() || null,
        medicines: medicines.filter((m) => m.name.trim().length > 0),
        image_path: imagePath,
        note: note.trim() || null,
      });

      if (insertError) {
        throw new Error(`Lỗi lưu dữ liệu: ${insertError.message}`);
      }

      onSaveSuccess();
    } catch (err: any) {
      console.error('Lỗi khi lưu toa:', err);
      setErrorMessage(err.message || 'Không thể lưu toa thuốc.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Header cố định */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 rounded-full active-press"
          title="Hủy bỏ"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-base text-slate-800">Xác nhận thông tin toa</h1>
        <button
          type="button"
          onClick={onRetake}
          className="text-xs font-semibold text-blue-600 flex items-center gap-1 active-press"
        >
          <RotateCcw className="w-4 h-4" />
          Chụp lại
        </button>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Vùng xem trước ảnh có nút phóng to */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200 aspect-video flex items-center justify-center">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Ảnh toa thuốc"
              className="w-full h-full object-cover"
            />
          )}

          <button
            type="button"
            onClick={() => setShowImageModal(true)}
            className="absolute bottom-2.5 right-2.5 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md flex items-center gap-1.5 text-xs font-medium active-press"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Phóng to
          </button>

          {/* Huy hiệu trạng thái AI */}
          <div className="absolute top-2.5 left-2.5">
            {isScanning ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600/90 text-white rounded-full text-xs font-medium shadow-md backdrop-blur-md animate-pulse">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>AI đang đọc toa...</span>
              </div>
            ) : scanStatus === 'success' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/90 text-white rounded-full text-xs font-medium shadow-md backdrop-blur-md">
                <Check className="w-3.5 h-3.5" />
                <span>AI đọc xong {scanDuration ? `(${scanDuration}ms)` : ''}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 text-white rounded-full text-xs font-medium shadow-md backdrop-blur-md">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Nhập tay thông tin</span>
              </div>
            )}
          </div>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form điền thông tin */}
        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-4">
          {/* Họ tên KH (Trường quan trọng nhất) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              Tên khách hàng <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Văn A"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-base font-semibold px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 transition-all text-slate-900"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Ưu tiên kiểm tra kỹ tên để tra cứu chính xác sau này
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Ngày sinh */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Ngày sinh
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
            </div>

            {/* Địa chỉ */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                Địa chỉ
              </label>
              <input
                type="text"
                placeholder="Xã/Huyện/Tỉnh..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm font-medium px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Danh sách thuốc */}
          <MedicineListEditor
            medicines={medicines}
            onChange={setMedicines}
          />

          <hr className="border-slate-100" />

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú về liều dùng, tái khám..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Thanh nút bấm cố định dưới cùng */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 max-w-lg mx-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 active-press disabled:opacity-50"
        >
          Hủy
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex-2 py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 active-press disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          <span>{isSaving ? 'Đang lưu toa...' : 'Lưu toa thuốc'}</span>
        </button>
      </div>

      {/* Modal phóng to ảnh */}
      <ImageViewerModal
        imageUrl={showImageModal ? previewUrl : null}
        onClose={() => setShowImageModal(false)}
      />
    </div>
  );
};
