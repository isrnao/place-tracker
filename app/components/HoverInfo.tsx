import type { Feature } from 'geojson';
import React from 'react';

interface HoverInfoProps {
  hoveredFeature: Feature | null;
  position: { x: number; y: number };
}

function HoverInfo({ hoveredFeature, position }: HoverInfoProps) {
  if (!hoveredFeature) return null;

  const { nam_ja, visited, total, progress } = hoveredFeature.properties || {};

  return (
    <div
      className='pointer-events-none absolute z-20 rounded-lg border border-gray-200 bg-white p-3 shadow-lg'
      style={{
        left: Math.min(position.x + 10, window.innerWidth - 200),
        top: Math.max(position.y - 10, 10),
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
