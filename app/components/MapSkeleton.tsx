import React from 'react';

// 色のマッピングを静的クラス名で定義
const colorClasses = {
  red: {
    bg: 'bg-red-400',
    bgLight: 'bg-red-300',
    border: 'bg-red-400',
  },
  blue: {
    bg: 'bg-blue-400',
    bgLight: 'bg-blue-300',
    border: 'bg-blue-400',
  },
  green: {
    bg: 'bg-green-400',
    bgLight: 'bg-green-300',
    border: 'bg-green-400',
  },
  yellow: {
    bg: 'bg-yellow-400',
    bgLight: 'bg-yellow-300',
    border: 'bg-yellow-400',
  },
  purple: {
    bg: 'bg-purple-400',
    bgLight: 'bg-purple-300',
    border: 'bg-purple-400',
  },
  orange: {
    bg: 'bg-orange-400',
    bgLight: 'bg-orange-300',
    border: 'bg-orange-400',
  },
  pink: {
    bg: 'bg-pink-400',
    bgLight: 'bg-pink-300',
    border: 'bg-pink-400',
  },
  teal: {
    bg: 'bg-teal-400',
    bgLight: 'bg-teal-300',
    border: 'bg-teal-400',
  },
  gray: {
    bg: 'bg-gray-400',
    bgLight: 'bg-gray-300',
    border: 'bg-gray-400',
  },
  indigo: {
    bg: 'bg-indigo-400',
    bgLight: 'bg-indigo-300',
    border: 'bg-indigo-400',
  },
  emerald: {
    bg: 'bg-emerald-400',
    bgLight: 'bg-emerald-300',
    border: 'bg-emerald-400',
  },
} as const;

type ColorKey = keyof typeof colorClasses;

const pingConfigurations = [
  {
    id: 'ping-1',
    className: 'absolute top-1/4 left-1/3 h-32 w-32',
    animationDelay: '0s',
    animationDuration: '3s',
    opacity: 'opacity-20',
  },
  {
    id: 'ping-2',
    className: 'absolute right-1/4 bottom-1/3 h-24 w-24',
    animationDelay: '1s',
    animationDuration: '4s',
    opacity: 'opacity-15',
  },
  {
    id: 'ping-3',
    className: 'absolute top-1/2 right-1/3 h-20 w-20',
    animationDelay: '2s',
    animationDuration: '5s',
    opacity: 'opacity-10',
  },
];

const pinConfigurations = [
  {
    name: '北海道',
    position: 'absolute top-20 right-32',
    animationDelay: '0s',
    color: 'red' as ColorKey,
    size: 'h-8 w-8',
    stemHeight: 'h-3',
  },
  {
    name: '東北',
    position: 'absolute top-32 left-1/2',
    animationDelay: '0.5s',
    color: 'blue' as ColorKey,
    size: 'h-6 w-6',
    stemHeight: 'h-2',
  },
  {
    name: '関東',
    position:
      'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform',
    animationDelay: '1s',
    color: 'green' as ColorKey,
    size: 'h-10 w-10',
    stemHeight: 'h-4',
  },
  {
    name: '中部',
    position: 'absolute top-1/2 left-1/3',
    animationDelay: '1.5s',
    color: 'yellow' as ColorKey,
    size: 'h-7 w-7',
    stemHeight: 'h-3',
  },
  {
    name: '関西',
    position: 'absolute bottom-1/3 left-2/5',
    animationDelay: '2s',
    color: 'purple' as ColorKey,
    size: 'h-8 w-8',
    stemHeight: 'h-3',
  },
  {
    name: '四国',
    position: 'absolute right-1/3 bottom-1/4',
    animationDelay: '2.5s',
    color: 'orange' as ColorKey,
    size: 'h-6 w-6',
    stemHeight: 'h-2',
  },
  {
    name: '九州',
    position: 'absolute bottom-20 left-1/4',
    animationDelay: '3s',
    color: 'pink' as ColorKey,
    size: 'h-8 w-8',
    stemHeight: 'h-3',
  },
  {
    name: '沖縄',
    position: 'absolute bottom-12 left-20',
    animationDelay: '3.5s',
    color: 'teal' as ColorKey,
    size: 'h-5 w-5',
    stemHeight: 'h-2',
  },
];

const additionalPinConfigurations = [
  {
    id: 'add-pin-1',
    position: 'absolute top-40 right-1/4',
    animationDelay: '1.2s',
    color: 'gray' as ColorKey,
    size: 'h-3 w-3',
  },
  {
    id: 'add-pin-2',
    position: 'absolute bottom-1/2 left-1/5',
    animationDelay: '2.8s',
    color: 'indigo' as ColorKey,
    size: 'h-4 w-4',
  },
  {
    id: 'add-pin-3',
    position: 'absolute top-2/3 right-1/5',
    animationDelay: '4s',
    color: 'emerald' as ColorKey,
    size: 'h-3 w-3',
  },
];

interface PingAnimationProps {
  className: string;
  animationDelay: string;
  animationDuration: string;
  opacity: string;
}

function PingAnimation({
  className,
  animationDelay,
  animationDuration,
  opacity,
}: PingAnimationProps) {
  return (
    <div
      className={`${className} animate-ping rounded-full bg-white ${opacity}`}
      style={{ animationDelay, animationDuration }}
    ></div>
  );
}

function MapHeaderSkeleton() {
  return (
    <div className='absolute top-4 left-4 z-10 animate-pulse rounded-lg bg-white p-4 shadow-md'>
      <div className='mb-2 flex items-center space-x-2'>
        <div className='h-4 w-4 rounded-full bg-blue-300'></div>
        <div className='h-4 w-28 rounded bg-gray-300'></div>
      </div>
      <div className='flex items-center space-x-2'>
        <div className='h-3 w-3 rounded-full bg-green-300'></div>
        <div className='h-3 w-20 rounded bg-gray-300'></div>
      </div>
    </div>
  );
}

interface MapPinProps {
  id?: string;
  name?: string;
  position: string;
  animationDelay: string;
  color: ColorKey;
  size: string;
  stemHeight?: string;
}

function MapPin({
  position,
  animationDelay,
  color,
  size,
  stemHeight,
}: MapPinProps) {
  const colors = colorClasses[color];

  if (!stemHeight) {
    // 追加の小さなピン（stem なし）
    return (
      <div className={`${position} animate-pulse`} style={{ animationDelay }}>
        <div className={`${size} rounded-full ${colors.bg} shadow-md`}></div>
      </div>
    );
  }

  // メインピン（stem あり）
  return (
    <div className={`${position} animate-bounce`} style={{ animationDelay }}>
      <div className='flex flex-col items-center'>
        <div className={`relative ${size} rounded-full ${colors.bg} shadow-lg`}>
          <div
            className={`absolute inset-0 animate-ping rounded-full ${colors.bgLight}`}
          ></div>
        </div>
        <div className={`${stemHeight} w-0.5 ${colors.border}`}></div>
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className='absolute bottom-8 left-1/2 -translate-x-1/2 transform'>
      <div className='flex items-center space-x-3 rounded-lg bg-white px-6 py-3 shadow-lg'>
        <div className='h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600'></div>
        <span className='font-medium text-gray-700'>
          場所データを読み込み中...
        </span>
      </div>
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className='relative flex h-screen'>
      {/* メインコンテンツエリア */}
      <div className='relative flex-1 bg-gray-50'>
        {/* マップヘッダーのスケルトン */}
        <MapHeaderSkeleton />

        {/* 地図エリアのスケルトン */}
        <div className='relative h-full w-full overflow-hidden bg-gradient-to-br from-blue-100 to-green-100'>
          {/* 背景の波紋エフェクト */}
          {pingConfigurations.map(config => (
            <PingAnimation key={config.id} {...config} />
          ))}

          {/* アニメーションするピン群 */}
          <div className='absolute inset-0'>
            {/* メインエリアのピン */}
            {pinConfigurations.map(pin => (
              <MapPin key={pin.name} {...pin} />
            ))}

            {/* 追加の小さなピン */}
            {additionalPinConfigurations.map(pin => (
              <MapPin key={pin.id} {...pin} />
            ))}
          </div>

          {/* ローディングテキスト */}
          <LoadingIndicator />
        </div>
      </div>
    </div>
  );
}
