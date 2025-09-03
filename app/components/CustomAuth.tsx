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
import { useFormError } from '~/lib/useAuthError';
import { ErrorDisplay, FieldError, SuccessDisplay } from './ErrorDisplay';
import { translateSupabaseError } from '~/lib/auth.errors';

interface CustomAuthProps {
  onSignIn?: () => void;
  isLoading?: boolean;
}

export default function CustomAuth({
  onSignIn,
  isLoading: externalLoading,
}: CustomAuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [message, setMessage] = useState('');

  // 統一されたエラーハンドリングを使用
  const {
    isLoading,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    executeWithErrorHandling,
    getUserError,
    clearError,
  } = useFormError();

  // 外部からのローディング状態と内部のローディング状態を統合
  const isActuallyLoading = isLoading || externalLoading;

  const validateForm = (): boolean => {
    clearAllFieldErrors();
    let isValid = true;

    // メールアドレスの検証
    if (!email) {
      setFieldError('email', 'メールアドレスを入力してください');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('email', '有効なメールアドレスを入力してください');
      isValid = false;
    }

    // パスワードの検証
    if (!password) {
      setFieldError('password', 'パスワードを入力してください');
      isValid = false;
    } else if (password.length < 6) {
      setFieldError('password', 'パスワードは6文字以上である必要があります');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    clearError();

    if (!validateForm()) {
      return;
    }

    const result = await executeWithErrorHandling(
      async () => {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) {
            throw error;
          }
          return 'signup_success';
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) {
            throw error;
          }
          return 'signin_success';
        }
      },
      isSignUp ? 'signup' : 'signin',
      { timeout: 15000 }
    );

    if (result === 'signup_success') {
      const isDevelopment =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';
      const message = isDevelopment
        ? '確認メールを送信しました。開発環境では http://localhost:54324 でメールを確認できます。メール内のリンクをクリックしてアカウントを有効化してください。'
        : '確認メールを送信しました。メールを確認してアカウントを有効化してください。';
      setMessage(message);
    } else if (result === 'signin_success') {
      onSignIn?.();
    }
  };

  const handleGoogleSignIn = async () => {
    await executeWithErrorHandling(
      async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) {
          throw error;
        }
      },
      'google_oauth',
      { timeout: 30000 } // OAuth は時間がかかる場合があるため30秒
    );
  };

  const handleModeSwitch = () => {
    setIsSignUp(!isSignUp);
    setShowResetPassword(false);
    setMessage('');
    clearError();
    clearAllFieldErrors();
    setEmail('');
    setPassword('');
  };

  const handleResetPassword = async () => {
    if (!email) {
      setFieldError(
        'email',
        'パスワードリセットのためメールアドレスを入力してください'
      );
      return;
    }

    setMessage('');
    clearError();

    const result = await executeWithErrorHandling(
      async () => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          throw error;
        }
        return 'reset_success';
      },
      'password_reset',
      { timeout: 15000 }
    );

    if (result === 'reset_success') {
      setMessage(
        'パスワードリセットのメールを送信しました。メールを確認してください。'
      );
      setShowResetPassword(false);
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
                onChange={e => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    clearFieldError('email');
                  }
                }}
                required
                className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder='example@example.com'
              />
              <FieldError error={fieldErrors.email} />
            </div>
            {getUserError() && (
              <ErrorDisplay
                title={getUserError()?.title}
                message={getUserError()?.message || ''}
                action={getUserError()?.action}
                canRetry={getUserError()?.canRetry}
                onDismiss={clearError}
              />
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
                  onChange={e => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) {
                      clearFieldError('email');
                    }
                  }}
                  required
                  className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    fieldErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder='example@example.com'
                />
                <FieldError error={fieldErrors.email} />
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
                  onChange={e => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) {
                      clearFieldError('password');
                    }
                  }}
                  required
                  className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                    fieldErrors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder={
                    isSignUp ? '6文字以上のパスワード' : 'パスワード'
                  }
                />
                <FieldError error={fieldErrors.password} />
              </div>
              {getUserError() && (
                <ErrorDisplay
                  title={getUserError()?.title}
                  message={getUserError()?.message || ''}
                  action={getUserError()?.action}
                  canRetry={getUserError()?.canRetry}
                  onDismiss={clearError}
                />
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
          <SuccessDisplay
            message={message}
            onDismiss={() => setMessage('')}
            className='mt-4'
          />
        )}
      </CardContent>
    </Card>
  );
}
