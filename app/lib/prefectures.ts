import type { Feature, FeatureCollection } from 'geojson';

export interface PrefectureProgress {
  id: number;
  name: string;
  visited: number;
  total: number;
}

export function mergeProgressWithGeoJSON(
  progress: PrefectureProgress[],
  geo: FeatureCollection
): Feature[] {
  return geo.features.map(f => {
    const p = progress.find(r => r.id === f.properties?.id);
    return {
      ...f,
      properties: {
        ...f.properties,
        visited: p?.visited ?? 0,
        total: p?.total ?? 0,
        progress: p && p.total > 0 ? p.visited / p.total : 0,
      },
    } as Feature;
  });
}

export function createMockFeatures(progress: PrefectureProgress[]): Feature[] {
  return progress.map(
    (p, index) =>
      ({
        type: 'Feature' as const,
        properties: {
          id: p.id,
          nam_ja: p.name,
          visited: p.visited,
          total: p.total,
          progress: p.total > 0 ? p.visited / p.total : 0,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [
            139.7 + ((index % 10) - 5) * 0.5,
            37.5 + Math.floor(index / 10) * 0.5,
          ],
        },
      }) as Feature
  );
}
