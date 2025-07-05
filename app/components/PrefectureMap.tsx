import type { Feature, FeatureCollection } from 'geojson';
import type { MapMouseEvent } from 'maplibre-gl';
import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';
import { Map, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';

import PrefectureModal from './PrefectureModal';

// 都道府県の中心座標を計算する関数
const calculateCentroid = (feature: Feature): [number, number] => {
  if (feature.geometry.type === 'Polygon') {
    const coords = feature.geometry.coordinates[0];
    let x = 0,
      y = 0;
    for (const coord of coords) {
      x += coord[0];
      y += coord[1];
    }
    return [x / coords.length, y / coords.length];
  } else if (feature.geometry.type === 'MultiPolygon') {
    // 最大の多角形の中心を使用
    const polygons = feature.geometry.coordinates;
    let largest = polygons[0];
    let largestArea = 0;

    for (const polygon of polygons) {
      const area = polygon[0].length;
      if (area > largestArea) {
        largestArea = area;
        largest = polygon;
      }
    }

    const coords = largest[0];
    let x = 0,
      y = 0;
    for (const coord of coords) {
      x += coord[0];
      y += coord[1];
    }
    return [x / coords.length, y / coords.length];
  }
  return [0, 0];
};

interface PrefectureMapProps {
  features: Feature[];
  categorySlug?: string;
}

const PrefectureMap: React.FC<PrefectureMapProps> = ({
  features,
  categorySlug,
}) => {
  const mapRef = useRef<MapRef>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<
    string | number | null
  >(null);
  const [currentZoom, setCurrentZoom] = useState(5.2);
  const [mapLoaded, setMapLoaded] = useState(false);

  // モーダル関連のstate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPrefecture, setSelectedPrefecture] = useState<{
    id: number;
    name: string;
    visited: number;
    total: number;
  } | null>(null);
  const [modalPlaces, setModalPlaces] = useState<Array<{
    id: number;
    name: string;
    visited: boolean;
  }> | null>(null);

  // 日本の都道府県のIDリスト（1-47）
  const japanPrefectureIds = useMemo(
    () => Array.from({ length: 47 }, (_, i) => i + 1),
    []
  );

  // 日本の都道府県のみフィルタリング
  const japanFeatures = useMemo(
    () =>
      features.filter(
        feature =>
          feature.properties?.id &&
          japanPrefectureIds.includes(feature.properties.id)
      ),
    [features, japanPrefectureIds]
  );

  // 都道府県の中心座標とラベル情報を計算
  const prefectureLabels = useMemo(() => {
    return japanFeatures.map(feature => {
      const [lng, lat] = calculateCentroid(feature);
      return {
        id: feature.properties?.id,
        name: feature.properties?.nam_ja,
        longitude: lng,
        latitude: lat,
      };
    });
  }, [japanFeatures]);

  // ラベルの画面座標を計算
  const [labelPositions, setLabelPositions] = useState<
    Array<{
      id: number;
      name: string;
      x: number;
      y: number;
    }>
  >([]);

  // rAF throttling用のref
  const rafId = useRef<number | null>(null);

  // ラベル位置を更新する関数（メモ化 + early exit）
  const updateLabelPositions = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const nextPositions = prefectureLabels
      .map(label => {
        if (!map) return null;

        const point = map.project([label.longitude, label.latitude]);
        return {
          id: label.id,
          name: label.name || '',
          x: point.x,
          y: point.y,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // 値が変わったときだけsetStateを実行（パフォーマンス最適化）
    setLabelPositions(prev => {
      if (prev.length !== nextPositions.length) return nextPositions;

      const hasChanged = prev.some((p, i) => {
        const next = nextPositions[i];
        return p.x !== next.x || p.y !== next.y || p.id !== next.id;
      });

      return hasChanged ? nextPositions : prev;
    });
  }, [mapLoaded, prefectureLabels]);

  // rAFベースのthrottle処理（1フレームにつき1回）
  const queueLabelUpdate = useCallback(() => {
    if (rafId.current === null) {
      rafId.current = requestAnimationFrame(() => {
        updateLabelPositions();
        rafId.current = null;
      });
    }
  }, [updateLabelPositions]);

  // マップが読み込まれた時の処理
  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
    queueLabelUpdate();
  }, [queueLabelUpdate]);

  // 初期化時とデータ変更時にラベル位置を更新
  useEffect(() => {
    if (mapLoaded) {
      queueLabelUpdate();
    }
  }, [mapLoaded, queueLabelUpdate]);

  // ブラウザリサイズ時にもラベル位置を再計算
  useLayoutEffect(() => {
    const handleResize = () => queueLabelUpdate();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      // コンポーネントアンマウント時にrAFをクリーンアップ
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
  }, [queueLabelUpdate]);

  // GeoJSONコレクションを作成
  const geoJsonData: FeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: japanFeatures,
    }),
    [japanFeatures]
  );

  // 進捗度に基づく色の式を生成（メモ化）

  // 都道府県の詳細データを取得する関数
  const fetchPrefectureData = useCallback(
    async (prefectureId: number) => {
      try {
        const params = new URLSearchParams({ id: String(prefectureId) });
        if (categorySlug) params.set('category', categorySlug);
        const response = await fetch(`/prefecture-data?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        return data;
      } catch (err) {
        console.error('Error fetching prefecture data:', err);
        return { places: [], prefecture: null };
      }
    },
    [categorySlug]
  );

  // 訪問状態を切り替える関数
  const handleToggleVisit = useCallback(
    async (placeId: number, visited: boolean) => {
      try {
        const formData = new FormData();
        formData.append('placeId', placeId.toString());
        formData.append('visited', visited.toString());

        const response = await fetch('/prefecture-data', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to toggle visit');

        // データを再取得してモーダルを更新
        if (selectedPrefecture) {
          const { places, prefecture } = await fetchPrefectureData(
            selectedPrefecture.id
          );
          setModalPlaces(places);
          if (prefecture) {
            setSelectedPrefecture(prefecture);
          }
        }
      } catch (err) {
        console.error('Error toggling visit:', err);
      }
    },
    [selectedPrefecture, fetchPrefectureData]
  );

  // マップクリック処理
  const handleMapClick = useCallback(
    async (event: MapMouseEvent) => {
      if (!mapRef.current) return;

      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: ['prefecture-fill'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const prefectureId = feature.properties?.id;

        if (prefectureId && japanPrefectureIds.includes(prefectureId)) {
          // 都道府県データを取得してモーダルを開く
          const { places, prefecture } =
            await fetchPrefectureData(prefectureId);
          if (prefecture) {
            setSelectedPrefecture(prefecture);
            setModalPlaces(places);
            setIsModalOpen(true);
          }
        }
      }
    },
    [japanPrefectureIds, fetchPrefectureData]
  );

  // マウスホバー処理
  const handleMouseEnter = useCallback(
    (event: MapMouseEvent) => {
      if (!mapRef.current) return;

      const features = mapRef.current.queryRenderedFeatures(event.point, {
        layers: ['prefecture-fill'],
      });

      if (features.length > 0) {
        const feature = features[0];
        const prefectureId = feature.properties?.id;

        if (prefectureId && japanPrefectureIds.includes(prefectureId)) {
          setHoveredFeatureId(prefectureId);
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      } else {
        setHoveredFeatureId(null);
        mapRef.current.getCanvas().style.cursor = '';
      }
    },
    [japanPrefectureIds]
  );

  const handleMouseLeave = useCallback(() => {
    if (!mapRef.current) return;

    setHoveredFeatureId(null);
    mapRef.current.getCanvas().style.cursor = '';
  }, []);

  // マップの移動・ズーム時の処理（throttled）
  const handleMove = useCallback(() => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom();
    setCurrentZoom(zoom);
    queueLabelUpdate(); // throttledな更新
  }, [queueLabelUpdate]);

  // マップスタイルの設定
  const mapStyle = useMemo(
    () => ({
      version: 8 as const,
      sources: {},
      layers: [
        {
          id: 'background',
          type: 'background' as const,
          paint: {
            'background-color': '#a7f3d0', // 明るい青緑（海を表現）
          },
        },
      ],
    }),
    []
  );

  // 都道府県リストからモーダルを開く関数
  const openPrefectureModal = useCallback(
    async (prefectureId: number) => {
      const { places, prefecture } = await fetchPrefectureData(prefectureId);
      if (prefecture) {
        setSelectedPrefecture(prefecture);
        setModalPlaces(places);
        setIsModalOpen(true);
      }
    },
    [fetchPrefectureData]
  );

  // 都道府県リストのクリックイベントリスナーを設定
  useEffect(() => {
    const handlePrefectureListClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const listItem = target.closest('.prefecture-list-item');
      if (listItem) {
        const prefectureId = parseInt(
          listItem.getAttribute('data-prefecture-id') || '0'
        );
        if (prefectureId) {
          openPrefectureModal(prefectureId);
        }
      }
    };

    document.addEventListener('click', handlePrefectureListClick);
    return () => {
      document.removeEventListener('click', handlePrefectureListClick);
    };
  }, [openPrefectureModal]);

  return (
    <div className='h-full w-full'>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 138.0,
          latitude: 37.0,
          zoom: 5.2,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onClick={handleMapClick}
        onMouseMove={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onMove={handleMove}
        onLoad={handleMapLoad}
        maxBounds={[
          [120.0, 23.0], // 南西角（より広く）
          [150.0, 47.0], // 北東角（北海道の右上部により余白を追加）
        ]}
        minZoom={4}
        maxZoom={10}
      >
        <Source id='prefectures' type='geojson' data={geoJsonData}>
          <Layer
            id='prefecture-fill'
            type='fill'
            paint={{
              'fill-color': [
                'case',
                ['==', ['get', 'id'], hoveredFeatureId || -1],
                '#3b82f6', // 青色でハイライト
                ['==', ['get', 'progress'], 0],
                '#f3f4f6', // 薄いグレー（未訪問）
                ['<', ['get', 'progress'], 0.3],
                '#fef3c7', // 薄い黄色
                ['<', ['get', 'progress'], 0.6],
                '#fed7aa', // オレンジ
                ['<', ['get', 'progress'], 0.9],
                '#fca5a5', // 薄い赤
                '#10b981', // 緑
              ],
              'fill-opacity': 0.8,
            }}
          />
          <Layer
            id='prefecture-border'
            type='line'
            paint={{
              'line-color': '#374151',
              'line-width': 1,
            }}
          />
        </Source>

        {/* 都道府県名をHTMLオーバーレイで表示 */}
        {currentZoom >= 4.5 &&
          labelPositions.map(label => {
            if (!label.name) return null;

            const fontSize = Math.max(10, Math.min(18, currentZoom * 2.5));

            return (
              <div
                key={label.id}
                className='pointer-events-none absolute select-none'
                style={{
                  left: label.x - 50,
                  top: label.y - 10,
                  width: 100,
                  textAlign: 'center',
                  fontSize: `${fontSize}px`,
                  color: '#1f2937',
                  fontWeight: 'bold',
                  textShadow:
                    '1px 1px 2px rgba(255,255,255,0.8), -1px -1px 2px rgba(255,255,255,0.8), 1px -1px 2px rgba(255,255,255,0.8), -1px 1px 2px rgba(255,255,255,0.8)',
                  zIndex: 10,
                }}
              >
                {label.name}
              </div>
            );
          })}

        {/* 凡例 */}
        <div className='absolute bottom-4 left-4 z-10 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'>
          <h3 className='mb-2 text-sm font-semibold text-gray-900'>訪問進捗</h3>
          <div className='space-y-1 text-xs'>
            <div className='flex items-center gap-2'>
              <div className='h-4 w-4 rounded border border-gray-300 bg-gray-100'></div>
              <span className='text-gray-700'>未訪問</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='h-4 w-4 rounded bg-yellow-200'></div>
              <span className='text-gray-700'>~30%</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='h-4 w-4 rounded bg-orange-200'></div>
              <span className='text-gray-700'>30-60%</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='h-4 w-4 rounded bg-red-200'></div>
              <span className='text-gray-700'>60-90%</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='h-4 w-4 rounded bg-green-500'></div>
              <span className='text-gray-700'>90%+</span>
            </div>
          </div>
        </div>

        {/* ホバー時の情報表示 */}
        {hoveredFeatureId && (
          <div className='absolute top-4 left-4 z-10 rounded-lg border border-gray-200 bg-white p-3 shadow-lg'>
            {(() => {
              const feature = japanFeatures.find(
                f => f.properties?.id === hoveredFeatureId
              );
              if (!feature) return null;

              const { nam_ja, visited, total, progress } =
                feature.properties || {};
              return (
                <div className='text-sm'>
                  <h4 className='font-semibold text-gray-900'>{nam_ja}</h4>
                  <p className='text-gray-700'>
                    {visited || 0} / {total || 0} 訪問済み
                  </p>
                  <p className='text-gray-700'>
                    進捗: {Math.round((progress || 0) * 100)}%
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </Map>

      {/* 都道府県詳細モーダル */}
      <PrefectureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        prefecture={selectedPrefecture}
        places={modalPlaces}
        onToggleVisit={handleToggleVisit}
      />
    </div>
  );
};

export default PrefectureMap;
