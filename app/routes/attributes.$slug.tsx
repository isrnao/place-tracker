import { readFile } from 'fs/promises';
import { resolve } from 'path';

import type { FeatureCollection } from 'geojson';
import { useLoaderData } from 'react-router';

import {
  fetchPrefectureProgress,
  fetchCategoryBySlug,
  getUser,
  createAuthenticatedSupabaseClient,
  type CategorySlug,
} from '~/api/supabase.server';
import PrefectureListSidebar from '~/components/PrefectureListSidebar';
import PrefectureMap from '~/components/PrefectureMap';
import {
  mergeProgressWithGeoJSON,
  type PrefectureProgress,
} from '~/lib/prefectures';

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

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await getUser(request);
  const slug = params.slug as CategorySlug | undefined;
  const category = slug ? await fetchCategoryBySlug(slug) : undefined;
  if (!category) {
    throw new Response('Category not found', { status: 404 });
  }
  try {
    // 認証されたSupabaseクライアントを作成
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(request);

    // ❶ progress 集計（認証されたクライアントを使用）
    const progress = await fetchPrefectureProgress(
      userId,
      category.id,
      authenticatedSupabase
    );

    // ❂ GeoJSON ファイル (public/) を読み込む
    const geoJsonPath = resolve('public/japan-prefectures.geojson');
    const geoJsonContent = await readFile(geoJsonPath, 'utf-8');
    const geo = JSON.parse(geoJsonContent) as FeatureCollection;

    const features = mergeProgressWithGeoJSON(
      progress as PrefectureProgress[],
      geo
    );

    return { features, category };
  } catch {
    throw new Response('Failed to load prefecture data', { status: 500 });
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
