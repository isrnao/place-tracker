import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import { supabase } from '~/api/supabaseClient';
import CustomAuth from '~/components/CustomAuth';
import { useAuth } from '~/contexts/AuthContext';

export const meta = () => [{ title: 'Login - Place Tracker' }];

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // ハイドレーション後で既にログインしている場合は地図画面にリダイレクト
    if (isHydrated && user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate, isHydrated]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsSigningIn(true);
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = () => {
    setIsSigningIn(true);
    navigate('/', { replace: true });
  };

  // 初期ローディング中の表示
  if (isLoading) {
    return (
      <main className='flex h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
          <p className='text-gray-600'>認証情報を確認中...</p>
        </div>
      </main>
    );
  }

  // 既にログインしている場合は何も表示しない
  if (user) {
    return null;
  }

  return (
    <main className='flex h-screen items-center justify-center bg-gray-50'>
      <CustomAuth onSignIn={handleSignIn} isLoading={isSigningIn} />
    </main>
  );
}
