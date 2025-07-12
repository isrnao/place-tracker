import type { Feature, FeatureCollection } from 'geojson';

/**
 * Douglas-Peucker アルゴリズムを使って座標を簡素化
 * @param points 座標点の配列 [[lng, lat], [lng, lat], ...]
 * @param tolerance 簡素化の許容値（度単位）
 */
function douglasPeucker(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;

  // 最初と最後の点を結ぶ直線
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  let maxDistance = 0;
  let maxIndex = 0;

  // 各点と直線の距離を計算
  for (let i = 1; i < points.length - 1; i++) {
    const distance = pointToLineDistance(points[i], firstPoint, lastPoint);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // 最大距離が許容値以下なら、最初と最後の点のみ返す
  if (maxDistance <= tolerance) {
    return [firstPoint, lastPoint];
  }

  // 再帰的に簡素化
  const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
  const right = douglasPeucker(points.slice(maxIndex), tolerance);

  // 重複する中間点を除去
  return [...left.slice(0, -1), ...right];
}

/**
 * 点と直線の距離を計算
 */
function pointToLineDistance(
  point: number[],
  lineStart: number[],
  lineEnd: number[]
): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    // 直線が点の場合
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);

  if (t < 0) {
    // 最も近い点が線分の開始点
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  } else if (t > 1) {
    // 最も近い点が線分の終了点
    return Math.sqrt((px - x2) ** 2 + (py - y2) ** 2);
  } else {
    // 最も近い点が線分上
    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }
}

/**
 * Polygon の座標を簡素化（改良版）
 */
function simplifyPolygonCoordinates(
  coordinates: number[][][],
  tolerance: number = 0.01
): number[][][] {
  return coordinates.map(ring => {
    const simplified = douglasPeucker(ring, tolerance);

    // ポリゴンは閉じる必要がある
    if (
      simplified.length > 0 &&
      (simplified[0][0] !== simplified[simplified.length - 1][0] ||
        simplified[0][1] !== simplified[simplified.length - 1][1])
    ) {
      simplified.push([simplified[0][0], simplified[0][1]]);
    }

    return simplified;
  });
}

/**
 * MultiPolygon の座標を簡素化
 */
function simplifyMultiPolygonCoordinates(
  coordinates: number[][][][],
  tolerance: number = 0.01
): number[][][][] {
  return coordinates.map(polygon =>
    simplifyPolygonCoordinates(polygon, tolerance)
  );
}

/**
 * GeoJSON Feature を簡素化
 */
function simplifyFeature(feature: Feature, tolerance: number = 0.01): Feature {
  if (feature.geometry.type === 'Polygon') {
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: simplifyPolygonCoordinates(
          feature.geometry.coordinates,
          tolerance
        ),
      },
    };
  } else if (feature.geometry.type === 'MultiPolygon') {
    return {
      ...feature,
      geometry: {
        ...feature.geometry,
        coordinates: simplifyMultiPolygonCoordinates(
          feature.geometry.coordinates,
          tolerance
        ),
      },
    };
  }

  return feature; // その他のジオメトリタイプはそのまま
}

/**
 * GeoJSON FeatureCollection を簡素化
 * @param geojson 元のGeoJSON
 * @param tolerance 簡素化の許容値（度単位、デフォルト: 0.01 ≈ 1km）
 */
export function simplifyGeoJSON(
  geojson: FeatureCollection,
  tolerance: number = 0.01
): FeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map(feature =>
      simplifyFeature(feature, tolerance)
    ),
  };
}

/**
 * プロパティを最小限に絞る
 */
export function minifyGeoJSONProperties(
  geojson: FeatureCollection
): FeatureCollection {
  return {
    ...geojson,
    features: geojson.features.map(feature => {
      // デバッグ用ログ
      if (!feature.properties?.nam_ja) {
        console.warn('Missing nam_ja for feature:', feature.properties);
      }

      return {
        ...feature,
        properties: {
          id: feature.properties?.id,
          nam_ja: feature.properties?.nam_ja,
          nam: feature.properties?.nam, // 念のため英語名も保持
          // その他の不要なプロパティは除去
        },
      };
    }),
  };
}
