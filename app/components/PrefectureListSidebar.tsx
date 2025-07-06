import React from 'react';

import SidebarContent from './SidebarContent';

interface Prefecture {
  id: number;
  name: string;
  visited: number;
  total: number;
  progress: number;
}

interface PrefectureListSidebarProps {
  prefectures: Prefecture[];
  onPrefectureSelect?: (prefectureId: number) => void;
  selectedPrefectureId?: number;
  categoryName?: string;
}

function PrefectureListSidebar({
  prefectures,
  onPrefectureSelect,
  selectedPrefectureId,
  categoryName,
}: PrefectureListSidebarProps) {
  return (
    <SidebarContent
      prefectures={prefectures}
      onPrefectureSelect={onPrefectureSelect}
      selectedPrefectureId={selectedPrefectureId}
      categoryName={categoryName}
    />
  );
}

export default PrefectureListSidebar;
