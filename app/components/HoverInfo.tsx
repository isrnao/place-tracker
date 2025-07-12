import type { Feature } from 'geojson';
import React from 'react';

interface HoverInfoProps {
  hoveredFeature: Feature | null;
  position: { x: number; y: number };
}

function HoverInfo({ hoveredFeature, position }: HoverInfoProps) {
  if (!hoveredFeature) return null;

  const { nam_ja, visited, total, progress } = hoveredFeature.properties || {};

  // 座標値が有効な数値であることを確認
  const isValidPosition =
    position &&
    typeof position.x === 'number' &&
    typeof position.y === 'number' &&
    !isNaN(position.x) &&
    !isNaN(position.y) &&
    isFinite(position.x) &&
    isFinite(position.y);

  if (!isValidPosition) {
    console.warn('Invalid position values:', position);
    return null;
  }

  // ウィンドウサイズも確認
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const left = Math.min(Math.max(position.x + 10, 10), windowWidth - 200);
  const top = Math.min(Math.max(position.y - 10, 10), windowHeight - 100);

  return (
    <div
      className='pointer-events-none absolute z-20 rounded-lg border border-gray-200 bg-white p-3 shadow-lg'
      style={{
        left,
        top,
        maxWidth: '200px',
      }}
    >
      <div className='text-sm'>
        <h4 className='mb-1 font-semibold text-gray-900'>{nam_ja}</h4>
        <p className='text-xs text-gray-700'>
          {visited || 0} / {total || 0} 訪問済み
        </p>
        <p className='text-xs text-gray-700'>
          進捗: {Math.round((progress || 0) * 100)}%
        </p>
      </div>
    </div>
  );
}

export default HoverInfo;
