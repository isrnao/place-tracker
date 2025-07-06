import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { supabase } from '~/api/supabaseClient';
import CustomAuth from '~/components/CustomAuth';
import { useAuth } from '~/contexts/AuthContext';

export const meta = () => [{ title: 'Login - Place Tracker' }];

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // 既にログインしている場合はメインページにリダイレクト
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = () => {
    navigate('/', { replace: true });
  };

  // ローディング中は何も表示しない
  if (isLoading) {
    return (
      <main className='flex h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>読み込み中...</p>
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
      <CustomAuth onSignIn={handleSignIn} />
    </main>
  );
}
