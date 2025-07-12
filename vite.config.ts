import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import compression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    // gzip圧縮プラグインを追加
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    // brotli圧縮も追加（より効率的）
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  // 開発環境でもgzip圧縮を有効にしてテスト
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // 地図関連のコードを別チャンクに分離
          'map-components': [
            './app/components/WebGPUMap.tsx',
            './app/components/PrefectureMap.tsx',
            './app/lib/geojson-cache.ts',
            './app/lib/geojson-simplify.ts',
          ],
        },
      },
    },
  },
});
