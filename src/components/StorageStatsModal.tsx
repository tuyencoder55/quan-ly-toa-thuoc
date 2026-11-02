import React from 'react';
import { StorageStats } from '../types';
import { X, HardDrive, Database, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface StorageStatsModalProps {
  stats: StorageStats | null;
  onClose: () => void;
}

export const StorageStatsModal: React.FC<StorageStatsModalProps> = ({ stats, onClose }) => {
  if (!stats) return null;

  const storagePercent = Math.min(100, Math.max(0.1, (stats.storage_mb / stats.storage_limit_mb) * 100));
  const dbPercent = Math.min(100, Math.max(0.1, (stats.db_mb / stats.db_limit_mb) * 100));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-800">Bộ nhớ Supabase</h2>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                Gói Miễn Phí Vĩnh Viễn
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 active-press"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Khối 1: Kho lưu ảnh (Storage) */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
              Kho lưu trữ ảnh (Storage)
            </span>
            <span className="text-blue-700 font-bold">
              {stats.storage_mb} MB / {stats.storage_limit_mb} MB
            </span>
          </div>

          {/* Thanh phần trăm */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${storagePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Đã lưu: <b>{stats.total_images}</b> ảnh</span>
            <span>Đã dùng: <b>{storagePercent.toFixed(2)}%</b></span>
          </div>

          <div className="pt-1 text-[11px] text-emerald-700 bg-emerald-50/80 p-2 rounded-xl flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
            <span>
              Ảnh đã được nén siêu nhẹ (~80KB/ảnh). Hạn mức 1GB có thể lưu <b>hơn 12.000 ảnh</b> toa thuốc!
            </span>
          </div>
        </div>

        {/* Khối 2: Cơ sở dữ liệu (Database) */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Dữ liệu đơn thuốc (Database)
            </span>
            <span className="text-indigo-700 font-bold">
              {stats.db_mb} MB / {stats.db_limit_mb} MB
            </span>
          </div>

          {/* Thanh phần trăm */}
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${dbPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Tổng cộng: <b>{stats.total_prescriptions}</b> toa thuốc</span>
            <span>Đã dùng: <b>{dbPercent.toFixed(2)}%</b></span>
          </div>
        </div>

        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-xl active-press"
        >
          Đã hiểu, đóng lại
        </button>
      </div>
    </div>
  );
};
