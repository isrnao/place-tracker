import { createRequestHandler } from '@react-router/express';

export default async function handler(req, res) {
  try {
    // Build時に生成されたサーバーバンドルを動的インポート
    const { default: build } = await import('../build/server/index.js');

    const requestHandler = createRequestHandler({
      build,
      mode: 'production',
      getLoadContext: () => ({}),
    });

    return requestHandler(req, res);
  } catch (error) {
    console.error('SSR error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
