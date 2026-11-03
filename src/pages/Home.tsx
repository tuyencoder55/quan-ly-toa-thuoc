import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { normalizeName } from '../lib/normalizeName';
import { Prescription, StorageStats } from '../types';
import { ScanButton } from '../components/ScanButton';
import { StorageStatsModal } from '../components/StorageStatsModal';
import { AdminModal } from '../components/AdminModal';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import {
  Search,
  X,
  Pill,
  Calendar,
  ChevronRight,
  RefreshCw,
  FileText,
  HardDrive,
  LogOut,
  Shield,
  KeyRound
} from 'lucide-react';

interface HomeProps {
  onPhotoSelected: (file: File) => void;
  onSelectPrescription: (id: string) => void;
}

const PAGE_SIZE = 20;

export const Home: React.FC<HomeProps> = ({ onPhotoSelected, onSelectPrescription }) => {
  const { user, signOut } = useAuth();

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Bộ nhớ Supabase
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Quyền Admin và các Modal quản trị
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Kiểm tra quyền Admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.user_metadata?.role === 'admin' || user?.email === 'admin@toathuoc.local') {
        setIsAdmin(true);
        return;
      }
      try {
        const { data } = await supabase.rpc('is_admin');
        if (data) setIsAdmin(true);
      } catch (err) {
        console.warn('Lỗi kiểm tra quyền admin:', err);
      }
    };
    if (user) checkAdmin();
  }, [user]);

  // Tải thống kê dung lượng bộ nhớ Supabase (riêng cho tài khoản đang đăng nhập)
  const loadStats = useCallback(async () => {
    try {
      const { data } = await supabase.rpc('get_storage_stats');
      if (data) setStorageStats(data);
    } catch (err) {
      console.warn('Lỗi tải dung lượng bộ nhớ:', err);
    }
  }, []);

  // 1. Tải danh sách toa thuốc từ Supabase (RLS tự động lọc chỉ toa của user đang đăng nhập)
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

        // Cập nhật lại dung lượng bộ nhớ
        loadStats();
      } catch (err: any) {
        console.error('Lỗi khi tải danh sách toa:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loadStats]
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

  const handleLogout = async () => {
    if (window.confirm('Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?')) {
      await signOut();
    }
  };

  const rawUsername = user?.user_metadata?.username || (user?.email?.endsWith('@toathuoc.local') ? user.email.replace('@toathuoc.local', '') : user?.email?.split('@')[0]) || 'user';
  const displayName = user?.user_metadata?.full_name || rawUsername;

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      {/* Header trang chủ */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base text-slate-900 leading-tight truncate">
                  {displayName}
                </h1>
                {isAdmin && (
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" /> Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[170px]" title={user?.email}>
                @{rawUsername}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Nút Quản trị cho Admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-semibold active-press transition-colors"
                title="Quản trị tài khoản đồng nghiệp"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                <span className="hidden sm:inline">Quản trị</span>
              </button>
            )}

            {/* Nút Đổi mật khẩu cá nhân */}
            <button
              type="button"
              onClick={() => setShowChangePasswordModal(true)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 active-press transition-colors"
              title="Đổi mật khẩu cá nhân"
            >
              <KeyRound className="w-4 h-4 text-slate-600" />
            </button>

            {/* Nút xem dung lượng bộ nhớ Supabase */}
            <button
              type="button"
              onClick={() => setShowStatsModal(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-slate-700 text-xs font-medium active-press border border-slate-200/50"
              title="Xem dung lượng bộ nhớ đã sử dụng"
            >
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>{storageStats ? `${storageStats.storage_mb} MB` : 'Bộ nhớ'}</span>
            </button>

            {/* Nút làm mới danh sách */}
            <button
              onClick={() => loadPrescriptions(0, searchTerm, true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-full active-press disabled:opacity-50"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Nút đăng xuất */}
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-600 rounded-full active-press"
              title="Đăng xuất tài khoản"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thanh tìm kiếm tức thì theo tên khách hàng hoặc SĐT */}
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
                ? 'Thử tìm bằng từ khóa hoặc số điện thoại khác'
                : 'Bấm nút "Chụp toa thuốc" bên dưới để lưu toa đầu tiên của bạn'}
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

      {/* Nút chụp toa thuốc vừa vặn (Medium) */}
      <ScanButton onPhotoSelected={onPhotoSelected} />

      {/* Hộp thoại thông tin dung lượng bộ nhớ Supabase */}
      {showStatsModal && (
        <StorageStatsModal
          stats={storageStats}
          onClose={() => setShowStatsModal(false)}
        />
      )}

      {/* Hộp thoại đổi mật khẩu cá nhân */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
      />

      {/* Hộp thoại Quản trị hệ thống (Admin) */}
      <AdminModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        currentUserId={user?.id}
      />
    </div>
  );
};
