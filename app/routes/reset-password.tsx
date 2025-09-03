import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

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
import {
  ErrorDisplay,
  FieldError,
  SuccessDisplay,
} from '~/components/ErrorDisplay';

export const meta = () => [{ title: 'パスワードリセット - Place Tracker' }];

export default function ResetPassword() {
  const [_searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  useEffect(() => {
    // URLからトークンを取得してSupabaseのセッションを確認
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      // Supabaseのセッションを設定
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, []);

  const validateForm = (): boolean => {
    clearAllFieldErrors();
    let isValid = true;

    if (password.length < 6) {
      setFieldError('password', 'パスワードは6文字以上である必要があります');
      isValid = false;
    }

    if (password !== confirmPassword) {
      setFieldError('confirmPassword', 'パスワードが一致しません');
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
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          throw error;
        }
        return 'password_updated';
      },
      'password_update',
      { timeout: 15000 }
    );

    if (result === 'password_updated') {
      setMessage('パスワードが正常に更新されました。');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>新しいパスワードを設定</CardTitle>
          <CardDescription>新しいパスワードを入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <SuccessDisplay
              message={message}
              onDismiss={() => setMessage('')}
              className='mb-4'
            />
          )}

          {getUserError() && (
            <ErrorDisplay
              title={getUserError()?.title}
              message={getUserError()?.message || ''}
              action={getUserError()?.action}
              canRetry={getUserError()?.canRetry}
              onDismiss={clearError}
              className='mb-4'
            />
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label
                htmlFor='password'
                className='mb-1 block text-sm font-medium'
              >
                新しいパスワード
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
                placeholder='6文字以上のパスワード'
              />
              <FieldError error={fieldErrors.password} />
            </div>

            <div>
              <label
                htmlFor='confirmPassword'
                className='mb-1 block text-sm font-medium'
              >
                パスワード確認
              </label>
              <input
                id='confirmPassword'
                type='password'
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    clearFieldError('confirmPassword');
                  }
                }}
                required
                className={`w-full rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  fieldErrors.confirmPassword
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
                placeholder='パスワードを再入力'
              />
              <FieldError error={fieldErrors.confirmPassword} />
            </div>

            <Button type='submit' disabled={isLoading} className='w-full'>
              {isLoading ? '更新中...' : 'パスワードを更新'}
            </Button>
          </form>

          <div className='mt-4 text-center'>
            <Button
              variant='outline'
              onClick={() => navigate('/login')}
              className='text-sm'
            >
              ログインページに戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
