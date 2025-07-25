import React, { useCallback } from 'react';
import { redirect, useLoaderData, useRevalidator } from 'react-router';

import {
  fetchPrefectureProgress,
  getUser,
  createAuthenticatedSupabaseClient,
} from '~/api/supabase.server';
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

    // ❂ キャッシュされたGeoJSONを取得
    const geo = await getGeoJSON();

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
