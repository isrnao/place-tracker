import { useState } from 'react';

import { supabase } from '~/api/supabaseClient';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';

interface CustomAuthProps {
  onSignIn?: () => void;
  isLoading?: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function CustomAuth({
  onSignIn,
  isLoading: externalLoading,
}: CustomAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // 外部からのローディング状態と内部のローディング状態を統合
  const isActuallyLoading = isLoading || externalLoading;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // メールアドレスの検証
    if (!email) {
      newErrors.email = 'メールアドレスを入力してください';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    // パスワードの検証
    if (!password) {
      newErrors.password = 'パスワードを入力してください';
    } else if (password.length < 6) {
      newErrors.password = 'パスワードは6文字以上である必要があります';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) {
          // Supabaseのエラーを日本語に翻訳
          const translatedError = translateSupabaseError(error.message);
          setErrors({ general: translatedError });
        } else {
          setMessage(
            '確認メールを送信しました。メールを確認してアカウントを有効化してください。'
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          const translatedError = translateSupabaseError(error.message);
          setErrors({ general: translatedError });
        } else {
          onSignIn?.();
        }
      }
    } catch {
      setErrors({
        general: 'ネットワークエラーが発生しました。後ほど再試行してください。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const translateSupabaseError = (errorMessage: string): string => {
    if (errorMessage.includes('Invalid login credentials')) {
      return 'メールアドレスまたはパスワードが正しくありません';
    }
    if (errorMessage.includes('User already registered')) {
      return 'このメールアドレスは既に登録されています';
    }
    if (errorMessage.includes('Password should be at least 6 characters')) {
      return 'パスワードは6文字以上である必要があります';
    }
    if (errorMessage.includes('Invalid email')) {
      return '有効なメールアドレスを入力してください';
    }
    if (errorMessage.includes('Email not confirmed')) {
      return 'メールアドレスの確認が完了していません。確認メールをチェックしてください';
    }
    return errorMessage;
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        const translatedError = translateSupabaseError(error.message);
        setErrors({ general: translatedError });
      }
    } catch {
      setErrors({
        general:
          'Googleログインでエラーが発生しました。後ほど再試行してください。',
      });
    }
  };

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setShowResetPassword(false);
    setMessage('');
    setErrors({});
    setEmail('');
    setPassword('');
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErrors({
        email: 'パスワードリセットのためメールアドレスを入力してください',
      });
      return;
    }

    setIsLoading(true);
    setMessage('');
    setErrors({});

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        const translatedError = translateSupabaseError(error.message);
        setErrors({ general: translatedError });
      } else {
        setMessage(
          'パスワードリセットのメールを送信しました。メールを確認してください。'
        );
        setShowResetPassword(false);
      }
    } catch {
      setErrors({
        general: 'エラーが発生しました。後ほど再試行してください。',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className='w-full max-w-md'>
      <CardHeader>
        <CardTitle>
          {showResetPassword
            ? 'パスワードリセット'
            : isSignUp
              ? 'アカウント作成'
              : 'ログイン'}
        </CardTitle>
        <CardDescription>
          {showResetPassword
            ? 'パスワードリセット用のメールを送信します'
            : isSignUp
              ? '新しいアカウントを作成してください'
              : 'アカウントにログインしてください'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showResetPassword ? (
          <div className='space-y-4'>
            <div>
              <label htmlFor='email' className='mb-1 block text-sm font-medium'>
                メールアドレス
              </label>
              <input
                id='email'
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder='example@example.com'
              />
              {errors.email && (
                <p className='mt-1 text-sm text-red-600'>{errors.email}</p>
              )}
            </div>
            {errors.general && (
              <div className='rounded-md border border-red-200 bg-red-50 p-3'>
                <p className='text-sm text-red-800'>{errors.general}</p>
              </div>
            )}
            <div className='flex space-x-2'>
              <Button
                onClick={handleResetPassword}
                disabled={isLoading}
                className='flex-1'
              >
                {isLoading ? '送信中...' : 'リセットメール送信'}
              </Button>
              <Button
                onClick={() => setShowResetPassword(false)}
                variant='outline'
                disabled={isLoading}
              >
                キャンセル
              </Button>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label
                  htmlFor='email'
                  className='mb-1 block text-sm font-medium'
                >
                  メールアドレス
                </label>
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder='example@example.com'
                />
                {errors.email && (
                  <p className='mt-1 text-sm text-red-600'>{errors.email}</p>
                )}
              </div>
              <div>
                <label
                  htmlFor='password'
                  className='mb-1 block text-sm font-medium'
                >
                  パスワード
                </label>
                <input
                  id='password'
                  type='password'
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={
                    isSignUp ? '6文字以上のパスワード' : 'パスワード'
                  }
                />
                {errors.password && (
                  <p className='mt-1 text-sm text-red-600'>{errors.password}</p>
                )}
              </div>
              {errors.general && (
                <div className='rounded-md border border-red-200 bg-red-50 p-3'>
                  <p className='text-sm text-red-800'>{errors.general}</p>
                </div>
              )}
              <Button
                type='submit'
                disabled={isActuallyLoading}
                className='w-full'
              >
                <div className='flex items-center justify-center'>
                  {isActuallyLoading && (
                    <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white'></div>
                  )}
                  {isActuallyLoading
                    ? externalLoading
                      ? '地図を準備中...'
                      : '処理中...'
                    : isSignUp
                      ? 'アカウント作成'
                      : 'ログイン'}
                </div>
              </Button>
            </form>

            <div className='mt-4'>
              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-300' />
                </div>
                <div className='relative flex justify-center text-sm'>
                  <span className='bg-white px-2 text-gray-500'>または</span>
                </div>
              </div>
              <Button
                onClick={handleGoogleSignIn}
                variant='outline'
                className='mt-4 w-full'
                disabled={isLoading}
              >
                Googleでログイン
              </Button>
            </div>

            <div className='mt-4 space-y-2 text-center'>
              <button
                type='button'
                onClick={handleModeSwitch}
                className='block text-sm text-blue-600 hover:underline'
                disabled={isLoading}
              >
                {isSignUp
                  ? '既にアカウントをお持ちの方はこちら'
                  : 'アカウントをお持ちでない方はこちら'}
              </button>
              {!isSignUp && (
                <button
                  type='button'
                  onClick={() => setShowResetPassword(true)}
                  className='block text-sm text-gray-600 hover:underline'
                  disabled={isLoading}
                >
                  パスワードをお忘れの方はこちら
                </button>
              )}
            </div>
          </>
        )}

        {message && (
          <div className='mt-4 rounded-md border border-green-200 bg-green-50 p-3'>
            <p className='text-sm text-green-800'>{message}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
