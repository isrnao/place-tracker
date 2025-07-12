import type { User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '~/api/supabaseClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);

  // SSR中やハイドレーション前はデフォルト値を返す
  if (typeof window === 'undefined') {
    return {
      user: null,
      isLoading: true,
      signOut: async () => {},
    };
  }

  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    // 初期認証状態を取得
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      // セッション情報をサーバーに送信してCookieを設定
      if (session && typeof window !== 'undefined') {
        try {
          const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session }),
          });

          if (!response.ok) {
            console.warn('Failed to set session cookie:', response.status);
          }
        } catch (error) {
          console.error('Error setting session cookie:', error);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // サーバーのセッションもクリア
      if (typeof window !== 'undefined') {
        await fetch('/api/auth/session', {
          method: 'DELETE',
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
