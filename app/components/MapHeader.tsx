import { Menu } from 'lucide-react';
import React from 'react';

import { Button } from '~/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '~/components/ui/sheet';

interface MapHeaderProps {
  categoryName?: string;
  overallProgress: {
    visited: number;
    total: number;
    percentage: number;
  };
  sidebarContent: React.ReactNode;
}

function MapHeader({
  categoryName,
  overallProgress,
  sidebarContent,
}: MapHeaderProps) {
  return (
    <div className='absolute top-4 left-4 z-50 flex items-center gap-3'>
      {/* ハンバーガーメニュー */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            className='h-10 w-10 border border-gray-200/50 bg-white/90 shadow-md backdrop-blur-sm hover:bg-white/95'
          >
            <Menu className='h-4 w-4' />
          </Button>
        </SheetTrigger>
        <SheetContent side='left' className='w-64 p-0'>
          <SheetHeader className='sr-only'>
            <SheetTitle>Place Tracker</SheetTitle>
            <SheetDescription>都道府県別の訪問状況を表示</SheetDescription>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* カテゴリ名と進捗表示 */}
      <div className='max-w-[200px] rounded-md border border-gray-200/50 bg-white/90 px-3 py-2 shadow-md backdrop-blur-sm'>
        <div className='mb-1 flex items-center gap-2'>
          <div className='h-1.5 w-1.5 rounded-full bg-blue-500'></div>
          <span className='truncate text-xs font-medium text-gray-900'>
            {categoryName || '全体の進捗'}
          </span>
        </div>
        <div className='flex items-center justify-between text-xs text-gray-600'>
          <span className='text-xs'>
            {overallProgress.visited}/{overallProgress.total}
          </span>
          <span className='ml-2 text-xs font-medium text-blue-600'>
            {overallProgress.percentage}%
          </span>
        </div>
        <div className='mt-1.5 h-1 w-full rounded-full bg-gray-200'>
          <div
            className='h-1 rounded-full bg-blue-500 transition-all duration-300'
            style={{ width: `${overallProgress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default MapHeader;
