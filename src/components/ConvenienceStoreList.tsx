import { useState, useEffect, useCallback, useRef } from 'react';
import { StoreItem } from './StoreItem';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { RefreshCw, Search, X, List, HelpCircle } from 'lucide-react';
import { Store, SeatType, SEAT_TYPE_VALUES } from '../types/store';
import { SEAT_TYPE_META } from '../utils/formatters';

interface ConvenienceStoreListProps {
  stores: Store[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (storeId: string) => void;
}

const ITEMS_PER_PAGE = 20; // 한 번에 보여줄 항목 수

export function ConvenienceStoreList({ 
  stores, 
  isLoading, 
  onRefresh, 
  onDelete 
}: ConvenienceStoreListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  // 좌석 형태 필터. 선택된 형태가 하나라도 있으면 "좌석 있음 + 해당 형태 포함" 매장만 노출한다.
  const [selectedSeatTypes, setSelectedSeatTypes] = useState<SeatType[]>([]);
  // 좌석 정보가 확인된 매장(있음/없음)만 보기. 콜드스타트 시 물음표(unknown) 매장을 숨겨 첫인상을 개선한다.
  const [hideUnknown, setHideUnknown] = useState(false);
  const [filteredStores, setFilteredStores] = useState(stores);
  const [displayedItemsCount, setDisplayedItemsCount] = useState(ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);
  const brandOptions = ['all', 'CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱', '씨스페이스'];

  const filterStores = useCallback(
    (query: string, brand: string, seatTypes: SeatType[], onlyConfirmed: boolean) => {
      const normalizedQuery = query.trim().toLowerCase();

      return stores.filter((store) => {
        if (!store || !store.name || !store.address) return false;

        if (brand !== 'all' && !store.name.includes(brand)) {
          return false;
        }

        // 좌석 정보 미확인(unknown) 매장 숨기기
        if (onlyConfirmed && store.hasSeating === 'unknown') {
          return false;
        }

        // 좌석 형태 필터: 선택된 형태를 모두 만족(AND)하는 매장만 남긴다.
        if (seatTypes.length > 0) {
          if (store.hasSeating !== 'yes') return false;
          const storeSeatTypes = store.seatTypes ?? [];
          const matchesAll = seatTypes.every((type) => storeSeatTypes.includes(type));
          if (!matchesAll) return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        return (
          store.name.toLowerCase().includes(normalizedQuery) ||
          store.address.toLowerCase().includes(normalizedQuery)
        );
      });
    },
    [stores],
  );

  const toggleSeatTypeFilter = useCallback((type: SeatType) => {
    setDisplayedItemsCount(ITEMS_PER_PAGE);
    setSelectedSeatTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  // 검색 기능
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setDisplayedItemsCount(ITEMS_PER_PAGE); // 검색 시 초기값으로 리셋
    setFilteredStores(filterStores(query, selectedBrand, selectedSeatTypes, hideUnknown));
  }, [filterStores, selectedBrand, selectedSeatTypes, hideUnknown]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setDisplayedItemsCount(ITEMS_PER_PAGE);
    setFilteredStores(filterStores('', selectedBrand, selectedSeatTypes, hideUnknown));
  }, [filterStores, selectedBrand, selectedSeatTypes, hideUnknown]);

  // stores/필터가 변경될 때마다 필터링된 목록만 업데이트
  useEffect(() => {
    setFilteredStores(filterStores(searchQuery, selectedBrand, selectedSeatTypes, hideUnknown));
  }, [filterStores, searchQuery, selectedBrand, selectedSeatTypes, hideUnknown]);

  useEffect(() => {
    setDisplayedItemsCount(ITEMS_PER_PAGE);
  }, [selectedBrand, hideUnknown]);

  // 검색어 변경 시에만 표시 개수를 초기화
  useEffect(() => {
    setDisplayedItemsCount(ITEMS_PER_PAGE);
  }, [searchQuery]);

  // 필터 결과 길이가 줄어든 경우 현재 표시 개수를 안전하게 보정
  useEffect(() => {
    setDisplayedItemsCount((prev) => Math.min(Math.max(prev, ITEMS_PER_PAGE), filteredStores.length || ITEMS_PER_PAGE));
  }, [filteredStores.length]);

  // 무한 스크롤: 마지막 요소가 보일 때 더 많은 아이템 로드
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && displayedItemsCount < filteredStores.length) {
          setDisplayedItemsCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      {
        threshold: 0,
        rootMargin: '450px 0px',
      }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedItemsCount, filteredStores.length]);

  const displayedStores = filteredStores.slice(0, displayedItemsCount);
  // 통계는 화면 표시분이 아니라 필터된 전체 결과 기준으로 집계한다.
  const hasSeatingCount = filteredStores.filter(store => store.hasSeating === 'yes').length;
  const noSeatingCount = filteredStores.filter(store => store.hasSeating === 'no').length;
  const unknownCount = filteredStores.filter(store => store.hasSeating === 'unknown').length;
  const hasMoreItems = displayedItemsCount < filteredStores.length;
  // 전체 매장 중 좌석 정보가 확인된(있음/없음) 비율 — 콜드스타트 안내에 사용
  const confirmedCount = stores.filter(store => store.hasSeating !== 'unknown').length;
  const noConfirmedData = confirmedCount === 0 && stores.length > 0;

  return (
    <Card className="w-full gap-4">
      <CardHeader className="px-6 pb-2 pt-6">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="flex items-center space-x-2 text-lg font-semibold">
            <List className="h-5 w-5" />
            <span>제보된 편의점 목록</span>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
            className="shrink-0"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-5 pt-0">
        {/* 검색 바 */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="제보된 편의점 이름 또는 주소로 검색..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {brandOptions.map((brand) => (
            <Button
              key={brand}
              type="button"
              variant={selectedBrand === brand ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedBrand(brand)}
            >
              {brand === 'all' ? '전체' : brand}
            </Button>
          ))}
        </div>

        {/* 좌석 형태 필터 */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">좌석 형태</span>
          {SEAT_TYPE_VALUES.map((type) => {
            const meta = SEAT_TYPE_META[type];
            const active = selectedSeatTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleSeatTypeFilter(type)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-200 bg-white text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {meta.emoji} {meta.label}
              </button>
            );
          })}
          {selectedSeatTypes.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedSeatTypes([]);
                setDisplayedItemsCount(ITEMS_PER_PAGE);
              }}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" /> 형태 초기화
            </button>
          )}
        </div>

        {/* 정보 있는 매장만 보기 토글 */}
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="leading-tight">
              <p className="text-sm font-medium text-slate-700">정보 있는 매장만 보기</p>
              <p className="text-xs text-slate-500">좌석 정보가 아직 없는 매장을 숨깁니다</p>
            </div>
          </div>
          <Switch checked={hideUnknown} onCheckedChange={setHideUnknown} aria-label="정보 있는 매장만 보기" />
        </div>

        {/* 콜드스타트 안내: 확인된 좌석 정보가 하나도 없을 때 */}
        {noConfirmedData && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-medium text-blue-900">아직 이 지역의 좌석 정보가 부족해요</p>
            <p className="mt-1 text-xs text-blue-700">
              등록된 편의점 위치는 있지만 좌석 정보는 아직 확인되지 않았어요. 지도에서 편의점을 눌러 첫 제보자가 되어주세요!
            </p>
          </div>
        )}

        {/* 통계 정보 */}
        <div className="flex flex-wrap gap-y-2 text-xs" style={{ gap: '0 0.35rem' }}>
          <div className="px-3 py-1 bg-gray-100 rounded-full whitespace-nowrap">
            전체: {filteredStores.length}개
          </div>
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full whitespace-nowrap">
            좌석 있음: {hasSeatingCount}개
          </div>
          <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full whitespace-nowrap">
            좌석 없음: {noSeatingCount}개
          </div>
          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full whitespace-nowrap">
            미확인: {unknownCount}개
          </div>
        </div>

        {/* 편의점 목록 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">편의점 정보를 불러오는 중...</span>
          </div>
        ) : displayedStores.length === 0 ? (
          <div className="text-center py-8">
            {searchQuery ? (
              <div className="space-y-2">
                <Search className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-gray-500">'{searchQuery}'에 대한 검색 결과가 없습니다.</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClear}
                >
                  검색 초기화
                </Button>
              </div>
            ) : hideUnknown ? (
              <div className="space-y-3">
                <HelpCircle className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-gray-500">좌석 정보가 확인된 매장이 아직 없어요.</p>
                <p className="text-sm text-gray-400">
                  지도에서 편의점을 눌러 좌석 정보를 제보하면 여기에 표시됩니다.
                </p>
                <Button variant="outline" size="sm" onClick={() => setHideUnknown(false)}>
                  미확인 매장도 보기
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <List className="h-8 w-8 mx-auto text-gray-400" />
                <p className="text-gray-500">아직 제보된 편의점이 없습니다.</p>
                <p className="text-sm text-gray-400">
                  첫 번째 편의점 정보를 제보해보세요!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedStores.map((store) => (
              <StoreItem 
                key={store.id}
                store={store} 
                onDelete={onDelete}
              />
            ))}
            
            {/* 무한 스크롤 트리거 */}
            <div ref={observerTarget} className="h-8" />
            
            {/* 더 로드 중 표시 */}
            {hasMoreItems && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-pulse text-sm text-gray-500">
                  더 불러오는 중... ({displayedItemsCount} / {filteredStores.length})
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}