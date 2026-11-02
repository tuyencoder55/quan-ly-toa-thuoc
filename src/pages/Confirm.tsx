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
  FileText,
  Camera,
  Image as ImageIcon
} from 'lucide-react';

interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  blob?: Blob;
}

interface ConfirmProps {
  originalFile: File;
  onSaveSuccess: () => void;
  onRetake: () => void;
  onCancel: () => void;
}

const MAX_PHOTOS = 20;

export const Confirm: React.FC<ConfirmProps> = ({
  originalFile,
  onSaveSuccess,
  onRetake,
  onCancel,
}) => {
  const { user } = useAuth();

  // Danh sách ảnh toa thuốc (tối đa 20 ảnh)
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

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
  const addCameraInputRef = useRef<HTMLInputElement>(null);
  const addGalleryInputRef = useRef<HTMLInputElement>(null);

  // 1. Khởi tạo ảnh đầu tiên và gọi AI quét toa
  useEffect(() => {
    let initialUrl = '';
    const init = async () => {
      try {
        initialUrl = URL.createObjectURL(originalFile);
        const firstBlob = await compressImage(originalFile, 1280, 0.7);

        setPhotos([
          {
            id: crypto.randomUUID(),
            file: originalFile,
            previewUrl: initialUrl,
            blob: firstBlob,
          },
        ]);
        setActivePhotoIndex(0);

        // Bắt đầu gọi AI đọc toa từ ảnh đầu tiên
        scanWithAI(firstBlob);
      } catch (err: any) {
        console.error('Lỗi khi nén ảnh:', err);
        setErrorMessage('Không thể xử lý ảnh chụp.');
        setIsScanning(false);
        setScanStatus('failed');
      }
    };

    init();

    return () => {
      if (initialUrl) URL.revokeObjectURL(initialUrl);
    };
  }, [originalFile]);

  // Chuyển Blob thành base64 để gửi sang Edge Function
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // 2. Gọi AI qua Supabase Edge Function scan-prescription
  const scanWithAI = async (blob: Blob) => {
    setIsScanning(true);
    setScanStatus('scanning');
    const startTime = performance.now();

    try {
      const base64Data = await blobToBase64(blob);

      const { data, error } = await supabase.functions.invoke<ScanResult>('scan-prescription', {
        body: { imageBase64: base64Data, mimeType: 'image/jpeg' },
      });

      const endTime = performance.now();
      const elapsed = Math.round(endTime - startTime);
      setScanDuration(elapsed);

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

  // 3. Thêm ảnh mới vào danh sách (tối đa 20 ảnh)
  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (photos.length + files.length > MAX_PHOTOS) {
      alert(`Bạn chỉ có thể lưu tối đa ${MAX_PHOTOS} ảnh cho mỗi toa thuốc.`);
      return;
    }

    const newItems: PhotoItem[] = [];
    for (const file of files) {
      const previewUrl = URL.createObjectURL(file);
      try {
        const blob = await compressImage(file, 1280, 0.7);
        newItems.push({
          id: crypto.randomUUID(),
          file,
          previewUrl,
          blob,
        });
      } catch (err) {
        console.error('Lỗi nén ảnh bổ sung:', err);
      }
    }

    setPhotos((prev) => {
      const updated = [...prev, ...newItems];
      return updated;
    });
    // Chuyển view sang ảnh vừa thêm
    setActivePhotoIndex(photos.length);
    e.target.value = '';
  };

  // 4. Xóa bớt một ảnh
  const handleRemovePhoto = (indexToRemove: number) => {
    if (photos.length <= 1) {
      alert('Toa thuốc cần có ít nhất 1 ảnh.');
      return;
    }
    const target = photos[indexToRemove];
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);

    setPhotos((prev) => prev.filter((_, i) => i !== indexToRemove));
    if (activePhotoIndex >= photos.length - 1) {
      setActivePhotoIndex(Math.max(0, photos.length - 2));
    }
  };

  // 5. Lưu toàn bộ các ảnh và thông tin toa vào Supabase
  const handleSave = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Vui lòng điền Họ tên khách hàng.');
      nameInputRef.current?.focus();
      return;
    }

    if (!user) {
      setErrorMessage('Lỗi phiên đăng nhập.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const uploadedPaths: string[] = [];

      // Upload toàn bộ các ảnh đã nén vào Storage bucket 'prescriptions' (Private)
      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        const blobToUpload = item.blob || (await compressImage(item.file, 1280, 0.7));
        const fileExt = 'jpg';
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const path = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('prescriptions')
          .upload(path, blobToUpload, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Lỗi tải ảnh #${i + 1} lên: ${uploadError.message}`);
        }
        uploadedPaths.push(path);
      }

      // Lưu thông tin vào bảng prescriptions (kèm mảng image_paths)
      const { error: insertError } = await supabase.from('prescriptions').insert({
        user_id: user.id,
        customer_name: customerName.trim(),
        name_search: normalizeName(customerName),
        birth_date: birthDate ? birthDate : null,
        address: address.trim() || null,
        medicines: medicines.filter((m) => m.name.trim().length > 0),
        image_path: uploadedPaths[0] || null, // Ảnh đại diện
        image_paths: uploadedPaths,           // Tất cả các ảnh
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

  const currentActivePhoto = photos[activePhotoIndex] || photos[0];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      {/* Input ẩn để chụp thêm ảnh bằng camera */}
      <input
        ref={addCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleAddPhotos}
      />

      {/* Input ẩn để chọn thêm nhiều ảnh từ bộ sưu tập */}
      <input
        ref={addGalleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAddPhotos}
      />

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
        {/* Vùng xem ảnh to ở trên */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md border border-slate-200 aspect-video flex items-center justify-center">
          {currentActivePhoto?.previewUrl && (
            <img
              src={currentActivePhoto.previewUrl}
              alt={`Ảnh toa thuốc #${activePhotoIndex + 1}`}
              className="w-full h-full object-cover"
            />
          )}

          {/* Đếm số trang ảnh */}
          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/60 text-white rounded-full text-xs font-medium backdrop-blur-md">
            Trang {activePhotoIndex + 1} / {photos.length}
          </div>

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

        {/* Thanh danh sách Thumbnail các ảnh kèm nút THÊM ẢNH (Tối đa 20 ảnh) */}
        <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Hình ảnh toa ({photos.length}/{MAX_PHOTOS} ảnh)
            </span>
            <span className="text-[11px] text-slate-400">
              Chụp mặt sau, đơn kèm, hoặc hóa đơn
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 smooth-scroll">
            {photos.map((item, index) => (
              <div
                key={item.id}
                onClick={() => setActivePhotoIndex(index)}
                className={`relative shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                  index === activePhotoIndex
                    ? 'border-blue-600 ring-2 ring-blue-500/30'
                    : 'border-slate-200 opacity-70 hover:opacity-100'
                }`}
              >
                <img
                  src={item.previewUrl}
                  alt={`Thumb ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center font-bold">
                  #{index + 1}
                </span>

                {photos.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(index);
                    }}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-red-600 text-white rounded-full hover:bg-red-700"
                    title="Xóa ảnh này"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Nút thêm ảnh: chụp hoặc chọn từ máy */}
            {photos.length < MAX_PHOTOS && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => addCameraInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-100/60 text-blue-600 flex flex-col items-center justify-center gap-1 active-press"
                  title="Chụp thêm ảnh bằng camera"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-bold">+ Chụp</span>
                </button>

                <button
                  type="button"
                  onClick={() => addGalleryInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-500 flex flex-col items-center justify-center gap-1 active-press"
                  title="Chọn ảnh có sẵn từ máy"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">+ Chọn</span>
                </button>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <span>{isSaving ? `Đang lưu (${photos.length} ảnh)...` : `Lưu toa (${photos.length} ảnh)`}</span>
        </button>
      </div>

      {/* Modal phóng to ảnh */}
      <ImageViewerModal
        imageUrl={showImageModal ? currentActivePhoto?.previewUrl || null : null}
        onClose={() => setShowImageModal(false)}
      />
    </div>
  );
};
