import type { Route } from './+types/$splat';

export async function loader({ params }: Route.LoaderArgs) {
  const { splat } = params;

  // Chrome DevToolsや他のブラウザー拡張機能の要求を404で処理
  if (splat?.startsWith('.well-known') || splat?.startsWith('sw.js')) {
    return new Response(null, { status: 404 });
  }

  // 他の不明なパスも404で処理
  return new Response(null, { status: 404 });
}
