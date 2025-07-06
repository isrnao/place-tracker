import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createRequestHandler } from '@react-router/express';

// Vercel serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestHandler = createRequestHandler({
    // @ts-expect-error - Build-time generated module
    build: () => import('../build/server/index.js'),
  });

  return requestHandler(req, res);
}
