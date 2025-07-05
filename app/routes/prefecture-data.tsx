import { supabase, getMockData, categories } from '~/api/supabase.server';
import type { CategorySlug } from '~/api/supabase.server';

import type { Route } from './+types/prefecture-data';

// ヘルパー関数: 場所データと進捗データの取得
async function fetchPlacesAndProgress(
  prefectureId: number,
  categoryId?: number
) {
  try {
    if (supabase) {
      const { data, error } = await supabase.rpc('places_with_visit', {
        p_prefecture: prefectureId,
        p_category: categoryId ?? null,
      });
      if (error) throw new Error(JSON.stringify(error));
      
      return {
        places: data,
        prefecture: getMockData
          .prefecture_progress(categoryId)
          .find(p => p.id === prefectureId),
      };
    }
    // Supabaseが利用不可の場合、モックデータを使用
    return {
      places: getMockData.places_with_visit(prefectureId, categoryId),
      prefecture: getMockData
        .prefecture_progress(categoryId)
        .find(p => p.id === prefectureId),
    };
  } catch {
    // エラー時のフォールバック: モックデータを使用
    return {
      places: getMockData.places_with_visit(prefectureId, categoryId),
      prefecture: getMockData
        .prefecture_progress(categoryId)
        .find(p => p.id === prefectureId),
    };
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const prefectureId = Number(url.searchParams.get('id'));
  const categorySlug = url.searchParams.get('category') as CategorySlug | null;
  const category = categorySlug
    ? categories.find(c => c.slug === categorySlug)
    : undefined;

  if (!prefectureId) {
    throw new Response('Prefecture ID is required', { status: 400 });
  }

  return await fetchPlacesAndProgress(prefectureId, category?.id);
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const placeId = formData.get('placeId') as string;
  const visited = formData.get('visited') === 'true';

  try {
    if (supabase) {
      if (visited) {
        await supabase.from('visits').delete().eq('place_id', placeId);
      } else {
        await supabase.from('visits').insert({ place_id: placeId });
      }
    } else {
      console.log(
        `Mock: ${visited ? 'Removing' : 'Adding'} visit for place ${placeId}`
      );
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
