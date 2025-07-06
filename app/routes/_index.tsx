import { readFile } from 'fs/promises';
import { resolve } from 'path';

import type { FeatureCollection } from 'geojson';
import { redirect, useLoaderData, useRevalidator } from 'react-router';

import {
  fetchPrefectureProgress,
  getUser,
  createAuthenticatedSupabaseClient,
} from '~/api/supabase.server';
import PrefectureListSidebar from '~/components/PrefectureListSidebar';
import PrefectureMap from '~/components/PrefectureMap';
import {
  mergeProgressWithGeoJSON,
  type PrefectureProgress,
} from '~/lib/prefectures';

import type { Route } from './+types/_index';

import 'maplibre-gl/dist/maplibre-gl.css';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Place Tracker - 日本全国の場所を訪問記録' },
    { name: 'description', content: '日本全国の場所を訪問してマークしよう' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUser(request);

  if (!userId) {
    throw redirect('/login');
  }

  try {
    // 認証されたSupabaseクライアントを作成
    const authenticatedSupabase =
      await createAuthenticatedSupabaseClient(request);

    // ❶ progress 集計（認証されたクライアントを使用）
    const progress = await fetchPrefectureProgress(
      userId,
      undefined,
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

    return { features };
  } catch {
    throw new Response('Failed to load prefecture data', { status: 500 });
  }
}

export default function Home() {
  const { features } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();

  const handleDataUpdate = () => {
    revalidator.revalidate();
  };

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
        <PrefectureMap features={features} onDataUpdate={handleDataUpdate} />
      </div>
    </main>
  );
}
