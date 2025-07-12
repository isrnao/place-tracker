import React from 'react';

export function MapSkeleton() {
  return (
    <div className='relative flex h-screen'>
      {/* メインコンテンツエリア */}
      <div className='relative flex-1 bg-gray-50'>
        {/* マップヘッダーのスケルトン */}
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

        {/* 地図エリアのスケルトン */}
        <div className='relative h-full w-full overflow-hidden bg-gradient-to-br from-blue-100 to-green-100'>
          {/* 背景の波紋エフェクト */}
          <div
            className='absolute top-1/4 left-1/3 h-32 w-32 animate-ping rounded-full bg-white opacity-20'
            style={{ animationDelay: '0s', animationDuration: '3s' }}
          ></div>
          <div
            className='absolute right-1/4 bottom-1/3 h-24 w-24 animate-ping rounded-full bg-white opacity-15'
            style={{ animationDelay: '1s', animationDuration: '4s' }}
          ></div>
          <div
            className='absolute top-1/2 right-1/3 h-20 w-20 animate-ping rounded-full bg-white opacity-10'
            style={{ animationDelay: '2s', animationDuration: '5s' }}
          ></div>

          {/* アニメーションするピン群 */}
          <div className='absolute inset-0'>
            {/* 北海道エリアのピン */}
            <div
              className='absolute top-20 right-32 animate-bounce'
              style={{ animationDelay: '0s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-8 w-8 rounded-full bg-red-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-red-300'></div>
                </div>
                <div className='h-3 w-0.5 bg-red-400'></div>
              </div>
            </div>

            {/* 東北エリアのピン */}
            <div
              className='absolute top-32 left-1/2 animate-bounce'
              style={{ animationDelay: '0.5s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-6 w-6 rounded-full bg-blue-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-blue-300'></div>
                </div>
                <div className='h-2 w-0.5 bg-blue-400'></div>
              </div>
            </div>

            {/* 関東エリアのピン */}
            <div
              className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform animate-bounce'
              style={{ animationDelay: '1s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-10 w-10 rounded-full bg-green-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-green-300'></div>
                </div>
                <div className='h-4 w-0.5 bg-green-400'></div>
              </div>
            </div>

            {/* 中部エリアのピン */}
            <div
              className='absolute top-1/2 left-1/3 animate-bounce'
              style={{ animationDelay: '1.5s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-7 w-7 rounded-full bg-yellow-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-yellow-300'></div>
                </div>
                <div className='h-3 w-0.5 bg-yellow-400'></div>
              </div>
            </div>

            {/* 関西エリアのピン */}
            <div
              className='absolute bottom-1/3 left-2/5 animate-bounce'
              style={{ animationDelay: '2s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-8 w-8 rounded-full bg-purple-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-purple-300'></div>
                </div>
                <div className='h-3 w-0.5 bg-purple-400'></div>
              </div>
            </div>

            {/* 四国エリアのピン */}
            <div
              className='absolute right-1/3 bottom-1/4 animate-bounce'
              style={{ animationDelay: '2.5s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-6 w-6 rounded-full bg-orange-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-orange-300'></div>
                </div>
                <div className='h-2 w-0.5 bg-orange-400'></div>
              </div>
            </div>

            {/* 九州エリアのピン */}
            <div
              className='absolute bottom-20 left-1/4 animate-bounce'
              style={{ animationDelay: '3s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-8 w-8 rounded-full bg-pink-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-pink-300'></div>
                </div>
                <div className='h-3 w-0.5 bg-pink-400'></div>
              </div>
            </div>

            {/* 沖縄エリアのピン */}
            <div
              className='absolute bottom-12 left-20 animate-bounce'
              style={{ animationDelay: '3.5s' }}
            >
              <div className='flex flex-col items-center'>
                <div className='relative h-5 w-5 rounded-full bg-teal-400 shadow-lg'>
                  <div className='absolute inset-0 animate-ping rounded-full bg-teal-300'></div>
                </div>
                <div className='h-2 w-0.5 bg-teal-400'></div>
              </div>
            </div>

            {/* 追加の小さなピン */}
            <div
              className='absolute top-40 right-1/4 animate-pulse'
              style={{ animationDelay: '1.2s' }}
            >
              <div className='h-3 w-3 rounded-full bg-gray-400 shadow-md'></div>
            </div>

            <div
              className='absolute bottom-1/2 left-1/5 animate-pulse'
              style={{ animationDelay: '2.8s' }}
            >
              <div className='h-4 w-4 rounded-full bg-indigo-400 shadow-md'></div>
            </div>

            <div
              className='absolute top-2/3 right-1/5 animate-pulse'
              style={{ animationDelay: '4s' }}
            >
              <div className='h-3 w-3 rounded-full bg-emerald-400 shadow-md'></div>
            </div>
          </div>

          {/* ローディングテキスト */}
          <div className='absolute bottom-8 left-1/2 -translate-x-1/2 transform'>
            <div className='flex items-center space-x-3 rounded-lg bg-white px-6 py-3 shadow-lg'>
              <div className='h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600'></div>
              <span className='font-medium text-gray-700'>
                場所データを読み込み中...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
