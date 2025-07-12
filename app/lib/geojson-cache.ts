import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { FeatureCollection } from 'geojson';
import { simplifyGeoJSON, minifyGeoJSONProperties } from './geojson-simplify';

let geoJsonCache: FeatureCollection | null = null;
let loadingPromise: Promise<FeatureCollection> | null = null;

export async function getGeoJSON(): Promise<FeatureCollection> {
  // 既にキャッシュされている場合はそれを返す
  if (geoJsonCache) {
    return geoJsonCache;
  }

  // 既に読み込み中の場合は、その Promise を返す
  if (loadingPromise) {
    return loadingPromise;
  }

  // 新しく読み込みを開始
  loadingPromise = (async () => {
    // 最適化されたファイルが存在するかチェック
    const optimizedPath = resolve('public/japan-prefectures-optimized.geojson');
    const originalPath = resolve('public/japan-prefectures.geojson');

    let geoJsonPath = optimizedPath;
    let needsOptimization = false;

    try {
      await readFile(optimizedPath, 'utf-8');
    } catch {
      // 最適化されたファイルが存在しない場合は元のファイルを使用
      geoJsonPath = originalPath;
      needsOptimization = true;
    }

    const geoJsonContent = await readFile(geoJsonPath, 'utf-8');
    let geo = JSON.parse(geoJsonContent) as FeatureCollection;

    // 最適化が必要な場合はランタイムで実行
    if (needsOptimization) {
      console.log('Optimizing GeoJSON at runtime...');
      geo = simplifyGeoJSON(geo, 0.005);
      geo = minifyGeoJSONProperties(geo);
    }

    // キャッシュに保存
    geoJsonCache = geo;
    loadingPromise = null;

    return geo;
  })();

  return loadingPromise;
}

// 開発環境でキャッシュをクリアする関数（必要に応じて）
export function clearGeoJSONCache(): void {
  geoJsonCache = null;
  loadingPromise = null;
}
