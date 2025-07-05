import React from "react";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/components/ui/accordion";
import { cn } from "~/lib/utils";

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
}

// 地域別グループ定義
const regionGroups = {
  "北海道": [1], // 北海道
  "東北": [2, 3, 4, 5, 6, 7], // 青森県、岩手県、宮城県、秋田県、山形県、福島県
  "関東": [8, 9, 10, 11, 12, 13, 14], // 茨城県、栃木県、群馬県、埼玉県、千葉県、東京都、神奈川県
  "中部": [15, 16, 17, 18, 19, 20, 21, 22, 23], // 新潟県、富山県、石川県、福井県、山梨県、長野県、岐阜県、静岡県、愛知県
  "近畿": [24, 25, 26, 27, 28, 29, 30], // 三重県、滋賀県、京都府、大阪府、兵庫県、奈良県、和歌山県
  "中国": [31, 32, 33, 34, 35], // 鳥取県、島根県、岡山県、広島県、山口県
  "四国": [36, 37, 38, 39], // 徳島県、香川県、愛媛県、高知県
  "九州": [40, 41, 42, 43, 44, 45, 46, 47], // 福岡県、佐賀県、長崎県、熊本県、大分県、宮崎県、鹿児島県、沖縄県
};

const PrefectureListSidebar: React.FC<PrefectureListSidebarProps> = ({
  prefectures,
  onPrefectureSelect,
  selectedPrefectureId,
}) => {
  const getProgressColor = (progress: number) => {
    if (progress === 0) return "bg-gray-200";
    if (progress < 0.3) return "bg-yellow-500";
    if (progress < 0.6) return "bg-orange-500";
    if (progress < 0.9) return "bg-red-500";
    return "bg-green-500";
  };

  const getBadgeColor = (progress: number) => {
    if (progress === 0) return "bg-gray-100 text-gray-600 hover:bg-gray-200";
    if (progress < 0.3) return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    if (progress < 0.6) return "bg-orange-100 text-orange-800 hover:bg-orange-200";
    if (progress < 0.9) return "bg-red-100 text-red-800 hover:bg-red-200";
    return "bg-green-100 text-green-800 hover:bg-green-200";
  };

  // 地域別に都道府県をグループ化
  const groupedPrefectures = Object.entries(regionGroups).map(([regionName, prefectureIds]) => {
    const regionPrefectures = prefectures.filter(p => prefectureIds.includes(p.id));
    const totalVisited = regionPrefectures.reduce((sum, p) => sum + p.visited, 0);
    const totalPlaces = regionPrefectures.reduce((sum, p) => sum + p.total, 0);
    const regionProgress = totalPlaces > 0 ? totalVisited / totalPlaces : 0;

    return {
      regionName,
      prefectures: regionPrefectures,
      totalVisited,
      totalPlaces,
      regionProgress,
    };
  });

  return (
    <div className="w-64 bg-background border-r border-border shadow-lg flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-border bg-card">
        <h1 className="text-lg font-bold text-foreground">Place Tracker</h1>
        <p className="text-xs text-muted-foreground mt-1">
          地域別一覧
        </p>
      </div>

      {/* 地域別アコーディオンリスト */}
      <ScrollArea className="flex-1 h-[calc(100vh-140px)]">
        <div className="p-2">
          <Accordion type="multiple" className="w-full">
            {groupedPrefectures.map(({ regionName, prefectures: regionPrefectures, totalVisited, totalPlaces, regionProgress }) => (
              <AccordionItem key={regionName} value={regionName} className="border-b border-border">
                <AccordionTrigger className="py-3 px-3 text-sm font-medium hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{regionName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {regionPrefectures.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {totalVisited}/{totalPlaces}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", getBadgeColor(regionProgress))}
                      >
                        {Math.round(regionProgress * 100)}%
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1 px-2">
                    {regionPrefectures.map((prefecture) => {
                      const progressPercentage = Math.round(prefecture.progress * 100);
                      const isSelected = selectedPrefectureId === prefecture.id;

                      return (
                        <div
                          key={prefecture.id}
                          className={cn(
                            "prefecture-list-item group relative p-2 rounded-md transition-all duration-200 cursor-pointer text-xs",
                            "hover:bg-accent hover:shadow-sm",
                            "focus-within:ring-1 focus-within:ring-ring",
                            isSelected
                              ? "bg-primary/10 border border-primary/20"
                              : "hover:bg-accent/50 border border-transparent"
                          )}
                          data-prefecture-id={prefecture.id}
                          onClick={() => onPrefectureSelect?.(prefecture.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onPrefectureSelect?.(prefecture.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {prefecture.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs ml-1", getBadgeColor(prefecture.progress))}
                            >
                              {progressPercentage}%
                            </Badge>
                          </div>

                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                            <span>{prefecture.visited}/{prefecture.total}</span>
                          </div>

                          <div className="relative h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-300",
                                getProgressColor(prefecture.progress)
                              )}
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>

                          {isSelected && (
                            <div className="absolute left-0 top-0 w-0.5 h-full bg-primary rounded-r-sm" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </ScrollArea>

      {/* フッター統計 */}
      <div className="p-3 border-t border-border bg-card/50">
        <div className="grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">
              {prefectures.filter(p => p.progress > 0).length}
            </p>
            <p className="text-xs text-muted-foreground">訪問済み</p>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {prefectures.filter(p => p.progress >= 1).length}
            </p>
            <p className="text-xs text-muted-foreground">完了</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrefectureListSidebar;
