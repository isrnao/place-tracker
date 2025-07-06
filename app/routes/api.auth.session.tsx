import type { Route } from './+types/api.auth.session';

export async function loader({ request }: Route.LoaderArgs) {
  return Response.json({ message: 'Auth session endpoint' });
}

export async function action({ request }: Route.ActionArgs) {
  const method = request.method;
  
  if (method === 'POST') {
    // セッション情報を受け取ってCookieを設定
    const { session } = await request.json();
    
    if (session?.access_token) {
      const headers = new Headers();
      headers.append('Set-Cookie', `sb-access-token=${session.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
      headers.append('Set-Cookie', `sb-refresh-token=${session.refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
      
      return Response.json({ success: true }, { headers });
    }
    
    return Response.json({ success: false }, { status: 400 });
  }
  
  if (method === 'DELETE') {
    // セッションクリア
    const headers = new Headers();
    headers.append('Set-Cookie', `sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    headers.append('Set-Cookie', `sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
    
    return Response.json({ success: true }, { headers });
  }
  
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
