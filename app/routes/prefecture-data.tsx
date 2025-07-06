import {
  fetchPlacesWithVisit,
  fetchPrefectureProgress,
  fetchCategoryBySlug,
  getUser,
  supabase,
  type CategorySlug,
} from '~/api/supabase.server';

import type { Route } from './+types/prefecture-data';

// ヘルパー関数: 場所データと進捗データの取得
async function fetchPlacesAndProgress(
  userId: string | null,
  prefectureId: number,
  categoryId?: number
) {
  const places = await fetchPlacesWithVisit(userId, prefectureId, categoryId);
  const progress = await fetchPrefectureProgress(userId, categoryId);
  return {
    places,
    prefecture: progress.find(p => p.id === prefectureId),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getUser(request);
  const url = new URL(request.url);
  const prefectureId = Number(url.searchParams.get('id'));
  const categorySlug = url.searchParams.get('category') as CategorySlug | null;
  const category = categorySlug
    ? await fetchCategoryBySlug(categorySlug)
    : undefined;

  if (!prefectureId) {
    throw new Response('Prefecture ID is required', { status: 400 });
  }

  return await fetchPlacesAndProgress(userId, prefectureId, category?.id);
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getUser(request);
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 });
  }
  const formData = await request.formData();
  const placeId = formData.get('placeId') as string;
  const visited = formData.get('visited') === 'true';

  try {
    if (visited) {
      await supabase
        .from('visits')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);
    } else {
      await supabase
        .from('visits')
        .insert({ user_id: userId, place_id: placeId });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
