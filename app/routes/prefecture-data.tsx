import {
  fetchPlacesWithVisit,
  fetchPrefectureProgress,
  fetchCategoryBySlug,
  getUser,
  supabase,
  type CategorySlug,
} from '~/api/supabase.server';
import { redirect } from 'react-router';

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

  if (!userId) {
    throw redirect('/login');
  }

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
  console.log('Action called - userId:', userId);

  if (!userId) {
    throw redirect('/login');
  }

  const formData = await request.formData();
  const placeId = formData.get('placeId') as string;
  const visited = formData.get('visited') === 'true';

  console.log('Toggle visit - placeId:', placeId, 'visited:', visited);

  try {
    if (visited) {
      console.log('Deleting visit record');
      const result = await supabase
        .from('visits')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);
      console.log('Delete result:', result);
    } else {
      console.log('Inserting visit record');
      const result = await supabase
        .from('visits')
        .insert({ user_id: userId, place_id: placeId });
      console.log('Insert result:', result);
    }
    console.log('Visit toggle successful');
    return { ok: true };
  } catch (err) {
    console.error('Error toggling visit:', err);
    return { ok: false, error: err };
  }
}
