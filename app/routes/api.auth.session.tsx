import type { Route } from './+types/api.auth.session';
import { SessionService } from '~/lib/session.service';
import { checkAuth } from '~/lib/auth.middleware';

export async function loader({ request }: Route.LoaderArgs) {
  // 改善された認証ミドルウェアを使用
  const { userId, headers, error } = await checkAuth(request);

  const response = Response.json({
    authenticated: !!userId,
    userId: userId || null,
    error: error ? { code: error.code, message: error.message } : null,
  });

  // セッション更新のヘッダーがある場合は設定
  if (headers) {
    for (const [key, value] of headers.entries()) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export async function action({ request }: Route.ActionArgs) {
  const method = request.method;

  if (method === 'POST') {
    try {
      const { session } = await request.json();

      if (!session?.access_token || !session?.user?.id) {
        return Response.json(
          { success: false, error: 'Invalid session data' },
          { status: 400 }
        );
      }

      // 新しいSessionServiceを使用してセッションを作成
      const headers = await SessionService.createSession(request, session);

      return Response.json({ success: true }, { headers });
    } catch (error) {
      console.error('Error creating session:', error);
      return Response.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }
  }

  if (method === 'DELETE') {
    try {
      // SessionServiceを使用してセッションを破棄
      const headers = await SessionService.destroySession(request);

      return Response.json({ success: true }, { headers });
    } catch (error) {
      console.error('Error destroying session:', error);
      return Response.json(
        { success: false, error: 'Failed to destroy session' },
        { status: 500 }
      );
    }
  }

  if (method === 'PUT') {
    try {
      // セッションの更新（リフレッシュ）
      const { headers, success, error } =
        await SessionService.refreshSession(request);

      if (!success) {
        return Response.json(
          { success: false, error },
          { status: 401, headers }
        );
      }

      return Response.json({ success: true }, { headers });
    } catch (error) {
      console.error('Error refreshing session:', error);
      return Response.json(
        { success: false, error: 'Failed to refresh session' },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
