import React, { useCallback } from 'react';
import { useLoaderData, useRevalidator } from 'react-router';

import {
  fetchPrefectureProgress,
  fetchCategoryBySlug,
  getUser,
  createAuthenticatedSupabaseClient,
  type CategorySlug,
} from '~/api/supabase.server';
import PrefectureMap from '~/components/PrefectureMap';
import { getGeoJSON } from '~/lib/geojson-cache';
import {
  mergeProgressWithGeoJSON,
  type PrefectureProgress,
} from '~/lib/prefectures';

import type { Route } from './+types/attributes.$slug';

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

    // ❂ キャッシュされたGeoJSONを取得
    const geo = await getGeoJSON();

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
          categorySlug={category.slug}
          categoryName={category.name}
          onDataUpdate={handleDataUpdate}
        />
      </div>
    </main>
  );
}
