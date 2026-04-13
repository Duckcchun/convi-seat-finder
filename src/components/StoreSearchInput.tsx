import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Search, MapPin, Check, X } from 'lucide-react';
import { ConvenienceStoreSearchResult, StoreSelectInfo } from '../types/store';

declare global {
  interface Window {
    kakao: any;
  }
}

interface StoreSearchInputProps {
  value: string;
  onValueChange: (value: string) => void;
  onStoreSelect: (store: StoreSelectInfo) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function StoreSearchInput({ 
  value, 
  onValueChange, 
  onStoreSelect, 
  placeholder = "편의점 이름을 입력하세요", 
  disabled = false 
}: StoreSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<ConvenienceStoreSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 카카오 지도 API 사용 가능 여부 확인
  useEffect(() => {
    const checkApiAvailability = () => {
      if (window.kakao && window.kakao.maps && window.kakao.maps.services) {
        setApiAvailable(true);
        return;
      }

      // index.html에서 카카오 SDK를 로드하므로 없으면 검색 자동완성만 비활성화한다.
      setApiAvailable(false);
    };

    checkApiAvailability();
  }, []);

  // 편의점 검색 함수
  const searchStores = async (query: string) => {
    if (!query.trim() || !window.kakao?.maps?.services || apiAvailable === false) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const places = new window.kakao.maps.services.Places();
      
      places.keywordSearch(`${query.trim()} 편의점`, (data: ConvenienceStoreSearchResult[], status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const convenienceBrands = ['CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱', '씨스페이스'];
          const filteredResults = data.filter(place => 
            convenienceBrands.some(brand => 
              place.place_name.includes(brand)
            )
          ).slice(0, 15);
          
          setSearchResults(filteredResults);
          setSelectedIndex(-1);
        } else {
          setSearchResults([]);
        }
        setIsSearching(false);
      }, {
        category_group_code: 'CS2',
        size: 15
      });
    } catch {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onValueChange(newValue);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (newValue.trim() && apiAvailable !== false) {
      setIsOpen(true);
      searchTimeoutRef.current = setTimeout(() => {
        searchStores(newValue);
      }, 300);
    } else {
      setIsOpen(false);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // 편의점 선택 핸들러
  const handleStoreSelect = (store: ConvenienceStoreSearchResult) => {
    onValueChange(store.place_name);
    onStoreSelect({
      name: store.place_name,
      address: store.road_address_name || store.address_name,
      latitude: parseFloat(store.y),
      longitude: parseFloat(store.x)
    });
    setIsOpen(false);
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleStoreSelect(searchResults[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) {
              setIsOpen(true);
            }
          }}
          disabled={disabled}
          className="h-11 px-4 py-3 pr-10 bg-white border-slate-300 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isSearching ? (
            <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* API 사용 불가 시 안내 */}
      {apiAvailable === false && (
        <p className="text-xs text-gray-500 mt-1">
          지도 API를 사용할 수 없어 자동완성 검색이 제한됩니다. 직접 입력해주세요.
        </p>
      )}

      {/* 검색 결과 드롭다운 */}
      {isOpen && (
        <>
          {isSearching && (
            <div className="absolute z-1000 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <div className="text-center text-gray-500 text-sm">
                <div className="inline-block animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                <p className="mt-2">검색 중...</p>
              </div>
            </div>
          )}
          
          {!isSearching && searchResults.length > 0 && (
            <div className="absolute z-1000 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {searchResults.map((store, index) => (
            <button
              key={store.id}
              onClick={() => handleStoreSelect(store)}
              className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {store.place_name}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {store.road_address_name || store.address_name}
                  </div>
                  {store.phone && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      📞 {store.phone}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <Check className="h-4 w-4 text-blue-600 shrink-0" />
                )}
              </div>
            </button>
          ))}
            </div>
          )}
          
          {!isSearching && searchResults.length === 0 && value.trim() && apiAvailable && (
            <div className="absolute z-1000 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <div className="text-center text-gray-500 text-sm">
                <X className="h-4 w-4 mx-auto mb-1 opacity-50" />
                검색 결과가 없습니다.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}