import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { MapPin, Navigation, Search, Filter, Map } from 'lucide-react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { QuickBrandButtons } from './QuickBrandButtons';
import { Store, ConvenienceStoreSearchResult, StoreSelectInfo } from '../types/store';

// 카카오 맵 API 타입 정의
declare global {
  interface Window {
    kakao: any;
  }
}

interface MapViewProps {
  stores: Store[];
  onStoreSelect: (storeInfo: StoreSelectInfo) => void;
}

export function MapView({ stores, onStoreSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [ps, setPs] = useState<any>(null);
  const [infowindow, setInfowindow] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nearbyStores, setNearbyStores] = useState<ConvenienceStoreSearchResult[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapApiAvailable, setMapApiAvailable] = useState<boolean | null>(null);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [isSearching, setIsSearching] = useState(false);

  // 편의점 브랜드 목록
  const convenienceBrands = [
    { value: 'all', label: '전체' },
    { value: 'CU', label: 'CU' },
    { value: 'GS25', label: 'GS25' },
    { value: '세븐일레븐', label: '세븐일레븐' },
    { value: '이마트24', label: '이마트24' },
    { value: '미니스톱', label: '미니스톱' },
    { value: '씨스페이스', label: '씨스페이스' }
  ];

  // 카카오맵 스크립트 로드
  useEffect(() => {
    const loadKakaoMap = async () => {
      try {
        if (window.kakao && window.kakao.maps) {
          initializeMap();
          setMapApiAvailable(true);
          return;
        }

        let apiKey: string | null = null;
        
        try {
          const { projectId, publicAnonKey } = await import('../utils/supabase/info');
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/env/KAKAO_MAP_API_KEY`, {
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            apiKey = data.value;
          }
        } catch (error) {
          // 환경변수 접근 실패
        }
        
        if (!apiKey || apiKey.trim() === '' || apiKey === 'demo-key-needs-setup') {
          setMapApiAvailable(false);
          return;
        }
        
        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;
        script.async = true;
        
        script.onload = () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              initializeMap();
              setMapApiAvailable(true);
            });
          } else {
            setMapApiAvailable(false);
          }
        };
        
        script.onerror = () => {
          setMapApiAvailable(false);
        };
        
        document.head.appendChild(script);
        
        setTimeout(() => {
          if (mapApiAvailable === null) {
            setMapApiAvailable(false);
          }
        }, 5000);
        
      } catch (error) {
        setMapApiAvailable(false);
      }
    };

    loadKakaoMap();
  }, [mapApiAvailable]);

  // 지도 초기화
  const initializeMap = useCallback(() => {
    if (!mapContainer.current || !window.kakao?.maps) {
      return;
    }

    try {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 3
      };

      const mapInstance = new window.kakao.maps.Map(mapContainer.current, options);
      const placesService = new window.kakao.maps.services.Places();
      const infowindowInstance = new window.kakao.maps.InfoWindow({ zIndex: 1 });

      setMap(mapInstance);
      setPs(placesService);
      setInfowindow(infowindowInstance);

      // 지도 클릭 이벤트
      window.kakao.maps.event.addListener(mapInstance, 'click', function(mouseEvent: any) {
        const latlng = mouseEvent.latLng;
        const latitude = latlng.getLat();
        const longitude = latlng.getLng();

        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const address = result[0].address.address_name;
            onStoreSelect({
              name: '',
              address: address,
              latitude: latitude,
              longitude: longitude
            });
          }
        });
      });

      getCurrentLocation(mapInstance);
      displayReportedStores(mapInstance);
    } catch (error) {
      console.error('지도 초기화 중 오류:', error);
      setMapApiAvailable(false);
    }
  }, [onStoreSelect]);

  // 나머지 메서드들은 동일하므로 생략...
  // (getCurrentLocation, displayReportedStores, searchConvenienceStores 등)

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MapPin className="h-5 w-5" />
          <span>편의점 찾기</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 지도 API 상태에 따른 UI 렌더링 */}
        {mapApiAvailable === null ? (
          <div className="w-full h-96 rounded-lg border flex items-center justify-center bg-gray-50">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500">지도를 불러오는 중...</p>
            </div>
          </div>
        ) : mapApiAvailable === false ? (
          <div className="w-full rounded-lg border bg-blue-50 p-6">
            <div className="text-center space-y-3">
              <Map className="h-8 w-8 text-blue-500 mx-auto" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-800">편의점 검색 기능</h4>
                <p className="text-sm text-blue-700">
                  지도 기능은 현재 사용할 수 없지만, 편의점 브랜드별 검색은 가능합니다.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="w-full h-96 rounded-lg border" />
        )}
      </CardContent>
    </Card>
  );
}