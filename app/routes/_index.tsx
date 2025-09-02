import React, { useCallback } from 'react';
import { redirect, useLoaderData, useRevalidator } from 'react-router';

import { fetchPrefectureProgress } from '~/api/supabase.server';
import { authenticateRoute } from '~/lib/auth.middleware';
import PrefectureMap from '~/components/PrefectureMap';
import { getGeoJSON } from '~/lib/geojson-cache';
import {
  mergeProgressWithGeoJSON,
  type PrefectureProgress,
} from '~/lib/prefectures';

import type { Route } from './+types/_index';

export function meta(_: Route.MetaArgs) {
  return [
    { title: 'Place Tracker - 日本全国の場所を訪問記録' },
    { name: 'description', content: '日本全国の場所を訪問してマークしよう' },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // 認証ミドルウェアを使用
  const { userId, headers, authenticatedClient } =
    await authenticateRoute(request);

  try {
    // ❶ progress 集計（認証されたクライアントを使用）
    const progress = await fetchPrefectureProgress(
      userId,
      undefined,
      authenticatedClient
    );

    // ❂ キャッシュされたGeoJSONを取得
    const geo = await getGeoJSON();

    const features = mergeProgressWithGeoJSON(
      progress as PrefectureProgress[],
      geo
    );

    return { features };
  } catch (error) {
    console.error('Failed to load prefecture data:', error);
    throw new Response('Failed to load prefecture data', {
      status: 500,
      headers,
    });
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
