import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeName } from '../lib/normalizeName';
import { Prescription } from '../types';
import { ScanButton } from '../components/ScanButton';
import {
  Search,
  X,
  Pill,
  Calendar,
  ChevronRight,
  RefreshCw,
  FileText
} from 'lucide-react';

interface HomeProps {
  onPhotoSelected: (file: File) => void;
  onSelectPrescription: (id: string) => void;
}

const PAGE_SIZE = 20;

export const Home: React.FC<HomeProps> = ({ onPhotoSelected, onSelectPrescription }) => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // 1. Tải danh sách toa thuốc từ Supabase
  const loadPrescriptions = useCallback(
    async (pageIndex: number, search: string, isRefresh = false) => {
      if (pageIndex === 0) setLoading(true);
      if (isRefresh) setRefreshing(true);

      try {
        let query = supabase
          .from('prescriptions')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);

        // Tìm kiếm không dấu theo name_search HOẶC tìm theo số điện thoại (phone)
        const cleaned = normalizeName(search);
        const rawSearch = search.trim();
        if (cleaned) {
          query = query.or(`name_search.ilike.%${cleaned}%,phone.ilike.%${rawSearch}%`);
        }

        const { data, count, error } = await query;
        if (error) throw error;

        if (count !== null) setTotalCount(count);

        const items = data || [];
        if (pageIndex === 0) {
          setPrescriptions(items);
        } else {
          setPrescriptions((prev) => [...prev, ...items]);
        }

        setHasMore(items.length === PAGE_SIZE);
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách toa:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // 2. Debounce tìm kiếm 250ms
  useEffect(() => {
    setPage(0);
    const handler = setTimeout(() => {
      loadPrescriptions(0, searchTerm);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchTerm, loadPrescriptions]);

  // Xem thêm trang tiếp theo
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPrescriptions(nextPage, searchTerm);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      {/* Header trang chủ */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base text-slate-900 leading-tight">
                Sổ Toa Thuốc
              </h1>
              <p className="text-[11px] text-slate-400">
                Lưu trữ & tra cứu bằng AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => loadPrescriptions(0, searchTerm, true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full active-press disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm tức thì theo tên khách hàng */}
        <div className="max-w-lg mx-auto mt-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên KH hoặc số điện thoại (vd: Quý, 0901...)"
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-blue-500 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Thân danh sách */}
      <main className="max-w-lg mx-auto p-4 space-y-3">
        {/* Số lượng toa thuốc */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span>
            {searchTerm ? `Kết quả tìm kiếm cho "${searchTerm}"` : 'Tất cả toa thuốc'}
          </span>
          {totalCount !== null && (
            <span>
              {totalCount} {totalCount === 1 ? 'toa' : 'toa'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Đang tải danh sách toa thuốc...</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {searchTerm ? 'Không tìm thấy toa thuốc nào' : 'Chưa có toa thuốc nào'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {searchTerm
                ? 'Thử tìm bằng từ khóa hoặc họ tên khác'
                : 'Bấm nút "Chụp toa thuốc" bên dưới để lưu toa đầu tiên'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {prescriptions.map((item) => {
              const medCount = Array.isArray(item.medicines) ? item.medicines.length : 0;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectPrescription(item.id)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs hover:border-blue-200 transition-all flex items-center justify-between gap-3 cursor-pointer active-press"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-slate-900 text-base truncate">
                        {item.customer_name}
                      </h3>
                      {item.birth_date && (
                        <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.birth_date).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {medCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                          <Pill className="w-3 h-3" />
                          {medCount} loại thuốc
                        </span>
                      )}
                      {item.phone && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          📞 {item.phone}
                        </span>
                      )}
                      {Array.isArray(item.image_paths) && item.image_paths.length > 1 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          📷 {item.image_paths.length} ảnh
                        </span>
                      )}
                      {item.address && (
                        <span className="text-[11px] text-slate-500 truncate max-w-[200px]">
                          📍 {item.address}
                        </span>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-400 mt-1">
                      Lưu lúc: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  <div className="text-slate-300 pl-1">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <button
                type="button"
                onClick={handleLoadMore}
                className="w-full py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-semibold hover:bg-slate-50 active-press mt-2"
              >
                Xem thêm toa thuốc cũ hơn
              </button>
            )}
          </div>
        )}
      </main>

      {/* Nút chụp toa thuốc to dễ bấm */}
      <ScanButton onPhotoSelected={onPhotoSelected} />
    </div>
  );
};

