# Place Tracker

React Router v7 + Supabase + TanStack Query を使用したSSR対応の場所追跡アプリケーション

## 機能

- **ファイルベースルーティング**: React Router v7の最新機能を使用
- **SSR対応**: サーバーサイドレンダリングとクライアントサイドレンダリングの両方をサポート
- **Supabase統合**: リアルタイムデータベース操作
- **TanStack Query**: 効率的なデータフェッチとキャッシュ
- **TypeScript**: 完全な型安全性
- **Tailwind CSS**: モダンなUI
- **属性別管理ページ**: `/attributes/:slug` でカテゴリーごとの場所を管理

### Categories

利用可能なカテゴリの一覧:

| slug          | 日本語名 |
| ------------- | -------- |
| `stations`    | 主要駅   |
| `temples`     | 有名寺院 |
| `sightseeing` | 観光地   |
| `parks`       | 公園     |
| `museums`     | 博物館   |
| `castles`     | 城跡     |
| `hot-springs` | 温泉     |
| `viewpoints`  | 展望台   |

## セットアップ

1. 依存関係のインストール:

   ```bash
   pnpm install
   ```

2. 環境変数の設定:
   `.env`ファイルを作成し、以下を設定:

   ```env
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. 開発サーバーの起動:

   ```bash
   # React Router dev server
   pnpm dev

   # または Express SSR server
   pnpm dev:server
   ```

## ビルド

```bash
# クライアントビルド
pnpm build

# サーバービルド
pnpm build:server

# 本番サーバー起動
pnpm start:server
```

## デプロイ

### Vercelデプロイ

1. **Vercelアカウント設定**:
   - [Vercel](https://vercel.com)にサインアップ
   - GitHubリポジトリを接続

2. **環境変数設定**:
   Vercelダッシュボードで以下の環境変数を設定:

   ```env
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

3. **デプロイ**:

   ```bash
   # Vercel CLIを使用する場合
   pnpm i -g vercel
   vercel --prod
   ```

   または、GitHub連携による自動デプロイ

4. **設定ファイル**:
   - `vercel.json`: Vercelデプロイ設定
   - `api/ssr.js`: SSRエントリーポイント

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `pnpm run build`

```
├── package.json
├── pnpm-lock.yaml
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

Built with ❤️ using React Router.
