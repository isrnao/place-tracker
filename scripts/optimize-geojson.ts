import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';
import type { FeatureCollection } from 'geojson';
import {
  simplifyGeoJSON,
  minifyGeoJSONProperties,
} from '../app/lib/geojson-simplify';

async function optimizeGeoJSON() {
  const inputPath = resolve('public/japan-prefectures.geojson');
  const outputPath = resolve('public/japan-prefectures-optimized.geojson');

  console.log('Reading original GeoJSON file...');
  const originalContent = await readFile(inputPath, 'utf-8');
  const originalGeo = JSON.parse(originalContent) as FeatureCollection;

  console.log(
    `Original file size: ${Math.round((originalContent.length / 1024 / 1024) * 100) / 100}MB`
  );
  console.log(`Original features count: ${originalGeo.features.length}`);

  console.log('Simplifying geometry...');
  // 座標を簡素化（tolerance値を調整して品質と容量のバランスを取る）
  const simplifiedGeo = simplifyGeoJSON(originalGeo, 0.005); // 0.005度 ≈ 500m

  console.log('Minifying properties...');
  // 不要なプロパティを削除
  const minifiedGeo = minifyGeoJSONProperties(simplifiedGeo);

  const optimizedContent = JSON.stringify(minifiedGeo);

  console.log(
    `Optimized file size: ${Math.round((optimizedContent.length / 1024 / 1024) * 100) / 100}MB`
  );
  console.log(
    `Compression ratio: ${Math.round((1 - optimizedContent.length / originalContent.length) * 100)}%`
  );

  await writeFile(outputPath, optimizedContent);
  console.log(`Optimized file saved to: ${outputPath}`);
}

optimizeGeoJSON().catch(console.error);
