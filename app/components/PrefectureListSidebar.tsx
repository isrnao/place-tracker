import { Link, useNavigate } from 'react-router';

import { useCurrentUser } from '~/api/hooks';
import { signOut } from '~/api/supabaseClient';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { cn } from '~/lib/utils';

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
  北海道: [1], // 北海道
  東北: [2, 3, 4, 5, 6, 7], // 青森県、岩手県、宮城県、秋田県、山形県、福島県
  関東: [8, 9, 10, 11, 12, 13, 14], // 茨城県、栃木県、群馬県、埼玉県、千葉県、東京都、神奈川県
  中部: [15, 16, 17, 18, 19, 20, 21, 22, 23], // 新潟県、富山県、石川県、福井県、山梨県、長野県、岐阜県、静岡県、愛知県
  近畿: [24, 25, 26, 27, 28, 29, 30], // 三重県、滋賀県、京都府、大阪府、兵庫県、奈良県、和歌山県
  中国: [31, 32, 33, 34, 35], // 鳥取県、島根県、岡山県、広島県、山口県
  四国: [36, 37, 38, 39], // 徳島県、香川県、愛媛県、高知県
  九州: [40, 41, 42, 43, 44, 45, 46, 47], // 福岡県、佐賀県、長崎県、熊本県、大分県、宮崎県、鹿児島県、沖縄県
};

const PrefectureListSidebar: React.FC<PrefectureListSidebarProps> = ({
  prefectures,
  onPrefectureSelect,
  selectedPrefectureId,
}) => {
  const { data: userId } = useCurrentUser();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      // エラーが発生した場合でもログイン画面にリダイレクト
      navigate('/login', { replace: true });
    }
  };
  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200';
    if (progress < 0.3) return 'bg-yellow-500';
    if (progress < 0.6) return 'bg-orange-500';
    if (progress < 0.9) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getBadgeColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    if (progress < 0.3)
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    if (progress < 0.6)
      return 'bg-orange-100 text-orange-800 hover:bg-orange-200';
    if (progress < 0.9) return 'bg-red-100 text-red-800 hover:bg-red-200';
    return 'bg-green-100 text-green-800 hover:bg-green-200';
  };

  // 地域別に都道府県をグループ化
  const groupedPrefectures = Object.entries(regionGroups).map(
    ([regionName, prefectureIds]) => {
      const regionPrefectures = prefectures.filter(p =>
        prefectureIds.includes(p.id)
      );
      const totalVisited = regionPrefectures.reduce(
        (sum, p) => sum + p.visited,
        0
      );
      const totalPlaces = regionPrefectures.reduce(
        (sum, p) => sum + p.total,
        0
      );
      const regionProgress = totalPlaces > 0 ? totalVisited / totalPlaces : 0;

      return {
        regionName,
        prefectures: regionPrefectures,
        totalVisited,
        totalPlaces,
        regionProgress,
      };
    }
  );

  return (
    <div className='bg-background border-border flex w-64 flex-col border-r shadow-lg'>
      {/* ヘッダー */}
      <div className='border-border bg-card border-b p-4'>
        <h1 className='text-foreground text-lg font-bold'>Place Tracker</h1>
        <p className='text-muted-foreground mt-1 text-xs'>地域別一覧</p>
        <div className='mt-2'>
          {userId ? (
            <button
              onClick={handleSignOut}
              className='text-primary text-xs underline'
            >
              Logout
            </button>
          ) : (
            <Link to='/login' className='text-primary text-xs underline'>
              Login
            </Link>
          )}
        </div>
      </div>

      {/* 地域別アコーディオンリスト */}
      <ScrollArea className='h-[calc(100vh-140px)] flex-1'>
        <div className='p-2'>
          <Accordion type='multiple' className='w-full'>
            {groupedPrefectures.map(
              ({
                regionName,
                prefectures: regionPrefectures,
                totalVisited,
                totalPlaces,
                regionProgress,
              }) => (
                <AccordionItem
                  key={regionName}
                  value={regionName}
                  className='border-border border-b'
                >
                  <AccordionTrigger className='px-3 py-3 text-sm font-medium hover:no-underline'>
                    <div className='mr-2 flex w-full items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <span className='text-foreground'>{regionName}</span>
                        <Badge variant='secondary' className='text-xs'>
                          {regionPrefectures.length}
                        </Badge>
                      </div>
                      <div className='flex items-center gap-2'>
                        <span className='text-muted-foreground text-xs'>
                          {totalVisited}/{totalPlaces}
                        </span>
                        <Badge
                          variant='secondary'
                          className={cn(
                            'text-xs',
                            getBadgeColor(regionProgress)
                          )}
                        >
                          {Math.round(regionProgress * 100)}%
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className='pb-2'>
                    <div className='space-y-1 px-2'>
                      {regionPrefectures.map(prefecture => {
                        const progressPercentage = Math.round(
                          prefecture.progress * 100
                        );
                        const isSelected =
                          selectedPrefectureId === prefecture.id;

                        return (
                          <div
                            key={prefecture.id}
                            className={cn(
                              'prefecture-list-item group relative cursor-pointer rounded-md p-2 text-xs transition-all duration-200',
                              'hover:bg-accent hover:shadow-sm',
                              'focus-within:ring-ring focus-within:ring-1',
                              isSelected
                                ? 'bg-primary/10 border-primary/20 border'
                                : 'hover:bg-accent/50 border border-transparent'
                            )}
                            data-prefecture-id={prefecture.id}
                            onClick={() => onPrefectureSelect?.(prefecture.id)}
                            role='button'
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onPrefectureSelect?.(prefecture.id);
                              }
                            }}
                          >
                            <div className='mb-1 flex items-center justify-between'>
                              <span className='text-foreground group-hover:text-primary truncate font-medium transition-colors'>
                                {prefecture.name}
                              </span>
                              <Badge
                                variant='secondary'
                                className={cn(
                                  'ml-1 text-xs',
                                  getBadgeColor(prefecture.progress)
                                )}
                              >
                                {progressPercentage}%
                              </Badge>
                            </div>

                            <div className='text-muted-foreground mb-1 flex items-center justify-between text-xs'>
                              <span>
                                {prefecture.visited}/{prefecture.total}
                              </span>
                            </div>

                            <div className='bg-secondary relative h-1 overflow-hidden rounded-full'>
                              <div
                                className={cn(
                                  'h-full transition-all duration-300',
                                  getProgressColor(prefecture.progress)
                                )}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>

                            {isSelected && (
                              <div className='bg-primary absolute top-0 left-0 h-full w-0.5 rounded-r-sm' />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            )}
          </Accordion>
        </div>
      </ScrollArea>

      {/* フッター統計 */}
      <div className='border-border bg-card/50 border-t p-3'>
        <div className='grid grid-cols-2 gap-2 text-center'>
          <div>
            <p className='text-foreground text-sm font-medium'>
              {prefectures.filter(p => p.progress > 0).length}
            </p>
            <p className='text-muted-foreground text-xs'>訪問済み</p>
          </div>
          <div>
            <p className='text-foreground text-sm font-medium'>
              {prefectures.filter(p => p.progress >= 1).length}
            </p>
            <p className='text-muted-foreground text-xs'>完了</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrefectureListSidebar;
