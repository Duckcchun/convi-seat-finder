import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Store, StoreSelectInfo } from '../types/store';
import { MapPin, Navigation, RefreshCw, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { getGeolocationErrorMessage } from '../utils/errorHandler';

declare global {
  interface Window {
    kakao: any;
  }
}

interface NearbyPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const KAKAO_FALLBACK_KEY = 'cd48498ae3118530087c6989802acced';
const IS_LOCALHOST =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const REMOTE_ENABLED =
  import.meta.env.VITE_ENABLE_SUPABASE_REMOTE === 'true' ||
  (import.meta.env.VITE_ENABLE_SUPABASE_REMOTE !== 'false' && !IS_LOCALHOST);
let kakaoSdkLoadPromise: Promise<void> | null = null;

interface MapViewProps {
  stores: Store[];
  onStoreSelect: (storeInfo: StoreSelectInfo) => void;
}

export function MapView({ stores, onStoreSelect }: MapViewProps) {
  const [isMapAvailable, setIsMapAvailable] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [resolvedKeyPreview, setResolvedKeyPreview] = useState<string>('');
  const [mapInitKey, setMapInitKey] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [pendingReportSelection, setPendingReportSelection] = useState<StoreSelectInfo | null>(null);

  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const reportMarkersRef = useRef<any[]>([]);
  const placeMarkersRef = useRef<any[]>([]);
  const geocoderRef = useRef<any>(null);
  const searchServiceRef = useRef<any>(null);
  const activeInfoWindowRef = useRef<any>(null);

  const resolveKakaoApiKey = useCallback(async (): Promise<string> => {
    const toPreview = (value: string) =>
      value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;

    if (!REMOTE_ENABLED) {
      const key = (import.meta.env.VITE_KAKAO_MAP_API_KEY as string | undefined) || KAKAO_FALLBACK_KEY;
      setResolvedKeyPreview(toPreview(key));
      return key;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2200);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/env/KAKAO_MAP_API_KEY`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data?.value && data.value !== 'demo-key-needs-setup') {
          setResolvedKeyPreview(toPreview(data.value));
          return data.value;
        }
      }
    } catch {
      // Supabase 경로 실패 시 로컬 값으로 폴백
    }

    const fallback = (import.meta.env.VITE_KAKAO_MAP_API_KEY as string | undefined) || KAKAO_FALLBACK_KEY;
    setResolvedKeyPreview(toPreview(fallback));
    return fallback;
  }, []);

  const ensureKakaoSdk = useCallback(async () => {
    if (window.kakao?.maps?.services) return;

    if (kakaoSdkLoadPromise) {
      return kakaoSdkLoadPromise;
    }

    const apiKey = await resolveKakaoApiKey();
    if (!apiKey) {
      throw new Error('카카오 지도 API 키가 없습니다.');
    }

    const sdkSrc = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`;

    kakaoSdkLoadPromise = new Promise<void>((resolve, reject) => {
      const existingScripts = Array.from(
        document.querySelectorAll<HTMLScriptElement>('script[src*="dapi.kakao.com/v2/maps/sdk.js"]'),
      );

      if (existingScripts.length > 0) {
        existingScripts.forEach((scriptEl) => scriptEl.remove());
      }

      if (window.kakao && !window.kakao?.maps?.services) {
        try {
          delete (window as any).kakao;
        } catch {
          // 읽기 전용 환경에서 delete 실패 가능
        }
      }

      const script = document.createElement('script');
      script.src = sdkSrc;
      script.async = true;
      script.onload = () => {
        if (window.kakao?.maps?.load) {
          window.kakao.maps.load(() => {
            kakaoSdkLoadPromise = null;
            resolve();
          });
        } else {
          kakaoSdkLoadPromise = null;
          reject(new Error('카카오 SDK 초기화 실패'));
        }
      };
      script.onerror = () => {
        kakaoSdkLoadPromise = null;
        reject(new Error(`지도 SDK 로드 실패: ${sdkSrc}`));
      };
      document.head.appendChild(script);
    });
    return kakaoSdkLoadPromise;
  }, [resolveKakaoApiKey]);

  const brandOptions = useMemo(() => ['all', 'CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱', '씨스페이스'], []);

  const clearMarkers = useCallback((target: any[]) => {
    target.forEach((marker) => marker.setMap(null));
    target.length = 0;
  }, []);

  const moveToUserLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('위치 인식을 지원하지 않는 브라우저입니다.');
      return;
    }
    if (!mapRef.current || !window.kakao?.maps) {
      toast.error('지도를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latLng = new window.kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
        mapRef.current.setCenter(latLng);
        toast.success('현재 위치로 이동했습니다.');
      },
      (error) => {
        toast.error(getGeolocationErrorMessage(error.code));
      },
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  const searchConvenienceStores = useCallback(
    (inputKeyword?: string) => {
      if (!isMapReady || !searchServiceRef.current || !window.kakao?.maps?.services) return;

      const queryBase = inputKeyword?.trim()
        ? `${inputKeyword.trim()} 편의점`
        : selectedBrand === 'all'
          ? '편의점'
          : `${selectedBrand} 편의점`;

      setIsSearching(true);

      searchServiceRef.current.keywordSearch(
        queryBase,
        (data: any[], status: string) => {
          setIsSearching(false);

          if (status !== window.kakao.maps.services.Status.OK || !Array.isArray(data)) {
            clearMarkers(placeMarkersRef.current);
            setNearbyPlaces([]);
            return;
          }

          const filtered = data
            .filter((place) => {
              if (selectedBrand === 'all') return true;
              return String(place.place_name || '').includes(selectedBrand);
            })
            .slice(0, 12)
            .map((place) => ({
              id: String(place.id),
              name: String(place.place_name),
              address: String(place.road_address_name || place.address_name || ''),
              latitude: Number(place.y),
              longitude: Number(place.x),
            }));

          setNearbyPlaces(filtered);
          clearMarkers(placeMarkersRef.current);

          filtered.forEach((place) => {
            const marker = new window.kakao.maps.Marker({
              map: mapRef.current,
              position: new window.kakao.maps.LatLng(place.latitude, place.longitude),
              title: place.name,
            });

            const matchedStore = stores.find(
              (store) =>
                store.name === place.name ||
                store.address === place.address ||
                (store.latitude &&
                  store.longitude &&
                  Math.abs(store.latitude - place.latitude) < 0.0003 &&
                  Math.abs(store.longitude - place.longitude) < 0.0003),
            );

            const infoWindow = new window.kakao.maps.InfoWindow({
              content: `
                <div style="padding:8px;font-size:11px;line-height:1.5;width:260px;font-family:Arial,sans-serif;box-sizing:border-box;overflow:hidden;">
                  <strong style="font-size:12px;display:block;margin-bottom:4px;word-wrap:break-word;overflow-wrap:break-word;">${place.name}</strong>
                  <div style="color:#666;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px;word-wrap:break-word;overflow-wrap:break-word;font-size:10px;">
                    ${place.address}
                  </div>
                  ${matchedStore
                    ? `
                      <div>
                        <div style="color:#d32f2f;font-weight:bold;margin-bottom:4px;">좌석: ${matchedStore.hasSeating === 'yes' ? '있음' : matchedStore.hasSeating === 'no' ? '없음' : '확인 필요'}</div>
                        ${matchedStore.notes ? `<div style="margin-top:4px;padding:6px;background-color:#f5f5f5;border-radius:3px;color:#333;word-wrap:break-word;overflow-wrap:break-word;font-size:10px;">${matchedStore.notes}</div>` : ''}
                      </div>
                    `
                    : '<div style="color:#666;word-wrap:break-word;overflow-wrap:break-word;font-size:10px;">아직 제보된 좌석 정보가 없습니다.</div>'}
                </div>
              `,
            });

            window.kakao.maps.event.addListener(marker, 'click', () => {
              if (activeInfoWindowRef.current) {
                activeInfoWindowRef.current.close();
              }
              infoWindow.open(mapRef.current, marker);
              activeInfoWindowRef.current = infoWindow;

              const storeToSelect = matchedStore || place;
              setPendingReportSelection({
                name: storeToSelect.name,
                address: storeToSelect.address,
                latitude: storeToSelect.latitude,
                longitude: storeToSelect.longitude,
              });
            });

            placeMarkersRef.current.push(marker);
          });
        },
        {
          size: 15,
          category_group_code: 'CS2',
        },
      );
    },
    [clearMarkers, isMapReady, selectedBrand, stores],
  );

  const handleNearbyPlaceSelect = useCallback((place: NearbyPlace) => {
    if (!mapRef.current || !window.kakao?.maps) return;

    const target = new window.kakao.maps.LatLng(place.latitude, place.longitude);
    mapRef.current.setCenter(target);
    mapRef.current.setLevel(3);

    setPendingReportSelection({
      name: place.name,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setKeyword(place.name);
    setIsSearchFocused(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let resizeHandler: (() => void) | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let loadTimeoutTimer: ReturnType<typeof setTimeout> | undefined;

    const LOAD_TIMEOUT_MS = 20000;

    const waitForLayout = () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });

    const startMapInit = async () => {
      try {
        await ensureKakaoSdk();
      } catch (error) {
        if (!cancelled) {
          setIsMapAvailable(false);
          setMapError(error instanceof Error ? error.message : '카카오 지도 SDK를 불러오지 못했습니다.');
        }
        return;
      }

      await waitForLayout();

      if (cancelled || mapRef.current) {
        return;
      }

      if (!mapContainer.current) {
        retryTimer = setTimeout(() => {
          void startMapInit();
        }, 100);
        return;
      }

      try {
        const map = new window.kakao.maps.Map(mapContainer.current, {
          center: new window.kakao.maps.LatLng(37.566826, 126.9786567),
          level: 4,
        });

        mapRef.current = map;
        setIsMapReady(true);
        setIsMapAvailable(true);
        setMapError(null);
        if (loadTimeoutTimer) {
          clearTimeout(loadTimeoutTimer);
        }

        try {
          geocoderRef.current = new window.kakao.maps.services.Geocoder();
          searchServiceRef.current = new window.kakao.maps.services.Places(map);
        } catch {
          geocoderRef.current = null;
          searchServiceRef.current = null;
        }

        if (cancelled) {
          return;
        }

        resizeHandler = () => {
          if (mapRef.current?.relayout) {
            mapRef.current.relayout();
          }
        };

        window.addEventListener('resize', resizeHandler);

        requestAnimationFrame(() => {
          map.relayout?.();
        });

        setTimeout(() => {
          map.relayout?.();
        }, 300);

        window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
          const latlng = mouseEvent.latLng;

          geocoderRef.current.coord2Address(
            latlng.getLng(),
            latlng.getLat(),
            (result: any, status: string) => {
              if (status === window.kakao.maps.services.Status.OK) {
                const address = result[0]?.road_address
                  ? result[0].road_address.address_name
                  : result[0]?.address?.address_name || '';

                if (activeInfoWindowRef.current) {
                  activeInfoWindowRef.current.close();
                  activeInfoWindowRef.current = null;
                }

                setPendingReportSelection({
                  name: '',
                  address,
                  latitude: latlng.getLat(),
                  longitude: latlng.getLng(),
                });
              }
            },
          );
        });

      } catch (error) {
        if (!cancelled) {
          setIsMapAvailable(false);
          setMapError(error instanceof Error ? error.message : '카카오 지도를 초기화하지 못했습니다.');
        }
      }
    };

    loadTimeoutTimer = setTimeout(() => {
      if (!cancelled && !mapRef.current) {
        setIsMapAvailable(false);
        setMapError('카카오 지도 초기화 시간(20초)을 초과했습니다. 네트워크 또는 브라우저 확장프로그램 차단 여부를 확인해주세요.');
      }
    }, LOAD_TIMEOUT_MS);

    startMapInit();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (loadTimeoutTimer) clearTimeout(loadTimeoutTimer);
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (activeInfoWindowRef.current) {
        activeInfoWindowRef.current.close();
        activeInfoWindowRef.current = null;
      }
      setIsMapReady(false);
      mapRef.current = null;
      clearMarkers(reportMarkersRef.current);
      clearMarkers(placeMarkersRef.current);
    };
  }, [clearMarkers, ensureKakaoSdk, mapInitKey]);

  useEffect(() => {
    if (!mapRef.current || !window.kakao?.maps) return;

    clearMarkers(reportMarkersRef.current);

    stores.forEach((store) => {
      if (!store.latitude || !store.longitude) return;

      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(store.latitude, store.longitude),
        title: store.name,
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:6px 8px;font-size:12px;line-height:1.4;max-width:220px;">
            <strong>${store.name}</strong><br/>
            ${store.address}<br/>
            좌석: ${store.available_seats} / ${store.total_seats}
          </div>
        `,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infoWindow.open(mapRef.current, marker);
        activeInfoWindowRef.current = infoWindow;
      });

      reportMarkersRef.current.push(marker);
    });
  }, [clearMarkers, stores]);

  useEffect(() => {
    if (!isMapReady) return;
    searchConvenienceStores(keyword);
  }, [isMapReady, keyword, searchConvenienceStores, selectedBrand]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchConvenienceStores(keyword);
  };

  if (!isMapAvailable) {
    const currentHost = typeof window !== 'undefined' ? window.location.host : 'unknown';

    return (
      <div className="space-y-3">
        <div className="w-full rounded-2xl border border-slate-200 bg-linear-to-br from-slate-50 via-white to-blue-50 p-4 text-center shadow-sm space-y-2">
          <MapPin className="h-7 w-7 mx-auto text-gray-400" />
          <p className="text-sm font-medium text-gray-800">카카오 지도를 초기화하지 못했습니다.</p>
          <p className="text-xs text-gray-600 wrap-break-word">원인: {mapError || '알 수 없는 오류'}</p>
          <p className="text-xs text-gray-500">현재 접속 주소: {currentHost}</p>
            {resolvedKeyPreview && <p className="text-xs text-gray-500">현재 사용 JS 키: {resolvedKeyPreview}</p>}
            <p className="text-xs text-gray-500">Kakao Developers → 내 애플리케이션 → 플랫폼(Web)에 위 주소를 정확히 등록해야 합니다.</p>
            <p className="text-xs text-gray-500">광고차단/보안 확장프로그램이 dapi.kakao.com을 막으면 지도 로드가 실패할 수 있습니다.</p>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsMapAvailable(true);
                setIsMapReady(false);
                setMapError(null);
                setMapInitKey((prev) => prev + 1);
              }}
            >
              카카오 지도 다시 시도
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex items-start gap-2">
          <div className="relative flex-1">
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
              placeholder="전체 지역 편의점 검색 (예: 을지로입구, 제주공항)"
              className="h-10 pr-10 text-base"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>

            {isSearchFocused && keyword.trim() && nearbyPlaces.length > 0 && (
              <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-white shadow-lg">
                {nearbyPlaces.slice(0, 8).map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleNearbyPlaceSelect(place);
                    }}
                    className="w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-slate-50"
                  >
                    <div className="text-sm font-medium text-slate-900 truncate">{place.name}</div>
                    <div className="text-xs text-slate-500 truncate">{place.address}</div>
                  </button>
                ))}
              </div>
            )}

            {isSearchFocused && keyword.trim() && !isSearching && nearbyPlaces.length === 0 && (
              <div className="absolute z-30 mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-500 shadow-lg">
                관련 이름이 없습니다.
              </div>
            )}
          </div>

          <Button type="submit" className="h-10" disabled={!isMapReady || isSearching}>
            {isSearching ? '검색중' : '검색'}
          </Button>
        </form>

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
          <Button type="button" variant="outline" size="sm" onClick={moveToUserLocation}>
            <Navigation className="h-4 w-4 mr-1" />
            내 위치
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => searchConvenienceStores(keyword)}>
            <RefreshCw className="h-4 w-4 mr-1" />
            새로고침
          </Button>
        </div>

        {nearbyPlaces.length > 0 && (
          <div className="text-sm text-gray-600">
            전체 검색 결과 {nearbyPlaces.length}개. 목록에서 선택해 해당 위치로 이동하거나 핀을 클릭해 확인하세요.
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-linear-to-br from-slate-50 via-white to-blue-50 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">지도</div>
            <div className="text-xs text-slate-500">클릭해서 위치를 선택할 수 있습니다</div>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            {isMapReady ? '실시간 지도' : '불러오는 중'}
          </div>
        </div>

        <div
          id="map"
          ref={mapContainer}
          className="w-full"
          style={{ height: 'clamp(320px, 55vh, 600px)', minHeight: '320px' }}
          aria-label="편의점 위치 지도"
          role="region"
        />
        {!isMapReady && (
          <div className="absolute inset-[49px_0_0_0] flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              지도를 불러오는 중... (최대 20초)
            </div>
          </div>
        )}
      </div>

      {pendingReportSelection && (
        <div className="rounded-lg border bg-white p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-sm font-medium text-gray-900">{pendingReportSelection.name || '선택한 위치'}</div>
            <div className="text-xs text-gray-600 line-clamp-1">{pendingReportSelection.address || '주소 정보 없음'}</div>
          </div>
          <Button type="button" onClick={() => onStoreSelect(pendingReportSelection)}>
            이 위치로 제보하기
          </Button>
        </div>
      )}
    </div>
  );
}
