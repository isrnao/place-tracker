import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
  useLocation,
} from 'react-router';

import { supabase } from '~/api/supabaseClient';
import { MapSkeleton } from '~/components/MapSkeleton';
import { AuthProvider } from '~/contexts/AuthContext';

import type { Route } from './+types/root';
import './app.css';

const queryClient = new QueryClient();

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function loader() {
  // could read cookies, auth, etc.
  return null;
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const navigation = useNavigation();
  const location = useLocation();

  // ルートページ（地図）へのナビゲーション中かどうかを判定
  const isLoadingMapData =
    navigation.state === 'loading' &&
    (navigation.location?.pathname === '/' || location.pathname === '/');

  useEffect(() => {
    setIsHydrated(true);

    // 認証状態変更時のクエリ無効化を最適化
    let lastUserId: string | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUserId = session?.user?.id || null;

      // ユーザーIDが実際に変更された場合のみクエリを無効化
      if (currentUserId !== lastUserId) {
        queryClient.invalidateQueries({ queryKey: ['user'] });
        // mapDataキャッシュもクリア
        if (!currentUserId) {
          queryClient.removeQueries({ queryKey: ['mapData'] });
        }
        lastUserId = currentUserId;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // SSR中はAuthProviderなしでレンダリング
  if (!isHydrated) {
    return (
      <QueryClientProvider client={queryClient}>
        <Outlet />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* 地図データのローディング中はスケルトンを表示 */}
        {isLoadingMapData ? <MapSkeleton /> : <Outlet />}
      </AuthProvider>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className='container mx-auto p-4 pt-16'>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className='w-full overflow-x-auto p-4'>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
