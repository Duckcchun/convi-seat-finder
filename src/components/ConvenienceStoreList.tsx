import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StoreItem } from './StoreItem';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { RefreshCw, Search, X, List } from 'lucide-react';
import { Store } from '../types/store';

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
  const [filteredStores, setFilteredStores] = useState(stores);
  const [displayedItemsCount, setDisplayedItemsCount] = useState(ITEMS_PER_PAGE);
  const observerTarget = useRef<HTMLDivElement>(null);

  // 검색 기능
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setDisplayedItemsCount(ITEMS_PER_PAGE); // 검색 시 초기값으로 리셋
    
    if (!query.trim()) {
      setFilteredStores(stores);
      return;
    }

    const filtered = stores.filter(
      (store) =>
        store &&
        store.name &&
        store.address &&
        (store.name.toLowerCase().includes(query.toLowerCase()) ||
        store.address.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredStores(filtered);
  }, [stores]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setDisplayedItemsCount(ITEMS_PER_PAGE);
    setFilteredStores(stores);
  }, [stores]);

  // stores가 변경될 때마다 필터링된 목록 업데이트 및 카운트 리셋
  useEffect(() => {
    setDisplayedItemsCount(ITEMS_PER_PAGE);
    if (searchQuery.trim()) {
      const filtered = stores.filter(
        (store) =>
          store &&
          store.name &&
          store.address &&
          (store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          store.address.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredStores(filtered);
    } else {
      setFilteredStores(stores);
    }
  }, [stores, searchQuery]);

  // 무한 스크롤: 마지막 요소가 보일 때 더 많은 아이템 로드
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && displayedItemsCount < filteredStores.length) {
          setDisplayedItemsCount(prev => prev + ITEMS_PER_PAGE);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedItemsCount, filteredStores.length]);

  const displayedStores = filteredStores.slice(0, displayedItemsCount);
  const hasSeatingCount = displayedStores.filter(store => store.hasSeating === 'yes').length;
  const noSeatingCount = displayedStores.filter(store => store.hasSeating === 'no').length;
  const unknownCount = displayedStores.filter(store => store.hasSeating === 'unknown').length;
  const hasMoreItems = displayedItemsCount < filteredStores.length;

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

        {/* 통계 정보 */}
        <div className="flex flex-wrap gap-2.5 text-sm">
          <div className="px-3 py-1 bg-gray-100 rounded-full">
            전체: {displayedStores.length}개
          </div>
          <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full">
            좌석 있음: {hasSeatingCount}개
          </div>
          <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full">
            좌석 없음: {noSeatingCount}개
          </div>
          <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full">
            정보 부족: {unknownCount}개
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