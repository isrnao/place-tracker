import type { SupabaseClient } from '@supabase/supabase-js';
import { redirect } from 'react-router';

import {
  fetchPlacesWithVisit,
  fetchCategoryBySlug,
  supabase,
  type CategorySlug,
} from '~/api/supabase.server';
import { authenticateRoute } from '~/lib/auth.middleware';

import type { Route } from './+types/prefecture-data';

// ヘルパー関数: 場所データと進捗データの取得
async function fetchPlacesAndProgress(
  userId: string | null,
  prefectureId: number,
  categoryId?: number,
  authenticatedClient?: SupabaseClient | null
) {
  // 場所データを取得
  const places = await fetchPlacesWithVisit(
    userId,
    prefectureId,
    categoryId,
    authenticatedClient
  );

  // 特定の都道府県の進捗のみを計算（全都道府県を取得しない）
  const client = authenticatedClient || supabase;
  const { data: prefectureData, error } = await client
    .from('prefectures')
    .select('id, name')
    .eq('id', prefectureId)
    .single();

  if (error) throw error;

  // 場所データから進捗を直接計算
  const visited = places.filter(p => p.visited).length;
  const total = places.length;

  const prefecture = {
    id: prefectureData.id,
    name: prefectureData.name,
    visited,
    total,
  };

  return {
    places,
    prefecture,
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  // 改善された認証ミドルウェアを使用
  const { userId, headers, authenticatedClient } =
    await authenticateRoute(request);

  const url = new URL(request.url);
  const prefectureId = Number(url.searchParams.get('id'));
  const categorySlug = url.searchParams.get('category') as CategorySlug | null;
  const category = categorySlug
    ? await fetchCategoryBySlug(categorySlug)
    : undefined;

  if (!prefectureId) {
    throw new Response('Prefecture ID is required', {
      status: 400,
      headers,
    });
  }

  try {
    return await fetchPlacesAndProgress(
      userId,
      prefectureId,
      category?.id,
      authenticatedClient
    );
  } catch (error) {
    console.error('Failed to fetch places and progress:', error);
    throw new Response('Failed to load data', {
      status: 500,
      headers,
    });
  }
}

export async function action({ request }: Route.ActionArgs) {
  // 改善された認証ミドルウェアを使用
  const { userId, authenticatedClient } = await authenticateRoute(request);

  if (!authenticatedClient) {
    return { ok: false, error: 'Failed to create authenticated client' };
  }

  const formData = await request.formData();
  const placeId = formData.get('placeId') as string;
  const visited = formData.get('visited') === 'true';

  try {
    if (visited) {
      // 訪問済みなので、レコードを削除
      const result = await authenticatedClient
        .from('visits')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);

      if (result.error) {
        return { ok: false, error: result.error };
      }
    } else {
      // 未訪問なので、レコードを挿入（重複チェック）

      // 既存のレコードがあるかチェック
      const { data: existingVisit, error: checkError } =
        await authenticatedClient
          .from('visits')
          .select('*')
          .eq('user_id', userId)
          .eq('place_id', placeId)
          .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 は「行が見つからない」エラー
        return { ok: false, error: checkError };
      }

      if (existingVisit) {
        return { ok: true };
      }

      const result = await authenticatedClient
        .from('visits')
        .insert({ user_id: userId, place_id: placeId });

      if (result.error) {
        return { ok: false, error: result.error };
      }
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
