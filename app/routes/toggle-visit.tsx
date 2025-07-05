import { supabase } from '~/api/supabase.server';

export async function action({ request }: { request: Request }) {
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
      // モックの場合は成功をシミュレート
      console.log(
        `Mock: ${visited ? 'Removing' : 'Adding'} visit for place ${placeId}`
      );
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err };
  }
}
