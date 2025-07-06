import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '~/api/supabaseClient';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';

export const meta = () => [{ title: 'パスワードリセット - Place Tracker' }];

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password.length < 6) {
      setError('パスワードは6文字以上である必要があります');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError(translateSupabaseError(error.message));
      } else {
        setMessage('パスワードが正常に更新されました。');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 2000);
      }
    } catch (error: any) {
      setError('エラーが発生しました。後ほど再試行してください。');
    } finally {
      setIsLoading(false);
    }
  };

  const translateSupabaseError = (errorMessage: string): string => {
    if (errorMessage.includes('Password should be at least 6 characters')) {
      return 'パスワードは6文字以上である必要があります';
    }
    if (errorMessage.includes('Unable to validate email address')) {
      return 'メールアドレスの検証に失敗しました。リンクの有効期限が切れている可能性があります。';
    }
    return errorMessage;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>新しいパスワードを設定</CardTitle>
          <CardDescription>
            新しいパスワードを入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                新しいパスワード
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6文字以上のパスワード"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                パスワード確認
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを再入力"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '更新中...' : 'パスワードを更新'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="text-sm"
            >
              ログインページに戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
