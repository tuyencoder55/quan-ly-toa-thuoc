import React, { useState } from 'react';
import { useAuth } from './lib/AuthContext';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Confirm } from './pages/Confirm';
import { Detail } from './pages/Detail';

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

  // Nếu chưa đăng nhập, bắt buộc hiển thị màn hình Đăng nhập (Rule 3)
  if (!user) {
    return <Login />;
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

