import React from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

/**
 * Hộp thoại phóng to ảnh đơn thuốc toàn màn hình
 * Giúp người dùng đọc lại các dòng chữ nhỏ trên toa
 */
export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, onClose }) => {
  const [scale, setScale] = React.useState(1);

  if (!imageUrl) return null;

  const zoomIn = () => setScale((s) => Math.min(3, s + 0.5));
  const zoomOut = () => setScale((s) => Math.max(1, s - 0.5));
  const resetZoom = () => setScale(1);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-between p-4 backdrop-blur-sm">
      {/* Header điều khiển */}
      <div className="w-full max-w-lg flex items-center justify-between text-white z-10">
        <span className="text-sm font-medium">Chi tiết ảnh toa thuốc</span>
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full active-press text-white"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={zoomIn}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-full active-press text-white"
            title="Phóng to"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full active-press text-white ml-2"
            title="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Vùng hiển thị ảnh có thể cuộn và phóng to */}
      <div
        className="flex-1 w-full max-w-lg overflow-auto flex items-center justify-center p-2"
        onClick={resetZoom}
      >
        <img
          src={imageUrl}
          alt="Toa thuốc"
          style={{ transform: `scale(${scale})`, transition: 'transform 0.2s ease' }}
          className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl cursor-pointer"
        />
      </div>

      {/* Footer gợi ý */}
      <div className="text-center text-xs text-white/60 pb-2">
        Bấm vào ảnh để đặt lại kích thước gốc • Phóng to: {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
