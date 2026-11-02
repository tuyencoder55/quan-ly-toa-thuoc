import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Tài khoản mặc định của gia đình để tự động đăng nhập ngầm, vợ không cần gõ mật khẩu
const AUTO_EMAIL = 'toathuoc.giadinh@gmail.com';
const AUTO_PASSWORD = 'ToaThuoc2026@VoYeu';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Hàm tự động đăng nhập ngầm
  const autoSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: AUTO_EMAIL,
        password: AUTO_PASSWORD,
      });

      if (!error && data.session) {
        setSession(data.session);
        setUser(data.user);
      }
    } catch (err) {
      console.warn('Lỗi tự động đăng nhập ngầm:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Kiểm tra session đã lưu trong trình duyệt
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        // Nếu chưa đăng nhập, tự động đăng nhập tài khoản gia đình ngầm
        autoSignIn();
      }
    });

    // 2. Lắng nghe thay đổi trạng thái đăng nhập
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
