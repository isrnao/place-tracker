import type { Feature, FeatureCollection } from 'geojson';
import type { MapMouseEvent } from 'maplibre-gl';
import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  useCallback,
  startTransition,
} from 'react';
import { Map, Source, Layer } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';

import HoverInfo from './HoverInfo';
import MapHeader from './MapHeader';
import PrefectureModal from './PrefectureModal';
import SidebarContent from './SidebarContent';

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
  categoryName?: string;
  onDataUpdate?: () => void; // データ更新時のコールバック
}

function PrefectureMap({
  features,
  categorySlug,
  categoryName,
  onDataUpdate,
}: PrefectureMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hoveredFeatureId, setHoveredFeatureId] = useState<
    string | number | null
  >(null);
  const [hoveredFeature, setHoveredFeature] = useState<Feature | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // カスタム楽観的更新の実装
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<number, boolean>
  >({});

  // 楽観的更新を適用したplaces
  const optimisticPlaces = useMemo(() => {
    if (!modalPlaces) return [];

    return modalPlaces.map(place => {
      const optimisticValue = optimisticUpdates[place.id];
      if (optimisticValue !== undefined) {
        return { ...place, visited: optimisticValue };
      }
      return place;
    });
  }, [modalPlaces, optimisticUpdates]);

  // 楽観的更新を追加する関数
  const addOptimisticUpdate = useCallback(
    (placeId: number, visited: boolean) => {
      setOptimisticUpdates(prev => ({
        ...prev,
        [placeId]: visited,
      }));
    },
    []
  );

  // 楽観的更新をクリアする関数
  const clearOptimisticUpdates = useCallback(() => {
    setOptimisticUpdates({});
  }, []);

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
        const url = `/prefecture-data?${params.toString()}`;

        // AbortControllerを使用してタイムアウトを実装
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒でタイムアウト

        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'include',
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`サーバーエラー: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new Error(
              'リクエストがタイムアウトしました。再度お試しください。'
            );
          }
          throw error;
        }
        throw new Error('データの取得に失敗しました');
      }
    },
    [categorySlug]
  ); // 訪問状態を切り替える関数
  const handleToggleVisit = useCallback(
    async (placeId: number, visited: boolean) => {
      if (!selectedPrefecture) return;

      // 楽観的更新を即座に適用
      addOptimisticUpdate(placeId, !visited);

      try {
        const formData = new FormData();
        formData.append('placeId', placeId.toString());
        formData.append('visited', visited.toString());

        const params = new URLSearchParams();
        if (categorySlug) params.set('category', categorySlug);
        const url = params.size
          ? `/prefecture-data?${params.toString()}`
          : '/prefecture-data';

        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to toggle visit: ${response.status}`);
        }

        const responseData = await response.json();
        if (!responseData.ok) {
          throw new Error(responseData.error?.message || 'Unknown error');
        }

        setErrorMessage(null);

        // 成功時は最新データを取得してベース状態を更新
        const { places, prefecture } = await fetchPrefectureData(
          selectedPrefecture.id
        );

        // ベース状態を更新すると、楽観的更新を自動的に解除
        startTransition(() => {
          setModalPlaces(places);
          if (prefecture) {
            setSelectedPrefecture(prefecture);
          }
          // 楽観的更新をクリア
          clearOptimisticUpdates();
          // 親コンポーネントに変更を通知
          onDataUpdate?.();
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error occurred';
        setErrorMessage(errorMessage);

        // エラーの場合は最新データで状態を復元
        const { places, prefecture } = await fetchPrefectureData(
          selectedPrefecture.id
        );

        startTransition(() => {
          setModalPlaces(places);
          if (prefecture) {
            setSelectedPrefecture(prefecture);
          }
          // 楽観的更新をクリア
          clearOptimisticUpdates();
        });
      }
    },
    [
      selectedPrefecture,
      fetchPrefectureData,
      categorySlug,
      addOptimisticUpdate,
      clearOptimisticUpdates,
      onDataUpdate,
    ]
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
        const prefectureName = feature.properties?.nam_ja;

        if (prefectureId && japanPrefectureIds.includes(prefectureId)) {
          // 即座にモーダルを開く（ローディング状態で）
          setSelectedPrefecture({
            id: prefectureId,
            name: prefectureName || '',
            visited: feature.properties?.visited || 0,
            total: feature.properties?.total || 0,
          });
          setModalPlaces(null); // 初期化
          setIsModalLoading(true);
          setIsModalOpen(true);
          setErrorMessage(null);

          try {
            // 非同期でデータを取得
            const { places, prefecture } =
              await fetchPrefectureData(prefectureId);

            if (prefecture) {
              setSelectedPrefecture(prefecture);
              setModalPlaces(places);
            }
          } catch (error) {
            const errorMessage =
              error instanceof Error
                ? error.message
                : 'データの取得に失敗しました';
            setErrorMessage(errorMessage);
          } finally {
            setIsModalLoading(false);
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
          setHoveredFeature(feature);
          setMousePosition({ x: event.point.x, y: event.point.y });
          mapRef.current.getCanvas().style.cursor = 'pointer';
        }
      } else {
        setHoveredFeatureId(null);
        setHoveredFeature(null);
        mapRef.current.getCanvas().style.cursor = '';
      }
    },
    [japanPrefectureIds]
  );

  const handleMouseLeave = useCallback(() => {
    if (!mapRef.current) return;

    setHoveredFeatureId(null);
    setHoveredFeature(null);
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
      // 都道府県の基本情報を取得（featuresから）
      const feature = japanFeatures.find(
        f => f.properties?.id === prefectureId
      );
      const prefectureName = feature?.properties?.nam_ja || '';

      // 即座にモーダルを開く（ローディング状態で）
      setSelectedPrefecture({
        id: prefectureId,
        name: prefectureName,
        visited: feature?.properties?.visited || 0,
        total: feature?.properties?.total || 0,
      });
      setModalPlaces(null); // 初期化
      setIsModalLoading(true);
      setIsModalOpen(true);
      setErrorMessage(null);

      try {
        // 非同期でデータを取得
        const { places, prefecture } = await fetchPrefectureData(prefectureId);

        if (prefecture) {
          setSelectedPrefecture(prefecture);
          setModalPlaces(places);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'データの取得に失敗しました';
        setErrorMessage(errorMessage);
      } finally {
        setIsModalLoading(false);
      }
    },
    [fetchPrefectureData, japanFeatures]
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

  // 全体の進捗を計算
  const overallProgress = useMemo(() => {
    if (japanFeatures.length === 0)
      return { visited: 0, total: 0, percentage: 0 };

    const totalVisited = japanFeatures.reduce(
      (sum, feature) => sum + (feature.properties?.visited || 0),
      0
    );
    const totalPlaces = japanFeatures.reduce(
      (sum, feature) => sum + (feature.properties?.total || 0),
      0
    );
    const percentage = totalPlaces > 0 ? (totalVisited / totalPlaces) * 100 : 0;

    return {
      visited: totalVisited,
      total: totalPlaces,
      percentage: Math.round(percentage),
    };
  }, [japanFeatures]);

  return (
    <div className='relative h-full w-full'>
      {/* ヘッダー - ハンバーガーメニューとカテゴリ名と進捗表示 */}
      <MapHeader
        categoryName={categoryName}
        overallProgress={overallProgress}
        sidebarContent={
          <SidebarContent
            prefectures={japanFeatures.map(f => ({
              id: f.properties?.id || 0,
              name: f.properties?.nam_ja || '',
              visited: f.properties?.visited || 0,
              total: f.properties?.total || 0,
              progress: f.properties?.progress || 0,
            }))}
            categoryName={categoryName}
            onPrefectureSelect={openPrefectureModal}
          />
        }
      />

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
        <HoverInfo hoveredFeature={hoveredFeature} position={mousePosition} />
      </Map>

      {/* 都道府県詳細モーダル */}
      <PrefectureModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setErrorMessage(null); // モーダルを閉じるときにエラーメッセージをクリア
          setIsModalLoading(false); // ローディング状態もリセット
        }}
        prefecture={selectedPrefecture}
        places={optimisticPlaces}
        onToggleVisit={handleToggleVisit}
        errorMessage={errorMessage}
        isLoading={isModalLoading}
      />
    </div>
  );
}

export default PrefectureMap;
