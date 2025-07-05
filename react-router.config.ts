import type { Config } from "@react-router/dev/config";

export default {
  // Framework Mode - ファイルベースルーティングを有効化
  ssr: true,
  // ファイルベースルーティングを使用（routes.tsは不要）
  // ファイル名がそのままルートになる
} satisfies Config;
