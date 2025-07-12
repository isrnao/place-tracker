import earcut from 'earcut';
import type { Feature } from 'geojson';
import RBush from 'rbush';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface MapEvent {
  lngLat: [number, number];
  point: { x: number; y: number };
}

export interface WebGPUMapRef {
  project: (lngLat: [number, number]) => { x: number; y: number };
  queryRenderedFeatures: (point: { x: number; y: number }) => Feature[];
  getCanvas: () => HTMLCanvasElement | null;
  getZoom: () => number;
}

interface WebGPUMapProps {
  features: Feature[];
  initialViewState: { longitude: number; latitude: number; zoom: number };
  minZoom?: number;
  maxZoom?: number;
  onLoad?: () => void;
  onMove?: () => void;
  onClick?: (ev: MapEvent) => void;
  onMouseMove?: (ev: MapEvent) => void;
  onMouseLeave?: () => void;
  children?: React.ReactNode;
}

function lonLatToWorld(lon: number, lat: number): [number, number] {
  // 入力値の検証
  if (
    typeof lon !== 'number' ||
    typeof lat !== 'number' ||
    !isFinite(lon) ||
    !isFinite(lat) ||
    isNaN(lon) ||
    isNaN(lat)
  ) {
    console.warn('Invalid lon/lat values:', { lon, lat });
    return [0.5, 0.5]; // デフォルト値（世界の中心）
  }

  // 経度を-180〜180度の範囲に正規化
  lon = ((lon + 180) % 360) - 180;

  // 緯度をWeb Mercator投影の安全な範囲（-85.051128779806〜85.051128779806度）に制限
  // これによりMercator投影でのInfinityを防ぐ
  lat = Math.max(-85.051128779806, Math.min(85.051128779806, lat));

  const x = (lon + 180) / 360;
  const siny = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI);

  // 結果の検証
  if (!isFinite(x) || !isFinite(y) || isNaN(x) || isNaN(y)) {
    console.warn('Invalid world coordinates calculated:', { lon, lat, x, y });
    return [0.5, 0.5];
  }

  // 結果をさらに安全な範囲に制限
  const clampedX = Math.max(0, Math.min(1, x));
  const clampedY = Math.max(0, Math.min(1, y));

  return [clampedX, clampedY];
}

function worldToLonLat(x: number, y: number): [number, number] {
  // 入力値の検証
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    !isFinite(x) ||
    !isFinite(y) ||
    isNaN(x) ||
    isNaN(y)
  ) {
    console.warn('Invalid world coordinates:', { x, y });
    return [0, 0]; // デフォルト値
  }

  // world座標を0-1の範囲に制限
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));

  const lon = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  // 結果の検証と制限
  const clampedLon = Math.max(-180, Math.min(180, lon));
  const clampedLat = Math.max(-85.051128779806, Math.min(85.051128779806, lat));

  if (
    !isFinite(clampedLon) ||
    !isFinite(clampedLat) ||
    isNaN(clampedLon) ||
    isNaN(clampedLat)
  ) {
    console.warn('Invalid lon/lat calculated:', {
      x,
      y,
      lon: clampedLon,
      lat: clampedLat,
    });
    return [0, 0];
  }

  return [clampedLon, clampedLat];
}

interface PolygonWorld {
  id: number;
  rings: number[][][];
}

interface BBoxItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  index: number;
}

const WebGPUMap = forwardRef<WebGPUMapRef, WebGPUMapProps>(function WebGPUMap(
  {
    features,
    initialViewState,
    minZoom = 4,
    maxZoom = 10,
    onLoad,
    onMove,
    onClick,
    onMouseMove,
    onMouseLeave,
    children,
  },
  ref
) {
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [webGPUSupported, setWebGPUSupported] = React.useState<boolean | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const zoomRef = useRef(
    Math.max(minZoom, Math.min(maxZoom, initialViewState.zoom))
  );
  const centerRef = useRef<[number, number]>([
    Math.max(-180, Math.min(180, initialViewState.longitude)),
    Math.max(
      -85.051128779806,
      Math.min(85.051128779806, initialViewState.latitude)
    ),
  ]);

  const uniformRef = useRef<GPUBuffer | null>(null);
  const uniformData = useRef<Float32Array>(new Float32Array(8));

  const worldPolygonsRef = useRef<PolygonWorld[]>([]);
  const indexRef = useRef<RBush<BBoxItem> | null>(null);

  const positionBufferRef = useRef<GPUBuffer | null>(null);
  const colorBufferRef = useRef<GPUBuffer | null>(null);
  const lineColorBufferRef = useRef<GPUBuffer | null>(null);
  const lineBufferRef = useRef<GPUBuffer | null>(null);
  const fillPipelineRef = useRef<GPURenderPipeline | null>(null);
  const linePipelineRef = useRef<GPURenderPipeline | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);

  const lineVertexCount = useRef(0);
  const fillVertexCount = useRef(0);

  // 安全な初期状態を保持
  const safeInitialState = useRef({
    zoom: Math.max(minZoom, Math.min(maxZoom, initialViewState.zoom)),
    center: [
      Math.max(-180, Math.min(180, initialViewState.longitude)),
      Math.max(
        -85.051128779806,
        Math.min(85.051128779806, initialViewState.latitude)
      ),
    ] as [number, number],
  });

  // 状態を安全な初期値にリセットする関数
  const resetToSafeState = () => {
    console.warn('Resetting to safe state due to error');
    zoomRef.current = safeInitialState.current.zoom;
    centerRef.current = [...safeInitialState.current.center];
    try {
      updateUniforms();
      render();
    } catch (error) {
      console.error('Error even in safe state reset:', error);
      setWebGPUSupported(false);
    }
  };

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    async function init() {
      // ハイドレーション完了とブラウザ環境でのみ実行
      if (!isHydrated || typeof window === 'undefined') return;

      // キャンバス要素とWebGPUサポートを確認
      if (!canvasRef.current) {
        console.warn('Canvas element is not available');
        return;
      }

      if (!('gpu' in navigator)) {
        console.warn('WebGPU is not supported in this browser');
        setWebGPUSupported(false);
        return;
      }

      try {
        const nav = navigator as Navigator & { gpu: GPU };
        const adapter = await nav.gpu.requestAdapter();
        if (!adapter) {
          console.warn('WebGPU adapter not found');
          return;
        }

        const device = await adapter.requestDevice();
        deviceRef.current = device;

        // デバイスロスト時の処理
        device.lost.then(info => {
          console.warn('WebGPU device lost:', info);
          setWebGPUSupported(false);
          // 必要に応じて再初期化を試行
          setTimeout(() => {
            if (isHydrated && canvasRef.current) {
              init();
            }
          }, 1000);
        });

        // キャンバスコンテキストを再確認
        if (!canvasRef.current) {
          console.warn('Canvas element became null during initialization');
          return;
        }

        // WebGPUコンテキストを取得（より安全にアクセス）
        let context: GPUCanvasContext | null = null;
        try {
          context = canvasRef.current.getContext('webgpu') as GPUCanvasContext;
        } catch (error) {
          console.error('Failed to get WebGPU context:', error);
          return;
        }

        if (!context) {
          console.warn('WebGPU context is null');
          return;
        }

        const format = navigator.gpu.getPreferredCanvasFormat();
        context.configure({ device, format });
        contextRef.current = context;

        uniformRef.current = device.createBuffer({
          size: 32,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const module = device.createShaderModule({
          code: `
struct Uniforms {
  scale: vec2<f32>,
  _pad0: vec2<f32>,
  center: vec2<f32>,
  _pad1: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uni: Uniforms;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex fn vs(@location(0) pos: vec2<f32>, @location(1) color: vec4<f32>) -> VSOut {
  var out: VSOut;
  out.pos = vec4<f32>((pos.x - uni.center.x) * uni.scale.x, (pos.y - uni.center.y) * uni.scale.y, 0.0, 1.0);
  out.color = color;
  return out;
}

@fragment fn fs(input: VSOut) -> @location(0) vec4<f32> {
  return input.color;
}`,
        });

        const bindGroupLayout = device.createBindGroupLayout({
          entries: [
            {
              binding: 0,
              visibility: GPUShaderStage.VERTEX,
              buffer: {},
            },
          ],
        });
        const pipelineLayout = device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout],
        });

        fillPipelineRef.current = device.createRenderPipeline({
          layout: pipelineLayout,
          vertex: {
            module,
            entryPoint: 'vs',
            buffers: [
              {
                arrayStride: 8,
                attributes: [
                  { shaderLocation: 0, offset: 0, format: 'float32x2' },
                ],
              },
              {
                arrayStride: 16,
                attributes: [
                  { shaderLocation: 1, offset: 0, format: 'float32x4' },
                ],
              },
            ],
          },
          fragment: { module, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'triangle-list' },
        });

        linePipelineRef.current = device.createRenderPipeline({
          layout: pipelineLayout,
          vertex: {
            module,
            entryPoint: 'vs',
            buffers: [
              {
                arrayStride: 8,
                attributes: [
                  { shaderLocation: 0, offset: 0, format: 'float32x2' },
                ],
              },
              {
                arrayStride: 16,
                attributes: [
                  { shaderLocation: 1, offset: 0, format: 'float32x4' },
                ],
              },
            ],
          },
          fragment: { module, entryPoint: 'fs', targets: [{ format }] },
          primitive: { topology: 'line-list' },
        });

        buildGeometry();
        updateUniforms();
        setWebGPUSupported(true);

        // キャンバスサイズを正しく設定
        handleResize();

        onLoad?.();
        render();
      } catch (error) {
        console.error('Failed to initialize WebGPU:', error);
        setWebGPUSupported(false);
      }
    }

    init();
    return () => {
      positionBufferRef.current?.destroy();
      colorBufferRef.current?.destroy();
      lineColorBufferRef.current?.destroy();
      lineBufferRef.current?.destroy();
      uniformRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated]);

  useEffect(() => {
    if (!deviceRef.current) return;
    buildGeometry();
    updateUniforms();
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);

  function progressToColor(p: number): [number, number, number, number] {
    if (p === 0) return [0.92, 0.95, 0.98, 0.95]; // 明るいグレー（背景と区別しやすく）
    if (p < 0.3) return [1.0, 0.87, 0.42, 0.95]; // 明るい黄色
    if (p < 0.6) return [1.0, 0.65, 0.35, 0.95]; // オレンジ
    if (p < 0.9) return [0.98, 0.45, 0.45, 0.95]; // 赤
    return [0.2, 0.7, 0.5, 0.95]; // 緑
  }

  function buildGeometry() {
    if (!deviceRef.current || !isHydrated) return;

    const positions: number[] = [];
    const colors: number[] = [];
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    const worldPolygons: PolygonWorld[] = [];
    const bboxes: BBoxItem[] = [];

    for (const feature of features) {
      if (
        feature.geometry.type !== 'Polygon' &&
        feature.geometry.type !== 'MultiPolygon'
      )
        continue;

      const coords =
        feature.geometry.type === 'MultiPolygon'
          ? (feature.geometry.coordinates as number[][][][])
          : [feature.geometry.coordinates as number[][][]];

      const color =
        feature.properties && feature.properties.progress
          ? progressToColor(feature.properties.progress)
          : [0.9, 0.9, 0.9, 1];

      const ringsWorld: number[][][] = [];

      for (const polygon of coords) {
        const flat: number[] = [];
        const holes: number[] = [];
        let cursor = 0;

        polygon.forEach((ring: number[][], ringIndex: number) => {
          if (ringIndex > 0) {
            cursor += polygon[ringIndex - 1].length;
            holes.push(cursor);
          }
          ring.forEach((pt: number[]) => {
            const world = lonLatToWorld(pt[0], pt[1]);
            flat.push(world[0], world[1]);
          });
          for (let i = 0; i < ring.length - 1; i++) {
            const a = lonLatToWorld(ring[i][0], ring[i][1]);
            const b = lonLatToWorld(ring[i + 1][0], ring[i + 1][1]);
            linePositions.push(a[0], a[1], b[0], b[1]);
            // より明確な境界線の色 (濃い紺色)
            lineColors.push(0.1, 0.15, 0.3, 1.0, 0.1, 0.15, 0.3, 1.0);
          }
          ringsWorld.push(ring.map(pt => lonLatToWorld(pt[0], pt[1])));
        });

        // 三角形分割
        const indices = earcut(flat, holes);
        for (const idx of indices) {
          positions.push(flat[idx * 2], flat[idx * 2 + 1]);
          colors.push(...color);
        }
      }

      // バウンディングボックス計算
      const flatAll = ringsWorld.flat();
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const pt of flatAll) {
        if (pt[0] < minX) minX = pt[0];
        if (pt[1] < minY) minY = pt[1];
        if (pt[0] > maxX) maxX = pt[0];
        if (pt[1] > maxY) maxY = pt[1];
      }

      worldPolygons.push({
        id: feature.properties?.id || 0,
        rings: ringsWorld,
      });

      bboxes.push({
        minX,
        minY,
        maxX,
        maxY,
        index: worldPolygons.length - 1,
      });
    }

    const device = deviceRef.current;
    if (!device) return;

    if (positionBufferRef.current) positionBufferRef.current.destroy();
    positionBufferRef.current = device.createBuffer({
      size: positions.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(positionBufferRef.current.getMappedRange()).set(positions);
    positionBufferRef.current.unmap();

    if (colorBufferRef.current) colorBufferRef.current.destroy();
    colorBufferRef.current = device.createBuffer({
      size: colors.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(colorBufferRef.current.getMappedRange()).set(colors);
    colorBufferRef.current.unmap();

    if (lineColorBufferRef.current) lineColorBufferRef.current.destroy();
    lineColorBufferRef.current = device.createBuffer({
      size: lineColors.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(lineColorBufferRef.current.getMappedRange()).set(
      lineColors
    );
    lineColorBufferRef.current.unmap();

    if (lineBufferRef.current) lineBufferRef.current.destroy();
    lineBufferRef.current = device.createBuffer({
      size: linePositions.length * 4,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(lineBufferRef.current.getMappedRange()).set(linePositions);
    lineBufferRef.current.unmap();

    fillVertexCount.current = positions.length / 2;
    lineVertexCount.current = linePositions.length / 2;

    worldPolygonsRef.current = worldPolygons;
    indexRef.current = new RBush<BBoxItem>();
    indexRef.current.load(bboxes);
  }
  function updateUniforms() {
    if (
      !deviceRef.current ||
      !canvasRef.current ||
      !uniformRef.current ||
      !isHydrated
    )
      return;

    try {
      const rect = canvasRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (width <= 0 || height <= 0) {
        console.warn('Invalid canvas dimensions in updateUniforms:', {
          width,
          height,
        });
        return;
      }

      const zoom = zoomRef.current;

      if (!isFinite(zoom) || isNaN(zoom)) {
        console.warn('Invalid zoom in updateUniforms:', zoom);
        return;
      }

      const center = centerRef.current;

      if (
        !center ||
        center.length !== 2 ||
        !isFinite(center[0]) ||
        !isFinite(center[1])
      ) {
        console.warn('Invalid center in updateUniforms:', center);
        return;
      }

      const centerWorld = lonLatToWorld(center[0], center[1]);

      if (!isFinite(centerWorld[0]) || !isFinite(centerWorld[1])) {
        console.warn('Invalid centerWorld in updateUniforms:', centerWorld);
        return;
      }

      const worldSize = 512 * 2 ** zoom;

      if (!isFinite(worldSize) || worldSize <= 0) {
        console.warn('Invalid worldSize in updateUniforms:', worldSize);
        return;
      }

      const scaleX = (worldSize * 2) / width;
      const scaleY = -(worldSize * 2) / height;

      if (!isFinite(scaleX) || !isFinite(scaleY)) {
        console.warn('Invalid scale values in updateUniforms:', {
          scaleX,
          scaleY,
        });
        return;
      }

      uniformData.current[0] = scaleX;
      uniformData.current[1] = scaleY;
      uniformData.current[4] = centerWorld[0];
      uniformData.current[5] = centerWorld[1];

      deviceRef.current.queue.writeBuffer(
        uniformRef.current,
        0,
        uniformData.current.buffer
      );
    } catch (error) {
      console.error('Error in updateUniforms:', error);
    }
  }

  function screenToWorld(x: number, y: number): [number, number] {
    if (!canvasRef.current) return [0, 0];
    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const zoom = zoomRef.current;
    const center = centerRef.current;
    const centerWorld = lonLatToWorld(center[0], center[1]);
    const worldSize = 512 * 2 ** zoom;
    const wx = (x - width / 2) / worldSize + centerWorld[0];
    const wy = (y - height / 2) / worldSize + centerWorld[1];
    return [wx, wy];
  }

  function render() {
    const device = deviceRef.current;
    const context = contextRef.current;
    const fillPipe = fillPipelineRef.current;
    const linePipe = linePipelineRef.current;
    const pos = positionBufferRef.current;
    const color = colorBufferRef.current;
    const line = lineBufferRef.current;
    const lineColor = lineColorBufferRef.current;

    if (
      !device ||
      !context ||
      !fillPipe ||
      !linePipe ||
      !pos ||
      !color ||
      !line ||
      !lineColor
    )
      return;

    try {
      const encoder = device.createCommandEncoder();
      const view = context.getCurrentTexture().createView();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view,
            clearValue: { r: 0.7, g: 0.85, b: 0.95, a: 1 }, // 海を表現する水色
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });
      const uniformBuffer = uniformRef.current;
      if (!uniformBuffer) return;
      const bindGroup = device.createBindGroup({
        layout: fillPipe.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });
      pass.setPipeline(fillPipe);
      pass.setVertexBuffer(0, pos);
      pass.setVertexBuffer(1, color);
      pass.setBindGroup(0, bindGroup);
      pass.draw(fillVertexCount.current);

      pass.setPipeline(linePipe);
      pass.setVertexBuffer(0, line);
      pass.setVertexBuffer(1, lineColor);
      pass.setBindGroup(0, bindGroup);
      pass.draw(lineVertexCount.current);

      pass.end();
      device.queue.submit([encoder.finish()]);
    } catch (error) {
      console.error('WebGPU rendering error:', error);
      // レンダリングエラーが発生した場合は、WebGPUサポートを無効にする
      setWebGPUSupported(false);
    }
  }

  function handleResize() {
    if (!canvasRef.current) return;

    // 親要素のサイズを取得
    const parent = canvasRef.current.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const width = parentRect.width;
    const height = parentRect.height;

    // サイズが変更されていない場合は処理をスキップ
    if (
      canvasRef.current.style.width === width + 'px' &&
      canvasRef.current.style.height === height + 'px'
    ) {
      return;
    }

    // キャンバスの内部解像度を設定（高DPI対応）
    canvasRef.current.width = Math.floor(width * window.devicePixelRatio);
    canvasRef.current.height = Math.floor(height * window.devicePixelRatio);

    // CSSサイズは親要素と同じサイズに設定
    canvasRef.current.style.width = width + 'px';
    canvasRef.current.style.height = height + 'px';

    updateUniforms();
    render();

    // リサイズ完了を親コンポーネントに通知
    onMove?.();
  }

  useEffect(() => {
    if (!canvasRef.current) return;

    // 初回リサイズ
    handleResize();

    // ResizeObserverを使用してより正確なリサイズ検出
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        // contentBoxSize が利用可能な場合はそれを使用
        if (entry.contentBoxSize && entry.contentBoxSize.length > 0) {
          handleResize();
        } else if (entry.contentRect) {
          handleResize();
        }
      }
    });

    const parent = canvasRef.current.parentElement;
    if (parent) {
      resizeObserver.observe(parent);
    }

    // フォールバックとしてwindowのresizeイベントも監視
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    project: ([lng, lat]) => {
      if (!canvasRef.current) return { x: 0, y: 0 };

      // 入力値の検証
      if (
        typeof lng !== 'number' ||
        typeof lat !== 'number' ||
        !isFinite(lng) ||
        !isFinite(lat) ||
        isNaN(lng) ||
        isNaN(lat)
      ) {
        console.warn('Invalid coordinates for projection:', { lng, lat });
        return { x: 0, y: 0 };
      }

      // CSS表示サイズを使用（内部解像度ではなく）
      const rect = canvasRef.current.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      const zoom = zoomRef.current;
      const center = centerRef.current;

      // ズームと中心座標の検証
      if (!isFinite(zoom) || isNaN(zoom) || !center || center.length !== 2) {
        console.warn('Invalid zoom or center values:', { zoom, center });
        return { x: 0, y: 0 };
      }

      const centerWorld = lonLatToWorld(center[0], center[1]);
      const worldSize = 512 * 2 ** zoom;
      const world = lonLatToWorld(lng, lat);

      // 計算結果の検証
      if (
        !isFinite(centerWorld[0]) ||
        !isFinite(centerWorld[1]) ||
        !isFinite(world[0]) ||
        !isFinite(world[1]) ||
        !isFinite(worldSize)
      ) {
        console.warn('Invalid world coordinates:', {
          centerWorld,
          world,
          worldSize,
        });
        return { x: 0, y: 0 };
      }

      const x = (world[0] - centerWorld[0]) * worldSize + width / 2;
      const y = (world[1] - centerWorld[1]) * worldSize + height / 2;

      // 最終結果の検証
      if (!isFinite(x) || !isFinite(y) || isNaN(x) || isNaN(y)) {
        console.warn('Invalid projected coordinates:', { x, y });
        return { x: 0, y: 0 };
      }

      return { x, y };
    },
    queryRenderedFeatures: point => {
      if (!indexRef.current) return [];
      const world = screenToWorld(point.x, point.y);
      const hits = indexRef.current.search({
        minX: world[0],
        minY: world[1],
        maxX: world[0],
        maxY: world[1],
      });
      const found: Feature[] = [];
      for (const item of hits) {
        const poly = worldPolygonsRef.current[item.index];
        for (const ring of poly.rings) {
          if (pointInPolygon(world, ring)) {
            found.push(features[item.index]);
            break;
          }
        }
      }
      return found;
    },
    getCanvas: () => canvasRef.current,
    getZoom: () => zoomRef.current,
  }));

  function pointInPolygon(point: [number, number], vs: number[][]) {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0];
      const yi = vs[i][1];
      const xj = vs[j][0];
      const yj = vs[j][1];
      const intersect =
        yi > point[1] !== yj > point[1] &&
        point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas = canvasEl;
    let dragging = false;
    let last: { x: number; y: number } | null = null;

    // マウスイベントハンドラー
    const handleMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      dragging = false;
      last = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (dragging && last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;

        // 移動が小さすぎる場合はスキップ
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
          return;
        }

        last = { x: e.clientX, y: e.clientY };
        const zoom = zoomRef.current;

        // ズーム値の検証
        if (
          !isFinite(zoom) ||
          isNaN(zoom) ||
          zoom < minZoom ||
          zoom > maxZoom
        ) {
          console.warn('Invalid zoom value during mouse move:', zoom);
          return;
        }

        if (rect.width <= 0 || rect.height <= 0) {
          console.warn('Invalid canvas size during mouse move:', rect);
          return;
        }

        const center = centerRef.current;

        // 中心座標の検証
        if (
          !center ||
          center.length !== 2 ||
          !isFinite(center[0]) ||
          !isFinite(center[1])
        ) {
          console.warn('Invalid center coordinates during mouse move:', center);
          return;
        }

        // 現在の中心点のワールド座標を取得
        const centerWorld = lonLatToWorld(center[0], center[1]);

        // centerWorldの検証
        if (!isFinite(centerWorld[0]) || !isFinite(centerWorld[1])) {
          console.warn(
            'Invalid center world coordinates during mouse move:',
            centerWorld
          );
          return;
        }

        // 現在のビューポートのワールド座標範囲を計算
        const worldSize = 512 * 2 ** zoom;
        const worldViewWidth = rect.width / worldSize;
        const worldViewHeight = rect.height / worldSize;

        // ピクセル移動をワールド座標の移動に変換（自然な1:1の動き）
        // 移動感度を調整して、より直感的な操作感にする
        const sensitivity = 1.0; // 基本感度
        const worldDx = -(dx / rect.width) * worldViewWidth * sensitivity;
        const worldDy = -(dy / rect.height) * worldViewHeight * sensitivity;

        // 新しいワールド座標を計算
        const newWorldX = centerWorld[0] + worldDx;
        const newWorldY = centerWorld[1] + worldDy;

        // 新しいworld座標の検証
        if (
          !isFinite(newWorldX) ||
          !isFinite(newWorldY) ||
          isNaN(newWorldX) ||
          isNaN(newWorldY)
        ) {
          console.warn('Invalid new world coordinates:', {
            newWorldX,
            newWorldY,
          });
          return;
        }

        // ワールド座標を緯度経度に変換
        const newCenter = worldToLonLat(newWorldX, newWorldY);

        // 新しい中心座標が有効かチェック
        if (
          isFinite(newCenter[0]) &&
          isFinite(newCenter[1]) &&
          !isNaN(newCenter[0]) &&
          !isNaN(newCenter[1]) &&
          Math.abs(newCenter[0]) <= 180 &&
          Math.abs(newCenter[1]) <= 85
        ) {
          centerRef.current = newCenter;

          // 安全にupdateUniformsとrenderを実行
          try {
            updateUniforms();
            render();
            onMove?.();
          } catch (error) {
            console.error('Error during render in mouse move:', error);
            // エラーが発生した場合は安全な状態に戻す
            resetToSafeState();
          }
        } else {
          console.warn('Invalid new center coordinates:', newCenter);
        }
      } else {
        onMouseMove?.({
          lngLat: screenToLngLat(x, y),
          point: { x, y },
        });
      }
    };

    // タッチイベントハンドラー
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        dragging = true;
        last = { x: touch.clientX, y: touch.clientY };
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      dragging = false;
      last = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (dragging && last) {
          const dx = touch.clientX - last.x;
          const dy = touch.clientY - last.y;

          // 移動が小さすぎる場合はスキップ
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
            return;
          }

          last = { x: touch.clientX, y: touch.clientY };
          const zoom = zoomRef.current;

          // ズーム値の検証
          if (
            !isFinite(zoom) ||
            isNaN(zoom) ||
            zoom < minZoom ||
            zoom > maxZoom
          ) {
            console.warn('Invalid zoom value during touch move:', zoom);
            return;
          }

          if (rect.width <= 0 || rect.height <= 0) {
            console.warn('Invalid canvas size during touch move:', rect);
            return;
          }

          const center = centerRef.current;

          // 中心座標の検証
          if (
            !center ||
            center.length !== 2 ||
            !isFinite(center[0]) ||
            !isFinite(center[1])
          ) {
            console.warn(
              'Invalid center coordinates during touch move:',
              center
            );
            return;
          }

          // 現在の中心点のワールド座標を取得
          const centerWorld = lonLatToWorld(center[0], center[1]);

          // centerWorldの検証
          if (!isFinite(centerWorld[0]) || !isFinite(centerWorld[1])) {
            console.warn(
              'Invalid center world coordinates during touch move:',
              centerWorld
            );
            return;
          }

          // 現在のビューポートのワールド座標範囲を計算
          const worldSize = 512 * 2 ** zoom;
          const worldViewWidth = rect.width / worldSize;
          const worldViewHeight = rect.height / worldSize;

          // ピクセル移動をワールド座標の移動に変換（自然な1:1の動き）
          // 移動感度を調整して、より直感的な操作感にする
          const sensitivity = 1.0; // 基本感度
          const worldDx = -(dx / rect.width) * worldViewWidth * sensitivity;
          const worldDy = -(dy / rect.height) * worldViewHeight * sensitivity;

          // 新しいワールド座標を計算
          const newWorldX = centerWorld[0] + worldDx;
          const newWorldY = centerWorld[1] + worldDy;

          // 新しいworld座標の検証
          if (
            !isFinite(newWorldX) ||
            !isFinite(newWorldY) ||
            isNaN(newWorldX) ||
            isNaN(newWorldY)
          ) {
            console.warn('Invalid new world coordinates:', {
              newWorldX,
              newWorldY,
            });
            return;
          }

          // ワールド座標を緯度経度に変換
          const newCenter = worldToLonLat(newWorldX, newWorldY);

          // 新しい中心座標が有効かチェック
          if (
            isFinite(newCenter[0]) &&
            isFinite(newCenter[1]) &&
            !isNaN(newCenter[0]) &&
            !isNaN(newCenter[1]) &&
            Math.abs(newCenter[0]) <= 180 &&
            Math.abs(newCenter[1]) <= 85
          ) {
            centerRef.current = newCenter;

            // 安全にupdateUniformsとrenderを実行
            try {
              updateUniforms();
              render();
              onMove?.();
            } catch (error) {
              console.error('Error during render in touch move:', error);
              // エラーが発生した場合は安全な状態に戻す
              resetToSafeState();
            }
          } else {
            console.warn('Invalid new center coordinates:', newCenter);
          }
        } else {
          onMouseMove?.({
            lngLat: screenToLngLat(x, y),
            point: { x, y },
          });
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // マウス位置を取得
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // ズーム前のマウス位置の経緯度座標を記録
      const mouseWorldBefore = screenToWorld(mouseX, mouseY);
      const mouseLngLatBefore = worldToLonLat(
        mouseWorldBefore[0],
        mouseWorldBefore[1]
      );

      // ズーム計算
      const delta = -e.deltaY / 100;
      let newZoom = zoomRef.current + delta * 0.1;
      newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
      if (newZoom === zoomRef.current) return;

      // ズームを適用
      zoomRef.current = newZoom;

      // ズーム後のマウス位置の経緯度座標を計算
      const mouseWorldAfter = screenToWorld(mouseX, mouseY);
      const mouseLngLatAfter = worldToLonLat(
        mouseWorldAfter[0],
        mouseWorldAfter[1]
      );

      // マウス位置が変わらないようにカメラ中心を調整
      const center = centerRef.current;
      const deltaLng = mouseLngLatBefore[0] - mouseLngLatAfter[0];
      const deltaLat = mouseLngLatBefore[1] - mouseLngLatAfter[1];

      centerRef.current = [center[0] + deltaLng, center[1] + deltaLat];

      onMove?.();
      updateUniforms();
      render();
    };

    const handleLeave = () => {
      onMouseLeave?.();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onClick?.({
        lngLat: screenToLngLat(x, y),
        point: { x, y },
      });
    };

    const _handleTouchClick = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        onClick?.({
          lngLat: screenToLngLat(x, y),
          point: { x, y },
        });
      }
    };

    function screenToLngLat(x: number, y: number): [number, number] {
      const [wx, wy] = screenToWorld(x, y);
      return worldToLonLat(wx, wy);
    }

    // マウスイベントリスナー
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // タッチイベントリスナー
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      // マウスイベントリスナーの削除
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);

      // タッチイベントリスナーの削除
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClick, onMouseMove, onMouseLeave, onMove]);

  // ハイドレーション前は何も表示しない
  if (!isHydrated) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          backgroundColor: '#b3d9f2', // 水色背景に統一
        }}
      >
        {children}
      </div>
    );
  }

  // WebGPUサポートされていない場合のフォールバック表示
  if (webGPUSupported === false) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#b3d9f2', // 水色背景に統一
          border: '1px solid #ddd',
          borderRadius: '8px',
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#666' }}>
            WebGPUはサポートされていません
          </p>
          <p style={{ margin: '0', fontSize: '14px', color: '#999' }}>
            Chrome 113+ または Firefox 113+ をご利用ください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'none', // タッチアクションを無効化
          userSelect: 'none', // テキスト選択を無効化
        }}
      />
      {children}
    </div>
  );
});

export default WebGPUMap;
