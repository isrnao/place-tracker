// server/types.d.ts
declare module '../build/server/index.js' {
  import type { RequestHandler } from 'express';
  const handler: RequestHandler;
  export default handler;
}
