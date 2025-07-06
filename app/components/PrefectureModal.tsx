import { useMemo } from 'react';

import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '~/components/ui/dialog';

interface PrefectureModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefecture: {
    id: number;
    name: string;
    visited: number;
    total: number;
  } | null;
  places: Array<{
    id: number;
    name: string;
    visited: boolean;
  }> | null;
  onToggleVisit: (placeId: number, visited: boolean) => void;
  errorMessage?: string | null;
  isLoading?: boolean;
}

function PrefectureModal({
  isOpen,
  onClose,
  prefecture,
  places,
  onToggleVisit,
  errorMessage,
  isLoading = false,
}: PrefectureModalProps) {
  // placesから楽観的に更新された進捗を計算
  const optimisticProgress = useMemo(() => {
    if (!prefecture) {
      return {
        visited: 0,
        total: 0,
        percentage: 0,
      };
    }

    if (!places || places.length === 0) {
      return {
        visited: prefecture.visited,
        total: prefecture.total,
        percentage:
          prefecture.total > 0
            ? (prefecture.visited / prefecture.total) * 100
            : 0,
      };
    }

    const visitedCount = places.filter(place => place.visited).length;
    const totalCount = places.length;

    return {
      visited: visitedCount,
      total: totalCount,
      percentage: totalCount > 0 ? (visitedCount / totalCount) * 100 : 0,
    };
  }, [places, prefecture]);

  if (!prefecture) return null;

  const progressPercentage = optimisticProgress.percentage;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='animate-in fade-in-0 zoom-in-95 mx-4 max-h-[80vh] max-w-2xl overflow-y-auto sm:mx-0'>
        <DialogHeader>
          <DialogTitle className='text-center text-xl font-bold sm:text-2xl'>
            {prefecture.name}
          </DialogTitle>
          <DialogDescription className='text-center text-sm text-gray-600 sm:text-base'>
            {isLoading
              ? 'データを読み込んでいます...'
              : `${prefecture.name}の観光スポットや名所を管理できます。`}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-6'>
          {/* エラーメッセージ表示 */}
          {errorMessage && (
            <div className='rounded-md border border-red-200 bg-red-50 p-4'>
              <div className='flex'>
                <div className='flex-shrink-0'>
                  <span className='text-red-400'>⚠️</span>
                </div>
                <div className='ml-3'>
                  <h3 className='text-sm font-medium text-red-800'>
                    エラーが発生しました
                  </h3>
                  <div className='mt-2 text-sm text-red-700'>
                    {errorMessage}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 進捗情報 */}
          <div className='text-center'>
            {isLoading ? (
              // ローディング状態のスケルトン表示
              <div className='space-y-4'>
                <div className='mx-auto h-6 w-48 animate-pulse rounded bg-gray-200'></div>
                <div className='mx-auto max-w-sm'>
                  <div className='h-3 w-full rounded-full bg-gray-200'></div>
                  <div className='mx-auto mt-2 h-4 w-16 animate-pulse rounded bg-gray-200'></div>
                </div>
              </div>
            ) : (
              <>
                <p className='mb-4 text-lg text-gray-600'>
                  訪問済み: {optimisticProgress.visited} /{' '}
                  {optimisticProgress.total}
                </p>
                <div className='mx-auto max-w-sm'>
                  <div className='h-3 w-full rounded-full bg-gray-200'>
                    <div
                      className='h-3 rounded-full bg-blue-600 transition-all duration-300'
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className='mt-2 text-sm text-gray-500'>
                    進捗: {Math.round(progressPercentage)}%
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 場所一覧 */}
          <div className='rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-4 text-lg font-semibold text-gray-900'>
              場所一覧
            </h3>
            <div className='max-h-60 space-y-2 overflow-y-auto'>
              {isLoading ? (
                // ローディング状態のスケルトン表示
                <div className='space-y-2'>
                  {Array.from(
                    { length: 5 },
                    (_, i) => `skeleton-item-${i}`
                  ).map((key, i) => (
                    <div
                      key={key}
                      className='flex items-center justify-between rounded-lg bg-white p-3 shadow-sm'
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animation: 'pulse 1.5s ease-in-out infinite',
                      }}
                    >
                      <div className='flex items-center'>
                        <div className='h-4 w-32 animate-pulse rounded bg-gray-200'></div>
                      </div>
                      <div className='h-8 w-16 animate-pulse rounded bg-gray-200'></div>
                    </div>
                  ))}
                </div>
              ) : places?.length === 0 ? (
                <div className='text-center text-gray-500'>
                  <p>このカテゴリには場所がありません</p>
                </div>
              ) : (
                places?.map(place => (
                  <div
                    key={place.id}
                    className='flex items-center justify-between rounded-lg bg-white p-3 shadow-sm'
                  >
                    <div className='flex items-center'>
                      <span className='text-sm font-medium text-gray-900'>
                        {place.name}
                      </span>
                      {place.visited && (
                        <span className='ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'>
                          訪問済み
                        </span>
                      )}
                    </div>

                    <Button
                      variant={place.visited ? 'destructive' : 'default'}
                      size='sm'
                      onClick={() => onToggleVisit(place.id, place.visited)}
                      className='text-xs'
                      disabled={isLoading}
                    >
                      {place.visited ? '✅ 解除' : '✅ 訪問'}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 閉じるボタン */}
          <div className='flex justify-center pt-4'>
            <Button onClick={onClose} variant='outline' className='px-8'>
              閉じる
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PrefectureModal;
