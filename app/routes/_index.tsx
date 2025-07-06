import { readFile } from 'fs/promises';
import { resolve } from 'path';

import type { FeatureCollection } from 'geojson';
import { useCallback } from 'react';
import { redirect, useLoaderData, useRevalidator } from 'react-router';

import {
  fetchPrefectureProgress,
  getUser,
  createAuthenticatedSupabaseClient,
} from '~/api/supabase.server';
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

  const handleDataUpdate = useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  return (
    <main className='relative flex h-screen'>
      {/* メインコンテンツ - マップ */}
      <div className='relative flex-1'>
        <PrefectureMap
          features={features}
          categoryName='全体'
          onDataUpdate={handleDataUpdate}
        />
      </div>
    </main>
  );
}
