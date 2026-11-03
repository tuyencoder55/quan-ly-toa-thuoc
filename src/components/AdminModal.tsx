import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { AdminUserItem } from '../types';
import {
  X,
  Shield,
  UserPlus,
  RotateCcw,
  Trash2,
  Users,
  HardDrive,
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Eye,
  EyeOff
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form tạo tài khoản mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Trạng thái đang reset mật khẩu
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Tải danh sách người dùng
  const loadUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase.rpc('admin_get_users');
      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Lỗi tải danh sách tài khoản:', err);
      setError(err.message || 'Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, loadUsers]);

  if (!isOpen) return null;

  // Tổng hợp thống kê
  const totalUsers = users.length;
  const totalPrescriptions = users.reduce((sum, u) => sum + Number(u.prescription_count || 0), 0);
  const totalStorageMb = users
    .reduce((sum, u) => sum + Number(u.storage_mb || 0), 0)
    .toFixed(2);

  // Lọc theo từ khóa
  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q))
    );
  });

  // Xử lý tạo tài khoản mới
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUser = newUsername.trim().toLowerCase();
    const cleanName = newFullName.trim();

    if (!cleanUser || cleanUser.length < 2) {
      setError('Tên đăng nhập tối thiểu 2 ký tự.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu tối thiểu 6 ký tự.');
      return;
    }

    setCreating(true);
    try {
      const { error: createError } = await supabase.rpc('admin_create_user', {
        p_username: cleanUser,
        p_full_name: cleanName || cleanUser,
        p_password: newPassword,
      });

      if (createError) throw createError;

      setSuccess(`Đã tạo tài khoản "${cleanUser}" thành công!`);
      setShowCreateModal(false);
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      await loadUsers(true);
    } catch (err: any) {
      console.error('Lỗi tạo tài khoản:', err);
      setError(err.message || 'Không thể tạo tài khoản.');
    } finally {
      setCreating(false);
    }
  };

  // Xử lý reset mật khẩu mặc định về 123456
  const handleResetToDefault = async (userItem: AdminUserItem) => {
    const confirmReset = window.confirm(
      `Đặt lại mật khẩu cho tài khoản "${userItem.username}" (${userItem.full_name}) về mật khẩu mặc định "123456"?`
    );
    if (!confirmReset) return;

    setError(null);
    setSuccess(null);
    setResettingId(userItem.id);

    try {
      const { error: resetError } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: userItem.id,
        p_new_password: '123456',
      });

      if (resetError) throw resetError;

      setSuccess(`Đã reset mật khẩu cho tài khoản "${userItem.username}" về mặc định: 123456`);
    } catch (err: any) {
      console.error('Lỗi reset mật khẩu:', err);
      setError(err.message || 'Không thể reset mật khẩu.');
    } finally {
      setResettingId(null);
    }
  };

  // Xử lý xóa tài khoản
  const handleDeleteUser = async (userItem: AdminUserItem) => {
    if (userItem.id === currentUserId || userItem.role === 'admin' || userItem.username === 'admin') {
      alert('Không thể xóa tài khoản Quản trị viên chính.');
      return;
    }

    const confirmMsg = `Bạn có chắc chắn muốn xóa tài khoản "${userItem.username}" (${userItem.full_name})?\n\nToàn bộ ${userItem.prescription_count} toa thuốc và ảnh đính kèm của tài khoản này sẽ bị xóa vĩnh viễn!`;
    if (!window.confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);
    try {
      const { error: delError } = await supabase.rpc('admin_delete_user', {
        p_user_id: userItem.id,
      });

      if (delError) throw delError;

      setSuccess(`Đã xóa tài khoản "${userItem.username}" thành công!`);
      await loadUsers(true);
    } catch (err: any) {
      console.error('Lỗi xóa tài khoản:', err);
      setError(err.message || 'Không thể xóa tài khoản.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-800">Quản Trị Hệ Thống & Tài Khoản</h2>
              <p className="text-[11px] text-slate-400">Quản lý đồng nghiệp, phân quyền và dữ liệu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo Alert */}
        {error && (
          <div className="mx-5 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-5 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{success}</span>
          </div>
        )}

        {/* Nội dung chính cuộn được */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 3 Thẻ thống kê nhanh */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Tài khoản</span>
              </div>
              <div className="mt-1 text-lg font-bold text-slate-800">{totalUsers}</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Toàn bộ toa</span>
              </div>
              <div className="mt-1 text-lg font-bold text-slate-800">{totalPrescriptions}</div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-medium">
                <HardDrive className="w-3.5 h-3.5 text-purple-600" />
                <span>Bộ nhớ ảnh</span>
              </div>
              <div className="mt-1 text-lg font-bold text-slate-800">{totalStorageMb} MB</div>
            </div>
          </div>

          {/* Thanh công cụ: Nút tạo tài khoản mới + Tìm kiếm + Nút reload */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo username hoặc họ tên..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-100 rounded-xl focus:bg-white border border-transparent focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadUsers(true)}
                disabled={refreshing}
                className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200/70 rounded-xl transition-colors disabled:opacity-50"
                title="Làm mới danh sách"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setSuccess(null);
                  setShowCreateModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs active-press transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Thêm tài khoản</span>
              </button>
            </div>
          </div>

          {/* Danh sách người dùng */}
          <div className="space-y-2.5">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Đang tải danh sách người dùng...</span>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                Không tìm thấy tài khoản nào phù hợp.
              </div>
            ) : (
              filteredUsers.map((item) => {
                const isAdminItem = item.role === 'admin' || item.username === 'admin';
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{item.full_name}</span>
                        <span className="text-xs font-mono font-medium text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                          @{item.username}
                        </span>
                        {isAdminItem ? (
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Admin
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                            Đồng nghiệp
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span>
                          Toa thuốc: <strong className="text-slate-700">{item.prescription_count}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Dung lượng: <strong className="text-slate-700">{item.storage_mb} MB</strong>
                        </span>
                        {item.last_sign_in_at && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">
                              Đăng nhập:{' '}
                              {new Date(item.last_sign_in_at).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Các nút thao tác */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        disabled={resettingId === item.id}
                        onClick={() => handleResetToDefault(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-xs font-medium text-slate-700 hover:text-amber-700 transition-colors disabled:opacity-50"
                        title="Đặt lại mật khẩu về mặc định 123456"
                      >
                        <RotateCcw className={`w-3.5 h-3.5 text-amber-600 ${resettingId === item.id ? 'animate-spin' : ''}`} />
                        <span>{resettingId === item.id ? 'Đang reset...' : 'Reset MK'}</span>
                      </button>

                      {!isAdminItem && (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(item)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl text-xs font-medium text-red-600 transition-colors"
                          title="Xóa tài khoản này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>

      {/* MODAL PHỤ: TẠO TÀI KHOẢN MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-800">Tạo Tài Khoản Đồng Nghiệp</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3">
              {/* Tên đăng nhập */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên đăng nhập (Username) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="ví dụ: lan, duocsy_nam"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Viết liền không dấu, dùng để đăng nhập</p>
              </div>

              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên hiển thị *
                </label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="ví dụ: DS. Nguyễn Thị Lan"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                />
              </div>

              {/* Mật khẩu khởi tạo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu khởi tạo *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự (mặc định: 123456)"
                    className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
