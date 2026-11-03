import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Pill, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setErrorMessage('Vui lòng nhập tên đăng nhập.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      // Chuyển username thành định dạng email nội bộ của Supabase Auth: username@toathuoc.local
      // Nếu người dùng nhập email có sẵn (ví dụ email test trước đó), giữ nguyên
      const mappedEmail = cleanUser.includes('@') ? cleanUser : `${cleanUser}@toathuoc.local`;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: mappedEmail,
        password,
      });

      if (signInError) {
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('invalid_credentials')
        ) {
          throw new Error('Tên đăng nhập hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
        }
        throw signInError;
      }
    } catch (err: any) {
      console.error('Lỗi xác thực:', err);
      setErrorMessage(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Logo ứng dụng */}
        <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mb-4 animate-in zoom-in-95 duration-200">
          <Pill className="w-9 h-9" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Quản Lý Toa Thuốc
        </h1>
        <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
          Hệ thống lưu trữ & tra cứu toa thuốc cá nhân an toàn
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-sm border border-slate-200/80 rounded-3xl sm:px-8">
          <div className="mb-5 text-center">
            <h2 className="text-base font-bold text-slate-800">Đăng Nhập Tài Khoản</h2>
            <p className="text-xs text-slate-400 mt-0.5">Nhập tên đăng nhập và mật khẩu được cấp</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Tên đăng nhập */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ví dụ: admin hoặc tên đồng nghiệp"
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 transition-colors"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active-press disabled:opacity-50 transition-all"
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Cam kết bảo mật riêng tư */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Toa thuốc của ai chỉ người đó xem được (RLS bảo mật)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
