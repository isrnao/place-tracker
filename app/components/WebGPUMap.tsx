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
  const x = (lon + 180) / 360;
  const siny = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI);
  return [x, y];
}

function worldToLonLat(x: number, y: number): [number, number] {
  const lon = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return [lon, lat];
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const zoomRef = useRef(initialViewState.zoom);
  const centerRef = useRef<[number, number]>([
    initialViewState.longitude,
    initialViewState.latitude,
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

  useEffect(() => {
    async function init() {
      if (!canvasRef.current || !('gpu' in navigator)) return;
      const nav = navigator as Navigator & { gpu: GPU };
      const adapter = await nav.gpu.requestAdapter();
      if (!adapter) return;
      const device = await adapter.requestDevice();
      deviceRef.current = device;

      const context = canvasRef.current.getContext(
        'webgpu'
      ) as GPUCanvasContext;
      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({ device, format });
      contextRef.current = context;

      uniformRef.current = device.createBuffer({
        size: 32,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const module = device.createShaderModule({
        code: `struct Uniforms{scale:vec2<f32>;_pad0:vec2<f32>;center:vec2<f32>;_pad1:vec2<f32>;};
@group(0) @binding(0) var<uniform> uni:Uniforms;
struct VSOut{ @builtin(position) pos:vec4<f32>; @location(0) color:vec4<f32>; };
@vertex fn vs(@location(0) pos:vec2<f32>, @location(1) color:vec4<f32>) -> VSOut {
  var out:VSOut;
  out.pos=vec4<f32>((pos.x-uni.center.x)*uni.scale.x, (pos.y-uni.center.y)*uni.scale.y, 0.0, 1.0);
  out.color=color;
  return out;
}
@fragment fn fs(input:VSOut) -> @location(0) vec4<f32>{return input.color;}`,
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
      onLoad?.();
      render();
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
  }, []);

  useEffect(() => {
    if (!deviceRef.current) return;
    buildGeometry();
    updateUniforms();
    render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features]);

  function progressToColor(p: number): [number, number, number, number] {
    if (p === 0) return [0.95, 0.96, 0.97, 0.8];
    if (p < 0.3) return [0.99, 0.95, 0.78, 0.8];
    if (p < 0.6) return [0.99, 0.84, 0.67, 0.8];
    if (p < 0.9) return [0.99, 0.65, 0.65, 0.8];
    return [0.06, 0.72, 0.51, 0.8];
  }

  function buildGeometry() {
    if (!deviceRef.current) return;

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
            lineColors.push(0.22, 0.26, 0.31, 1.0, 0.22, 0.26, 0.31, 1.0);
          }
          ringsWorld.push(ring.map(pt => lonLatToWorld(pt[0], pt[1])));
        });
        const indices = earcut(flat, holes);
        for (const idx of indices) {
          positions.push(flat[idx * 2], flat[idx * 2 + 1]);
          colors.push(...color);
        }
      }
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
    if (!deviceRef.current || !canvasRef.current || !uniformRef.current) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    const zoom = zoomRef.current;
    const centerWorld = lonLatToWorld(
      centerRef.current[0],
      centerRef.current[1]
    );
    const worldSize = 512 * 2 ** zoom;
    uniformData.current[0] = (worldSize * 2) / width;
    uniformData.current[1] = -(worldSize * 2) / height;
    uniformData.current[4] = centerWorld[0];
    uniformData.current[5] = centerWorld[1];
    deviceRef.current.queue.writeBuffer(
      uniformRef.current,
      0,
      uniformData.current.buffer
    );
  }

  function screenToWorld(x: number, y: number): [number, number] {
    if (!canvasRef.current) return [0, 0];
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
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
    const encoder = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          clearValue: { r: 0.84, g: 0.95, b: 0.88, a: 1 },
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
  }

  function handleResize() {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    canvasRef.current.width = rect.width * window.devicePixelRatio;
    canvasRef.current.height = rect.height * window.devicePixelRatio;
    updateUniforms();
    render();
  }

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    project: ([lng, lat]) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const width = canvasRef.current.width;
      const height = canvasRef.current.height;
      const zoom = zoomRef.current;
      const center = centerRef.current;
      const centerWorld = lonLatToWorld(center[0], center[1]);
      const worldSize = 512 * 2 ** zoom;
      const world = lonLatToWorld(lng, lat);
      const x = world[0] * worldSize - centerWorld[0] * worldSize + width / 2;
      const y = world[1] * worldSize - centerWorld[1] * worldSize + height / 2;
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

    const handleDown = (e: MouseEvent) => {
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
    };
    const handleUp = () => {
      dragging = false;
      last = null;
    };
    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * window.devicePixelRatio;
      const y = (e.clientY - rect.top) * window.devicePixelRatio;
      if (dragging && last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        last = { x: e.clientX, y: e.clientY };
        const zoom = zoomRef.current;
        const scale = (512 * 2 ** zoom) / canvas.width;
        const center = centerRef.current;
        const centerWorld = lonLatToWorld(center[0], center[1]);
        const offsetX = (-dx * scale) / window.devicePixelRatio;
        const offsetY = (-dy * scale) / window.devicePixelRatio;
        const newWorld: [number, number] = [
          centerWorld[0] + offsetX,
          centerWorld[1] + offsetY,
        ];
        centerRef.current = worldToLonLat(newWorld[0], newWorld[1]);
        onMove?.();
        updateUniforms();
        render();
      } else {
        onMouseMove?.({ lngLat: screenToLngLat(x, y), point: { x, y } });
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY / 100;
      let zoom = zoomRef.current + delta * 0.1;
      zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
      if (zoom === zoomRef.current) return;
      zoomRef.current = zoom;
      onMove?.();
      updateUniforms();
      render();
    };

    const handleLeave = () => {
      onMouseLeave?.();
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * window.devicePixelRatio;
      const y = (e.clientY - rect.top) * window.devicePixelRatio;
      onClick?.({ lngLat: screenToLngLat(x, y), point: { x, y } });
    };

    function screenToLngLat(x: number, y: number): [number, number] {
      const [wx, wy] = screenToWorld(x, y);
      return worldToLonLat(wx, wy);
    }

    canvas.addEventListener('mousedown', handleDown);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    canvas.addEventListener('mouseleave', handleLeave);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleDown);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      canvas.removeEventListener('mouseleave', handleLeave);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClick, onMouseMove, onMouseLeave, onMove]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      {children}
    </div>
  );
});

export default WebGPUMap;
