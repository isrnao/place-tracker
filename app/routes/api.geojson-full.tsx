import { getGeoJSON } from '~/lib/geojson-cache';

import type { Route } from './+types/api.geojson-full';

export async function loader({ request: _request }: Route.LoaderArgs) {
  try {
    const geoJson = await getGeoJSON();
    return Response.json(geoJson, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // 1時間キャッシュ
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to load GeoJSON:', error);
    return new Response('Failed to load GeoJSON', { status: 500 });
  }
}
