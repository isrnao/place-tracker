import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Map, Source, Layer } from "react-map-gl/maplibre";
import { useNavigate } from "react-router";
import type { Feature, FeatureCollection } from "geojson";
import type { MapRef } from "react-map-gl/maplibre";
import type { MapMouseEvent } from "maplibre-gl";

interface PrefectureMapProps {
  features: Feature[];
}

const PrefectureMap: React.FC<PrefectureMapProps> = ({ features }) => {
  const mapRef = useRef<MapRef>(null);
  const navigate = useNavigate();
  const [hoveredFeatureId, setHoveredFeatureId] = useState<string | number | null>(null);

  // 日本の都道府県のIDリスト（1-47）
  const japanPrefectureIds = useMemo(() => Array.from({ length: 47 }, (_, i) => i + 1), []);

  // 日本の都道府県のみフィルタリング
  const japanFeatures = useMemo(() =>
    features.filter(feature =>
      feature.properties?.id && japanPrefectureIds.includes(feature.properties.id)
    ), [features, japanPrefectureIds]
  );

  // GeoJSONコレクションを作成
  const geoJsonData: FeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: japanFeatures,
  }), [japanFeatures]);

  // 進捗度に基づく色の式を生成（メモ化）
  const fillColorExpression = useMemo(() => [
    "case",
    ["==", ["get", "progress"], 0],
    "#f3f4f6", // 薄いグレー（未訪問）
    ["<", ["get", "progress"], 0.3],
    "#fef3c7", // 薄い黄色
    ["<", ["get", "progress"], 0.6],
    "#fed7aa", // オレンジ
    ["<", ["get", "progress"], 0.9],
    "#fca5a5", // 薄い赤
    "#10b981" // 緑
  ] as any, []);

  // ホバー時の色を調整（メモ化）
  const hoverFillColorExpression = useMemo(() => [
    "case",
    ["==", ["get", "id"], hoveredFeatureId || -1],
    "#3b82f6", // 青色でハイライト
    ["==", ["get", "progress"], 0],
    "#f3f4f6", // 薄いグレー（未訪問）
    ["<", ["get", "progress"], 0.3],
    "#fef3c7", // 薄い黄色
    ["<", ["get", "progress"], 0.6],
    "#fed7aa", // オレンジ
    ["<", ["get", "progress"], 0.9],
    "#fca5a5", // 薄い赤
    "#10b981" // 緑
  ] as any, [hoveredFeatureId]);

  // マップクリック処理
  const handleMapClick = useCallback((event: MapMouseEvent) => {
    if (!mapRef.current) return;

    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ["prefecture-fill"],
    });

    if (features.length > 0) {
      const feature = features[0];
      const prefectureId = feature.properties?.id;

      if (prefectureId && japanPrefectureIds.includes(prefectureId)) {
        navigate(`/prefecture/${prefectureId}`);
      }
    }
  }, [navigate, japanPrefectureIds]);

  // マウスホバー処理
  const handleMouseEnter = useCallback((event: MapMouseEvent) => {
    if (!mapRef.current) return;

    const features = mapRef.current.queryRenderedFeatures(event.point, {
      layers: ["prefecture-fill"],
    });

    if (features.length > 0) {
      const feature = features[0];
      const prefectureId = feature.properties?.id;

      if (prefectureId && japanPrefectureIds.includes(prefectureId)) {
        setHoveredFeatureId(prefectureId);
        mapRef.current.getCanvas().style.cursor = "pointer";
      }
    } else {
      setHoveredFeatureId(null);
      mapRef.current.getCanvas().style.cursor = "";
    }
  }, [japanPrefectureIds]);

  const handleMouseLeave = useCallback(() => {
    if (!mapRef.current) return;

    setHoveredFeatureId(null);
    mapRef.current.getCanvas().style.cursor = "";
  }, []);

  // マップスタイルの設定
  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background' as const,
        paint: {
          'background-color': '#a7f3d0' // 明るい青緑（海を表現）
        }
      }
    ]
  }), []);

  return (
    <div className="w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 138.0,
          latitude: 37.0,
          zoom: 5.2,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        onClick={handleMapClick}
        onMouseMove={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        maxBounds={[
          [120.0, 23.0], // 南西角（より広く）
          [148.0, 47.0], // 北東角（北海道の上部と右部により余白を追加）
        ]}
        minZoom={4}
        maxZoom={10}
      >
        <Source id="prefectures" type="geojson" data={geoJsonData}>
          <Layer
            id="prefecture-fill"
            type="fill"
            paint={{
              "fill-color": hoverFillColorExpression,
              "fill-opacity": 0.8,
            }}
          />
          <Layer
            id="prefecture-border"
            type="line"
            paint={{
              "line-color": "#374151",
              "line-width": 1,
            }}
          />
        </Source>

        {/* 凡例 */}
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-10">
          <h3 className="font-semibold text-sm mb-2">訪問進捗</h3>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 rounded border border-gray-300"></div>
              <span>未訪問</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-200 rounded"></div>
              <span>~30%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-200 rounded"></div>
              <span>30-60%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>60-90%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>90%+</span>
            </div>
          </div>
        </div>

        {/* ホバー時の情報表示 */}
        {hoveredFeatureId && (
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
            {(() => {
              const feature = japanFeatures.find(f => f.properties?.id === hoveredFeatureId);
              if (!feature) return null;

              const { nam_ja, visited, total, progress } = feature.properties || {};
              return (
                <div className="text-sm">
                  <h4 className="font-semibold">{nam_ja}</h4>
                  <p className="text-gray-600">
                    {visited || 0} / {total || 0} 訪問済み
                  </p>
                  <p className="text-gray-600">
                    進捗: {Math.round((progress || 0) * 100)}%
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </Map>
    </div>
  );
};

export default PrefectureMap;
