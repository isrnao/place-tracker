import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';

import { supabase } from '~/api/supabaseClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isInitialized: false,
  signOut: async () => {},
  refreshSession: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);

  // SSR中やハイドレーション前はデフォルト値を返す
  if (typeof window === 'undefined') {
    return {
      user: null,
      isLoading: true,
      isInitialized: false,
      signOut: async () => {},
      refreshSession: async () => {},
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
  const [isInitialized, setIsInitialized] = useState(false);

  // セッション同期関数
  const syncSessionWithServer = useCallback(async (session: any) => {
    if (!session || typeof window === 'undefined') return;

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      });

      if (!response.ok) {
        console.warn('Failed to sync session with server:', response.status);
      }
    } catch (error) {
      console.error('Error syncing session with server:', error);
    }
  }, []);

  // セッション更新関数
  const refreshSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing session:', error);
        setUser(null);
        return;
      }

      if (data.session) {
        setUser(data.session.user);
        await syncSessionWithServer(data.session);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
    }
  }, [syncSessionWithServer]);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === 'undefined') {
      setIsLoading(false);
      setIsInitialized(true);
      return;
    }

    // 初期認証状態を取得
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setUser(session?.user ?? null);

        if (session) {
          await syncSessionWithServer(session);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setIsLoading(false);

      // セッション情報をサーバーと同期
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) {
          await syncSessionWithServer(session);
        }
      } else if (event === 'SIGNED_OUT') {
        // サーバーのセッションもクリア
        try {
          await fetch('/api/auth/session', {
            method: 'DELETE',
          });
        } catch (error) {
          console.error('Error clearing server session:', error);
        }
      }
    });

    // 定期的なセッション更新（5分ごと）
    const sessionRefreshInterval = setInterval(
      async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = session.expires_at || 0;
          const refreshThreshold = 5 * 60; // 5分前

          if (expiresAt - now < refreshThreshold) {
            await refreshSession();
          }
        }
      },
      5 * 60 * 1000
    ); // 5分ごと

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionRefreshInterval);
    };
  }, [syncSessionWithServer, refreshSession]);

  const signOut = async () => {
    try {
      setIsLoading(true);

      // Supabaseからサインアウト
      await supabase.auth.signOut();

      // サーバーのセッションもクリア
      if (typeof window !== 'undefined') {
        await fetch('/api/auth/session', {
          method: 'DELETE',
        });
      }

      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isLoading,
    isInitialized,
    signOut,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
