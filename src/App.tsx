import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import { Home } from './pages/Home';
import { Confirm } from './pages/Confirm';
import { Detail } from './pages/Detail';
import { RefreshCw, WifiOff } from 'lucide-react';

type ViewMode = 'home' | 'confirm' | 'detail';

export const App: React.FC = () => {
  const { user, loading } = useAuth();

  const [currentView, setCurrentView] = useState<ViewMode>('home');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);

  // Màn hình loading khởi tạo
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Đang khởi động Toa Thuốc...</p>
      </div>
    );
  }

  // Nếu gặp lỗi mạng không kết nối được tài khoản ngầm, hiện màn hình thử lại
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <WifiOff className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-800">Không thể kết nối máy chủ</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
          Vui lòng kiểm tra lại kết nối mạng trên điện thoại và bấm thử lại.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 active-press"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>
      </div>
    );
  }

  // Điều hướng các màn hình
  const handlePhotoSelected = (file: File) => {
    setSelectedPhotoFile(file);
    setCurrentView('confirm');
  };

  const handleSelectPrescription = (id: string) => {
    setSelectedPrescriptionId(id);
    setCurrentView('detail');
  };

  return (
    <div className="min-h-screen bg-slate-100/60 font-sans">
      {currentView === 'home' && (
        <Home
          onPhotoSelected={handlePhotoSelected}
          onSelectPrescription={handleSelectPrescription}
        />
      )}

      {currentView === 'confirm' && selectedPhotoFile && (
        <Confirm
          originalFile={selectedPhotoFile}
          onSaveSuccess={() => {
            setSelectedPhotoFile(null);
            setCurrentView('home');
          }}
          onRetake={() => {
            // Mở lại camera bằng cách click nút ẩn hoặc quay về home
            setSelectedPhotoFile(null);
            setCurrentView('home');
          }}
          onCancel={() => {
            setSelectedPhotoFile(null);
            setCurrentView('home');
          }}
        />
      )}

      {currentView === 'detail' && selectedPrescriptionId && (
        <Detail
          prescriptionId={selectedPrescriptionId}
          onBack={() => {
            setSelectedPrescriptionId(null);
            setCurrentView('home');
          }}
          onDeleted={() => {
            setSelectedPrescriptionId(null);
            setCurrentView('home');
          }}
          onSelectOtherPrescription={(id) => {
            setSelectedPrescriptionId(id);
          }}
        />
      )}
    </div>
  );
};

