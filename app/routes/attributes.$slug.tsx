import { readFile } from 'fs/promises';
import { resolve } from 'path';

import type { FeatureCollection, Feature } from 'geojson';
import { useLoaderData } from 'react-router';

import { supabase, getMockData, categories } from '~/api/supabase.server';
import type { CategorySlug } from '~/api/supabase.server';
import PrefectureListSidebar from '~/components/PrefectureListSidebar';
import PrefectureMap from '~/components/PrefectureMap';

import type { Route } from './+types/attributes.$slug';

import 'maplibre-gl/dist/maplibre-gl.css';

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: `${data?.category.name} - Place Tracker` },
    {
      name: 'description',
      content: `${data?.category.name}の訪問場所を管理`,
    },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug as CategorySlug | undefined;
  const category = slug ? categories.find(c => c.slug === slug) : undefined;
  if (!category) {
    throw new Response('Category not found', { status: 404 });
  }
  try {
    // ❶ progress 集計
    const progress = supabase
      ? ((
          await supabase.rpc('prefecture_progress', { p_category: category.id })
        ).data ?? getMockData.prefecture_progress(category.id))
      : getMockData.prefecture_progress(category.id);

    // ❂ GeoJSON ファイル (public/) を読み込む
    const geoJsonPath = resolve('public/japan-prefectures.geojson');
    const geoJsonContent = await readFile(geoJsonPath, 'utf-8');
    const geo = JSON.parse(geoJsonContent) as FeatureCollection;

    // progress を GeoJSON Feature にマージ
    interface PrefectureProgress {
      id: number;
      name: string;
      visited: number;
      total: number;
    }

    const features = geo.features.map((f: Feature) => {
      const p = progress.find(
        (r: PrefectureProgress) => r.id === f.properties?.id
      );
      return {
        ...f,
        properties: {
          ...f.properties,
          visited: p?.visited ?? 0,
          total: p?.total ?? 0,
          progress: p && p.total > 0 ? p.visited / p.total : 0,
        },
      };
    });

    return { features, category };
  } catch {
    // Fallback: モックデータのみ使用
    const progress = getMockData.prefecture_progress(category.id);
    const features = progress.map(
      (p, index) =>
        ({
          type: 'Feature' as const,
          properties: {
            id: p.id,
            nam_ja: p.name,
            visited: p.visited,
            total: p.total,
            progress: p.total > 0 ? p.visited / p.total : 0,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [
              139.7 + ((index % 10) - 5) * 0.5,
              37.5 + Math.floor(index / 10) * 0.5,
            ],
          },
        }) as Feature
    );

    return { features, category };
  }
}

export default function Home() {
  const { features, category } = useLoaderData<typeof loader>();

  // 都道府県リスト用のデータを準備
  interface PrefectureProperties {
    id: number;
    nam_ja: string;
    visited: number;
    total: number;
    progress: number;
  }

  const prefectureList = features
    .filter(f => f.properties?.id && f.properties?.nam_ja)
    .map(f => {
      const props = f.properties as PrefectureProperties;
      return {
        id: props.id,
        name: props.nam_ja,
        visited: props.visited || 0,
        total: props.total || 0,
        progress: props.progress || 0,
      };
    })
    .sort((a, b) => a.id - b.id);

  return (
    <main className='relative flex h-screen'>
      {/* 左サイドバー - 都道府県リスト */}
      <PrefectureListSidebar prefectures={prefectureList} />

      {/* 右側 - マップ */}
      <div className='relative flex-1'>
        <PrefectureMap features={features} categorySlug={category.slug} />
      </div>
    </main>
  );
}
