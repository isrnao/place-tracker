import type { Feature, Geometry } from 'geojson';

/**
 * データを圧縮形式で送信するためのヘルパー
 */
export function compressFeatures(features: Feature[]): CompressedFeature[] {
  return features.map(feature => ({
    id: feature.properties?.id,
    name: feature.properties?.nam_ja,
    visited: feature.properties?.visited || 0,
    total: feature.properties?.total || 0,
    progress: feature.properties?.progress || 0,
    // ジオメトリを簡素化した形で保存
    geometry: compressGeometry(feature.geometry),
  }));
}

interface CompressedFeature {
  id: number;
  name: string;
  visited: number;
  total: number;
  progress: number;
  geometry: CompressedGeometry;
}

interface CompressedGeometry {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: number[]; // フラット化された座標
  indices: number[]; // ポリゴンの境界インデックス
}

function compressGeometry(geometry: Geometry): CompressedGeometry {
  if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0]; // 外周のみ
    const flattened = coords.flatMap((coord: number[]) => [coord[0], coord[1]]);
    return {
      type: 'Polygon',
      coordinates: flattened,
      indices: [0, coords.length],
    };
  } else if (geometry.type === 'MultiPolygon') {
    const allCoords: number[] = [];
    const indices: number[] = [0];

    for (const polygon of geometry.coordinates) {
      const coords = polygon[0]; // 外周のみ
      allCoords.push(
        ...coords.flatMap((coord: number[]) => [coord[0], coord[1]])
      );
      indices.push(allCoords.length / 2);
    }

    return {
      type: 'MultiPolygon',
      coordinates: allCoords,
      indices,
    };
  }

  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

/**
 * 圧縮された Feature を元の Feature 形式に復元
 */
export function decompressFeatures(compressed: CompressedFeature[]): Feature[] {
  return compressed.map(feature => ({
    type: 'Feature' as const,
    properties: {
      id: feature.id,
      nam_ja: feature.name,
      visited: feature.visited,
      total: feature.total,
      progress: feature.progress,
    },
    geometry: decompressGeometry(feature.geometry),
  }));
}

function decompressGeometry(compressed: CompressedGeometry): Geometry {
  if (compressed.type === 'Polygon') {
    const coords: number[][] = [];
    for (let i = 0; i < compressed.coordinates.length; i += 2) {
      coords.push([compressed.coordinates[i], compressed.coordinates[i + 1]]);
    }
    return {
      type: 'Polygon',
      coordinates: [coords],
    };
  } else if (compressed.type === 'MultiPolygon') {
    const polygons: number[][][][] = [];

    for (let i = 0; i < compressed.indices.length - 1; i++) {
      const start = compressed.indices[i] * 2;
      const end = compressed.indices[i + 1] * 2;
      const coords: number[][] = [];

      for (let j = start; j < end; j += 2) {
        coords.push([compressed.coordinates[j], compressed.coordinates[j + 1]]);
      }

      polygons.push([coords]);
    }

    return {
      type: 'MultiPolygon',
      coordinates: polygons,
    };
  }

  throw new Error(`Unsupported geometry type: ${compressed.type}`);
}
