import type { Route } from './+types/api.auth.session';

export async function loader({ request: _request }: Route.LoaderArgs) {
  return Response.json({ message: 'Auth session endpoint' });
}

export async function action({ request }: Route.ActionArgs) {
  const method = request.method;

  if (method === 'POST') {
    // セッション情報を受け取ってCookieを設定
    const { session } = await request.json();

    if (session?.access_token) {
      const headers = new Headers();
      const isProduction = process.env.NODE_ENV === 'production';
      const secureFlag = isProduction ? '; Secure' : '';

      // HttpOnlyを削除してクライアント側でもアクセス可能にする
      headers.append(
        'Set-Cookie',
        `sb-access-token=${session.access_token}; Path=/; SameSite=Lax; Max-Age=3600${secureFlag}`
      );
      headers.append(
        'Set-Cookie',
        `sb-refresh-token=${session.refresh_token}; Path=/; SameSite=Lax; Max-Age=604800${secureFlag}`
      );

      return Response.json({ success: true }, { headers });
    }

    return Response.json({ success: false }, { status: 400 });
  }

  if (method === 'DELETE') {
    // セッションクリア
    const headers = new Headers();
    headers.append(
      'Set-Cookie',
      `sb-access-token=; Path=/; SameSite=Lax; Max-Age=0`
    );
    headers.append(
      'Set-Cookie',
      `sb-refresh-token=; Path=/; SameSite=Lax; Max-Age=0`
    );

    return Response.json({ success: true }, { headers });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
