import type { Feature } from 'geojson';
import React, { useState, useEffect } from 'react';

import PrefectureMap from './PrefectureMap';

interface ProgressivePrefectureMapProps {
  initialFeatures: Feature[];
  categorySlug?: string;
  categoryName?: string;
  onDataUpdate?: () => void;
}

function ProgressivePrefectureMap({
  initialFeatures,
  categorySlug,
  categoryName,
  onDataUpdate,
}: ProgressivePrefectureMapProps) {
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const [isLoadingFullGeometry, setIsLoadingFullGeometry] = useState(false);

  // 完全なGeoJSONを遅延読み込み
  useEffect(() => {
    const loadFullGeometry = async () => {
      if (isLoadingFullGeometry) return;

      setIsLoadingFullGeometry(true);

      try {
        // 非同期でフル GeoJSON を取得
        const response = await fetch('/api/geojson-full');
        const fullGeoJson = await response.json();

        // 進捗データとマージ
        const enhancedFeatures = fullGeoJson.features.map(
          (feature: Feature) => {
            const matchingInitial = initialFeatures.find(
              f => f.properties?.id === feature.properties?.id
            );
            return matchingInitial
              ? { ...feature, properties: matchingInitial.properties }
              : feature;
          }
        );

        setFeatures(enhancedFeatures);
      } catch (error) {
        console.error('Failed to load full geometry:', error);
        // エラーの場合は初期データを継続使用
      } finally {
        setIsLoadingFullGeometry(false);
      }
    };

    // 少し遅延してからフルジオメトリを読み込み
    const timer = setTimeout(loadFullGeometry, 100);
    return () => clearTimeout(timer);
  }, [initialFeatures, isLoadingFullGeometry]);

  return (
    <PrefectureMap
      features={features}
      categorySlug={categorySlug}
      categoryName={categoryName}
      onDataUpdate={onDataUpdate}
    />
  );
}

export default ProgressivePrefectureMap;
