import React, { useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface ScanButtonProps {
  onPhotoSelected: (file: File) => void;
  disabled?: boolean;
}

/**
 * Nút chụp toa thuốc và chọn ảnh từ thư viện
 * Kích thước vừa vặn (Medium), thiết kế hiện đại, dễ thao tác
 */
export const ScanButton: React.FC<ScanButtonProps> = ({ onPhotoSelected, disabled }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelected(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-3 pb-4 bg-gradient-to-t from-white via-white/95 to-transparent backdrop-blur-sm z-30 max-w-lg mx-auto">
      {/* Input ẩn để kích hoạt camera sau */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {/* Input ẩn để chọn ảnh có sẵn từ máy */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />

      <div className="flex items-center gap-2.5">
        {/* Nút chụp toa thuốc chính - Kích thước Medium thanh lịch */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-5 rounded-xl shadow-md shadow-blue-500/25 active-press disabled:opacity-50 text-sm"
        >
          <Camera className="w-5 h-5" />
          <span>Chụp toa thuốc</span>
        </button>

        {/* Nút chọn ảnh phụ từ bộ sưu tập - Medium */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled}
          title="Chọn ảnh từ máy"
          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl active-press disabled:opacity-50 border border-slate-200"
        >
          <ImageIcon className="w-5 h-5" />
        </button>
      </div>

      <p className="text-center text-[11px] text-slate-400 mt-1.5 font-normal">
        Chụp đủ sáng • Tự động nén siêu nhẹ để tiết kiệm bộ nhớ
      </p>
    </div>
  );
};
