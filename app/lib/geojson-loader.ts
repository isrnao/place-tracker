import { getGeoJSON } from '~/lib/geojson-cache';

// シンプルな都道府県情報（境界データなし）
interface SimplePrefecture {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

// 基本的な都道府県データ（ハードコード）
const BASIC_PREFECTURES: SimplePrefecture[] = [
  { id: 1, name: '北海道', latitude: 43.2, longitude: 142.8 },
  { id: 2, name: '青森県', latitude: 40.8, longitude: 140.7 },
  { id: 3, name: '岩手県', latitude: 39.7, longitude: 141.1 },
  { id: 4, name: '宮城県', latitude: 38.3, longitude: 140.9 },
  { id: 5, name: '秋田県', latitude: 39.7, longitude: 140.1 },
  { id: 6, name: '山形県', latitude: 38.2, longitude: 140.3 },
  { id: 7, name: '福島県', latitude: 37.8, longitude: 140.5 },
  { id: 8, name: '茨城県', latitude: 36.3, longitude: 140.4 },
  { id: 9, name: '栃木県', latitude: 36.6, longitude: 139.9 },
  { id: 10, name: '群馬県', latitude: 36.4, longitude: 139.1 },
  { id: 11, name: '埼玉県', latitude: 35.9, longitude: 139.6 },
  { id: 12, name: '千葉県', latitude: 35.6, longitude: 140.1 },
  { id: 13, name: '東京都', latitude: 35.7, longitude: 139.7 },
  { id: 14, name: '神奈川県', latitude: 35.4, longitude: 139.6 },
  { id: 15, name: '新潟県', latitude: 37.9, longitude: 139.0 },
  { id: 16, name: '富山県', latitude: 36.7, longitude: 137.2 },
  { id: 17, name: '石川県', latitude: 36.6, longitude: 136.6 },
  { id: 18, name: '福井県', latitude: 36.1, longitude: 136.2 },
  { id: 19, name: '山梨県', latitude: 35.7, longitude: 138.6 },
  { id: 20, name: '長野県', latitude: 36.2, longitude: 138.2 },
  { id: 21, name: '岐阜県', latitude: 35.4, longitude: 137.0 },
  { id: 22, name: '静岡県', latitude: 34.9, longitude: 138.4 },
  { id: 23, name: '愛知県', latitude: 35.2, longitude: 137.0 },
  { id: 24, name: '三重県', latitude: 34.7, longitude: 136.5 },
  { id: 25, name: '滋賀県', latitude: 35.0, longitude: 135.9 },
  { id: 26, name: '京都府', latitude: 35.0, longitude: 135.8 },
  { id: 27, name: '大阪府', latitude: 34.7, longitude: 135.5 },
  { id: 28, name: '兵庫県', latitude: 34.7, longitude: 135.2 },
  { id: 29, name: '奈良県', latitude: 34.7, longitude: 135.8 },
  { id: 30, name: '和歌山県', latitude: 34.2, longitude: 135.2 },
  { id: 31, name: '鳥取県', latitude: 35.5, longitude: 134.2 },
  { id: 32, name: '島根県', latitude: 35.5, longitude: 133.1 },
  { id: 33, name: '岡山県', latitude: 34.7, longitude: 133.9 },
  { id: 34, name: '広島県', latitude: 34.4, longitude: 132.5 },
  { id: 35, name: '山口県', latitude: 34.2, longitude: 131.5 },
  { id: 36, name: '徳島県', latitude: 34.1, longitude: 134.6 },
  { id: 37, name: '香川県', latitude: 34.3, longitude: 134.0 },
  { id: 38, name: '愛媛県', latitude: 33.8, longitude: 132.8 },
  { id: 39, name: '高知県', latitude: 33.6, longitude: 133.5 },
  { id: 40, name: '福岡県', latitude: 33.6, longitude: 130.4 },
  { id: 41, name: '佐賀県', latitude: 33.2, longitude: 130.3 },
  { id: 42, name: '長崎県', latitude: 32.8, longitude: 129.9 },
  { id: 43, name: '熊本県', latitude: 32.8, longitude: 130.7 },
  { id: 44, name: '大分県', latitude: 33.2, longitude: 131.6 },
  { id: 45, name: '宮崎県', latitude: 31.9, longitude: 131.4 },
  { id: 46, name: '鹿児島県', latitude: 31.6, longitude: 130.6 },
  { id: 47, name: '沖縄県', latitude: 26.2, longitude: 127.7 },
];

export { BASIC_PREFECTURES };
export { getGeoJSON };
