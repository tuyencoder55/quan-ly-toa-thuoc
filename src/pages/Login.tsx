import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Pill, Lock, User, ArrowRight, ShieldCheck, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

export const Login: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);

  // Form fields
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanUser = username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUser || cleanUser.length < 2) {
      setErrorMessage('Tên đăng nhập phải có ít nhất 2 ký tự (viết liền không dấu).');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      // Ánh xạ username sang email ảo nội bộ: username@toathuoc.local
      // Nếu người dùng nhập email có sẵn (ví dụ email test trước đó), giữ nguyên
      const mappedEmail = cleanUser.includes('@') ? cleanUser : `${cleanUser}@toathuoc.local`;

      if (isSignUp) {
        // Đăng ký tài khoản mới
        const cleanName = fullName.trim() || cleanUser;

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: mappedEmail,
          password,
          options: {
            data: {
              username: cleanUser,
              full_name: cleanName,
              role: 'user',
            },
          },
        });

        if (signUpError) {
          if (
            signUpError.message.includes('already registered') ||
            signUpError.message.includes('User already registered')
          ) {
            throw new Error(`Tên đăng nhập "${cleanUser}" đã có người sử dụng. Vui lòng chọn tên khác.`);
          }
          throw signUpError;
        }

        // Tự động đăng nhập luôn nếu chưa có session
        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: mappedEmail,
            password,
          });
          if (signInError) throw signInError;
        }

        setSuccessMessage('Đăng ký thành công! Đang chuyển vào ứng dụng...');
      } else {
        // Đăng nhập
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
          {/* Tab chuyển đổi Đăng nhập / Đăng ký */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl mb-5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                !isSignUp
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                isSignUp
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký mới</span>
            </button>
          </div>

          <form className="space-y-3.5" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
                <span className="font-medium">{successMessage}</span>
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
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder={isSignUp ? 'ví dụ: lan, duocsy_nam' : 'admin hoặc tên đăng nhập'}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 transition-colors"
                />
              </div>
              {isSignUp && (
                <p className="text-[10px] text-slate-400 mt-1">Viết liền không dấu dùng để đăng nhập</p>
              )}
            </div>

            {/* Họ và tên (chỉ hiện khi Đăng ký) */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên hiển thị
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ví dụ: DS. Nguyễn Thị Lan"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 transition-colors"
                />
              </div>
            )}

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
                  placeholder="Tối thiểu 6 ký tự"
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

            {/* Xác nhận mật khẩu khi Đăng ký */}
            {isSignUp && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nhập lại mật khẩu
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu ở trên"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active-press disabled:opacity-50 transition-all"
            >
              <span>{loading ? 'Đang xử lý...' : isSignUp ? 'Tạo tài khoản mới' : 'Đăng nhập vào hệ thống'}</span>
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
