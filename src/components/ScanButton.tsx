import React, { useRef } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';

interface ScanButtonProps {
  onPhotoSelected: (file: File) => void;
  disabled?: boolean;
}

/**
 * Nút chụp toa thuốc và chọn ảnh từ thư viện
 * Dùng thẻ input file với capture="environment" để mở trực tiếp camera sau của điện thoại
 */
export const ScanButton: React.FC<ScanButtonProps> = ({ onPhotoSelected, disabled }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPhotoSelected(file);
      // Reset input để có thể chụp lại cùng 1 file nếu cần
      e.target.value = '';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent backdrop-blur-sm z-30 max-w-lg mx-auto">
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

      <div className="flex items-center gap-3">
        {/* Nút chụp toa thuốc chính - to, dễ bấm bằng ngón cái */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg shadow-blue-500/30 active-press disabled:opacity-50"
        >
          <Camera className="w-6 h-6" />
          <span className="text-lg">Chụp toa thuốc</span>
        </button>

        {/* Nút chọn ảnh phụ từ bộ sưu tập */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={disabled}
          title="Chọn ảnh từ máy"
          className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl active-press disabled:opacity-50 border border-slate-200"
        >
          <ImageIcon className="w-6 h-6" />
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 mt-2 font-medium">
        Đặt toa phẳng, đủ sáng, chụp rõ chữ
      </p>
    </div>
  );
};
