import { createClient } from '@supabase/supabase-js';

// 開発用のデフォルト値を設定
const supabaseUrl = process.env.SUPABASE_URL || 'https://localhost:3000';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'demo-key';

// 実際のSupabaseプロジェクトがない場合は、モックデータを使用
const hasValidSupabaseConfig =
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_URL.startsWith('https://') &&
  process.env.SUPABASE_URL !== 'your_supabase_url_here';

// SSR: pull keys from process.env (Vercel Edge uses the same)
export const supabase = hasValidSupabaseConfig
  ? createClient(
      supabaseUrl,
      supabaseAnonKey,
      { auth: { persistSession: false } } // no localStorage on server
    )
  : null;

// モックデータの関数
export const getMockData = {
  prefecture_progress: () => [
    { id: 1, name: '北海道', visited: 15, total: 25 },
    { id: 2, name: '青森県', visited: 3, total: 8 },
    { id: 3, name: '岩手県', visited: 2, total: 7 },
    { id: 4, name: '宮城県', visited: 4, total: 9 },
    { id: 5, name: '秋田県', visited: 1, total: 6 },
    { id: 6, name: '山形県', visited: 2, total: 7 },
    { id: 7, name: '福島県', visited: 3, total: 8 },
    { id: 8, name: '茨城県', visited: 2, total: 6 },
    { id: 9, name: '栃木県', visited: 3, total: 7 },
    { id: 10, name: '群馬県', visited: 2, total: 6 },
    { id: 11, name: '埼玉県', visited: 5, total: 10 },
    { id: 12, name: '千葉県', visited: 6, total: 11 },
    { id: 13, name: '東京都', visited: 12, total: 20 },
    { id: 14, name: '神奈川県', visited: 8, total: 15 },
    { id: 15, name: '新潟県', visited: 3, total: 8 },
    { id: 16, name: '富山県', visited: 2, total: 5 },
    { id: 17, name: '石川県', visited: 3, total: 6 },
    { id: 18, name: '福井県', visited: 1, total: 4 },
    { id: 19, name: '山梨県', visited: 2, total: 5 },
    { id: 20, name: '長野県', visited: 4, total: 9 },
    { id: 21, name: '岐阜県', visited: 2, total: 6 },
    { id: 22, name: '静岡県', visited: 5, total: 9 },
    { id: 23, name: '愛知県', visited: 7, total: 12 },
    { id: 24, name: '三重県', visited: 3, total: 7 },
    { id: 25, name: '滋賀県', visited: 2, total: 5 },
    { id: 26, name: '京都府', visited: 8, total: 14 },
    { id: 27, name: '大阪府', visited: 9, total: 16 },
    { id: 28, name: '兵庫県', visited: 6, total: 11 },
    { id: 29, name: '奈良県', visited: 4, total: 8 },
    { id: 30, name: '和歌山県', visited: 2, total: 6 },
    { id: 31, name: '鳥取県', visited: 1, total: 4 },
    { id: 32, name: '島根県', visited: 2, total: 5 },
    { id: 33, name: '岡山県', visited: 3, total: 7 },
    { id: 34, name: '広島県', visited: 4, total: 8 },
    { id: 35, name: '山口県', visited: 2, total: 6 },
    { id: 36, name: '徳島県', visited: 1, total: 4 },
    { id: 37, name: '香川県', visited: 2, total: 5 },
    { id: 38, name: '愛媛県', visited: 3, total: 6 },
    { id: 39, name: '高知県', visited: 2, total: 5 },
    { id: 40, name: '福岡県', visited: 6, total: 11 },
    { id: 41, name: '佐賀県', visited: 1, total: 4 },
    { id: 42, name: '長崎県', visited: 3, total: 7 },
    { id: 43, name: '熊本県', visited: 4, total: 8 },
    { id: 44, name: '大分県', visited: 2, total: 6 },
    { id: 45, name: '宮崎県', visited: 2, total: 5 },
    { id: 46, name: '鹿児島県', visited: 3, total: 7 },
    { id: 47, name: '沖縄県', visited: 4, total: 9 },
  ],
  places_with_visit: (prefecture_id: number) => {
    const prefectureNames = [
      '北海道',
      '青森県',
      '岩手県',
      '宮城県',
      '秋田県',
      '山形県',
      '福島県',
      '茨城県',
      '栃木県',
      '群馬県',
      '埼玉県',
      '千葉県',
      '東京都',
      '神奈川県',
      '新潟県',
      '富山県',
      '石川県',
      '福井県',
      '山梨県',
      '長野県',
      '岐阜県',
      '静岡県',
      '愛知県',
      '三重県',
      '滋賀県',
      '京都府',
      '大阪府',
      '兵庫県',
      '奈良県',
      '和歌山県',
      '鳥取県',
      '島根県',
      '岡山県',
      '広島県',
      '山口県',
      '徳島県',
      '香川県',
      '愛媛県',
      '高知県',
      '福岡県',
      '佐賀県',
      '長崎県',
      '熊本県',
      '大分県',
      '宮崎県',
      '鹿児島県',
      '沖縄県',
    ];

    const prefectureName = prefectureNames[prefecture_id - 1] || '不明';

    return [
      {
        id: prefecture_id * 100 + 1,
        name: `${prefectureName}の主要駅`,
        visited: false,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 2,
        name: `${prefectureName}の有名寺院`,
        visited: true,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 3,
        name: `${prefectureName}の観光地`,
        visited: false,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 4,
        name: `${prefectureName}の公園`,
        visited: true,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 5,
        name: `${prefectureName}の博物館`,
        visited: false,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 6,
        name: `${prefectureName}の城跡`,
        visited: true,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 7,
        name: `${prefectureName}の温泉`,
        visited: false,
        prefecture_id,
      },
      {
        id: prefecture_id * 100 + 8,
        name: `${prefectureName}の展望台`,
        visited: false,
        prefecture_id,
      },
    ];
  },
};
