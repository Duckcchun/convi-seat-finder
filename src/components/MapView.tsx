import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Store, StoreSelectInfo } from '../types/store';
import { MapPin, Navigation, RefreshCw, Search, Edit2, Clock, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { ReportForm } from './ReportForm';
import { getSeatingBadgeStyle, getSeatingStatusText, formatDate } from '../utils/formatters';
import { useStore } from '../context/StoreContext';
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
const HAS_REMOTE_CONFIG =
  Boolean(import.meta.env.VITE_SUPABASE_PROJECT_ID || import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const REMOTE_ENABLED =
  import.meta.env.VITE_ENABLE_SUPABASE_REMOTE === 'true' ||
  (import.meta.env.VITE_ENABLE_SUPABASE_REMOTE !== 'false' && HAS_REMOTE_CONFIG);
let kakaoSdkLoadPromise: Promise<void> | null = null;

interface MapViewProps {
  stores: Store[];
  onStoreSelect: (storeInfo: StoreSelectInfo) => void;
}

export function MapView({ stores, onStoreSelect }: MapViewProps) {
  const { refreshStores } = useStore();
  const [isMapAvailable, setIsMapAvailable] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [resolvedKeyPreview, setResolvedKeyPreview] = useState<string>('');
  const [mapInitKey, setMapInitKey] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchInputResetKey, setSearchInputResetKey] = useState(0);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [pendingReportSelection, setPendingReportSelection] = useState<StoreSelectInfo | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'edit' | 'warning'>('add');

  const mapContainer = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<any>(null);
  const reportMarkersRef = useRef<any[]>([]);
  const placeMarkersRef = useRef<any[]>([]);
  const geocoderRef = useRef<any>(null);
  const searchServiceRef = useRef<any>(null);
  const activeInfoWindowRef = useRef<any>(null);

  const normalizeText = useCallback((value: string) => {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[()\-_/.,]/g, '');
  }, []);

  const extractBrand = useCallback((value: string) => {
    const brands = ['CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱', '씨스페이스'];
    return brands.find((brand) => String(value || '').includes(brand));
  }, []);

  const findBestMatchedStore = useCallback(
    (place: NearbyPlace) => {
      const placeNameNorm = normalizeText(place.name);
      const placeAddressNorm = normalizeText(place.address);
      const placeBrand = extractBrand(place.name);

      let best: { store: Store; score: number } | null = null;

      for (const store of stores) {
        let score = 0;
        const storeNameNorm = normalizeText(store.name);
        const storeAddressNorm = normalizeText(store.address);

        if (storeNameNorm === placeNameNorm) score += 120;
        if (storeAddressNorm && storeAddressNorm === placeAddressNorm) score += 90;
        if (storeNameNorm.includes(placeNameNorm) || placeNameNorm.includes(storeNameNorm)) score += 50;
        if (
          storeAddressNorm &&
          placeAddressNorm &&
          (storeAddressNorm.includes(placeAddressNorm) || placeAddressNorm.includes(storeAddressNorm))
        ) {
          score += 30;
        }

        const storeBrand = extractBrand(store.name);
        if (placeBrand && storeBrand && placeBrand === storeBrand) {
          score += 15;
        }

        if (typeof store.latitude === 'number' && typeof store.longitude === 'number') {
          const dLat = Math.abs(store.latitude - place.latitude);
          const dLng = Math.abs(store.longitude - place.longitude);

          if (dLat < 0.0004 && dLng < 0.0004) score += 80;
          else if (dLat < 0.001 && dLng < 0.001) score += 45;
          else if (dLat < 0.002 && dLng < 0.002) score += 20;
        }

        if (!best || score > best.score) {
          best = { store, score };
        }
      }

      return best && best.score >= 40 ? best.store : undefined;
    },
    [extractBrand, normalizeText, stores],
  );

  const buildSeatSummary = useCallback((store: Store) => {
    if (store.hasSeating === 'yes') return '좌석: 있음';
    if (store.hasSeating === 'no') return '좌석: 없음';
    return '좌석: 확인 필요';
  }, []);

  const buildInfoWindowContent = useCallback(
    (name: string, address: string, store?: Store) => {
      const seatSummary = store ? buildSeatSummary(store) : '좌석: 확인 필요';
      const isOfflineGuide = store?.reportedBy === '오프라인 가이드';
      const baseNotes = store?.notes || '좌석 형태/비고 정보가 아직 없습니다.';
      const notes = isOfflineGuide
        ? `${baseNotes} | 안내: 실제 매장명/상세 주소와 차이가 있을 수 있습니다.`
        : baseNotes;

      const buttonHtml = store && store.hasSeating !== 'unknown'
        ? `<button data-infowindow-action="edit" data-store-id="${store.id}" style="width:100%;padding:12px 16px;margin-top:10px;background-color:#f59e0b;color:white;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:center;">⚠️ 실제와 다른가요?</button>`
        : `<button data-infowindow-action="add" style="width:100%;padding:12px 16px;margin-top:10px;background-color:#3b82f6;color:white;border:none;border-radius:6px;font-size:13px;font-weight:bold;cursor:pointer;min-height:44px;display:flex;align-items:center;justify-content:center;">정보 추가하기</button>`;

      return `
        <div style="padding:8px;font-size:11px;line-height:1.5;width:260px;font-family:Arial,sans-serif;box-sizing:border-box;overflow:hidden;">
          <strong style="font-size:12px;display:block;margin-bottom:4px;word-wrap:break-word;overflow-wrap:break-word;">${name}</strong>
          <div style="color:#666;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:4px;word-wrap:break-word;overflow-wrap:break-word;font-size:10px;">
            ${address}
          </div>
          <div style="color:#d32f2f;font-weight:bold;margin-bottom:4px;">${seatSummary}</div>
          <div style="margin-top:4px;padding:6px;background-color:#f5f5f5;border-radius:3px;color:#333;word-wrap:break-word;overflow-wrap:break-word;font-size:10px;">${notes}</div>
          ${buttonHtml}
        </div>
      `;
    },
    [buildSeatSummary],
  );

  const attachInfoWindowButtonListener = useCallback((matchedStore?: Store, place?: NearbyPlace) => {
    setTimeout(() => {
      const button = document.querySelector('[data-infowindow-action]') as HTMLButtonElement;
      if (!button) return;

      button.addEventListener('click', () => {
        const action = button.getAttribute('data-infowindow-action');
        if (action === 'add') {
          // 정보 추가 모드로 Sheet 열기
          setActionType('add');
          if (matchedStore && matchedStore.hasSeating === 'unknown') {
            // store는 있지만 좌석 정보가 없는 경우: 기존 정보를 불러와서 수정
            setSelectedStore(matchedStore);
            setIsEditingStore(true);
            setIsEditDialogOpen(true);
          } else if (place) {
            // store가 없는 경우: 새로운 정보 추가
            setPendingReportSelection({
              name: place.name,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
            });
            setIsEditDialogOpen(true);
          } else {
            setIsEditDialogOpen(true);
          }
        } else if (action === 'edit') {
          // 정보 수정 모드로 Sheet 열기
          setActionType('warning');
          if (matchedStore) {
            setSelectedStore(matchedStore);
            setIsEditingStore(true);
            setIsEditDialogOpen(true);
          }
        }
      });
    }, 50);
  }, []);

  const refreshSearchInteraction = useCallback(() => {
    setIsSearching(false);
    setIsSearchFocused(false);
    setNearbyPlaces([]);
    setSearchInputResetKey((prev) => prev + 1);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  }, []);

  const resolveKakaoApiKey = useCallback(async (): Promise<string> => {
    const toPreview = (value: string) =>
      value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;

    const localEnvKey = import.meta.env.VITE_KAKAO_MAP_API_KEY as string | undefined;

    // 로컬 env 키가 있으면 원격 함수 조회를 건너뛰어 404/지연을 피한다.
    if (localEnvKey) {
      setResolvedKeyPreview(toPreview(localEnvKey));
      return localEnvKey;
    }

    if (!REMOTE_ENABLED) {
      const key = KAKAO_FALLBACK_KEY;
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

    const fallback = KAKAO_FALLBACK_KEY;
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

  const hasSearchQuery = keyword.trim().length > 0;
  const hasNearbyResults = hasSearchQuery && nearbyPlaces.length > 0;
  const hasNoNearbyResults = hasSearchQuery && !isSearching && nearbyPlaces.length === 0;

  const getOfflineMatches = useCallback(
    (inputKeyword: string) => {
      const normalizedKeyword = normalizeText(inputKeyword);
      if (!normalizedKeyword) return [] as NearbyPlace[];

      return stores
        .filter((store) => {
          if (selectedBrand !== 'all' && !String(store.name || '').includes(selectedBrand)) {
            return false;
          }

          if (typeof store.latitude !== 'number' || typeof store.longitude !== 'number') {
            return false;
          }

          const normalizedName = normalizeText(store.name);
          const normalizedAddress = normalizeText(store.address);

          return (
            normalizedName.includes(normalizedKeyword) ||
            normalizedAddress.includes(normalizedKeyword) ||
            normalizedKeyword.includes(normalizedName)
          );
        })
        .slice(0, 12)
        .map((store) => ({
          id: `offline-${store.id}`,
          name: store.name,
          address: store.address,
          latitude: Number(store.latitude),
          longitude: Number(store.longitude),
        }));
    },
    [normalizeText, selectedBrand, stores],
  );

  const clearMarkers = useCallback((target: any[]) => {
    target.forEach((marker) => marker.setMap(null));
    target.length = 0;
  }, []);

  const searchConvenienceStores = useCallback(
    (inputKeyword?: string, options?: { center?: { latitude: number; longitude: number }; radius?: number }) => {
      if (!isMapReady || !searchServiceRef.current || !window.kakao?.maps?.services) return;

      const trimmedKeyword = inputKeyword?.trim() || '';

      const queryBase = trimmedKeyword
        ? `${trimmedKeyword} 편의점`
        : selectedBrand === 'all'
          ? '편의점'
          : `${selectedBrand} 편의점`;

      setIsSearching(true);

      const searchOptions: Record<string, unknown> = {
        size: 15,
        category_group_code: 'CS2',
      };

      if (options?.center) {
        searchOptions.x = options.center.longitude;
        searchOptions.y = options.center.latitude;
        searchOptions.radius = options.radius ?? 1200;
        searchOptions.sort = window.kakao.maps.services.SortBy.DISTANCE;
      }

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

          const offlineMatches = getOfflineMatches(trimmedKeyword);
          const mergedPlaces = [...filtered];
          const placeKeys = new Set(
            filtered.map((place) => `${normalizeText(place.name)}::${normalizeText(place.address)}`),
          );

          offlineMatches.forEach((place) => {
            const key = `${normalizeText(place.name)}::${normalizeText(place.address)}`;
            if (!placeKeys.has(key)) {
              placeKeys.add(key);
              mergedPlaces.push(place);
            }
          });

          setNearbyPlaces(mergedPlaces);

          clearMarkers(placeMarkersRef.current);

          mergedPlaces.forEach((place) => {
            const marker = new window.kakao.maps.Marker({
              map: mapRef.current,
              position: new window.kakao.maps.LatLng(place.latitude, place.longitude),
              title: place.name,
            });

            const matchedStore = findBestMatchedStore(place);

            const infoWindow = new window.kakao.maps.InfoWindow({
              content: buildInfoWindowContent(place.name, place.address, matchedStore),
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

              // infowindow 버튼 이벤트 리스너 추가
              attachInfoWindowButtonListener(matchedStore, place);
            });

            placeMarkersRef.current.push(marker);
          });
        },
        searchOptions,
      );
    },
    [attachInfoWindowButtonListener, buildInfoWindowContent, clearMarkers, findBestMatchedStore, getOfflineMatches, isMapReady, normalizeText, selectedBrand],
  );

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
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const latLng = new window.kakao.maps.LatLng(latitude, longitude);

        if (mapRef.current?.panTo) {
          mapRef.current.panTo(latLng);
        } else {
          mapRef.current.setCenter(latLng);
        }

        mapRef.current.setLevel(3);
        setKeyword('');
        setPendingReportSelection(null);

        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
          activeInfoWindowRef.current = null;
        }

        window.setTimeout(() => {
          searchConvenienceStores('', {
            center: { latitude, longitude },
            radius: 1400,
          });
        }, 120);

        toast.success('현재 위치 기준으로 주변 편의점을 불러왔습니다.');
      },
      (error) => {
        toast.error(getGeolocationErrorMessage(error.code));
      },
      { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 },
    );
  }, [searchConvenienceStores]);

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
    refreshSearchInteraction();
  }, [refreshSearchInteraction]);

  const refreshNearbyStores = useCallback(() => {
    if (!isMapReady || !mapRef.current || !window.kakao?.maps) {
      toast.error('지도를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const center = mapRef.current.getCenter?.();
    const latitude = center?.getLat?.();
    const longitude = center?.getLng?.();

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      searchConvenienceStores(keyword);
      return;
    }

    const level = mapRef.current.getLevel?.() ?? 4;
    const radius = Math.min(20000, Math.max(500, Math.round(level * 350)));

    searchConvenienceStores(keyword, {
      center: { latitude, longitude },
      radius,
    });
  }, [isMapReady, keyword, searchConvenienceStores]);

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

        try {
          geocoderRef.current = new window.kakao.maps.services.Geocoder();
          searchServiceRef.current = new window.kakao.maps.services.Places(map);
        } catch {
          geocoderRef.current = null;
          searchServiceRef.current = null;
        }

        setIsMapReady(true);
        setIsMapAvailable(true);
        setMapError(null);
        if (loadTimeoutTimer) {
          clearTimeout(loadTimeoutTimer);
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
    if (!isMapReady || !mapRef.current || !window.kakao?.maps) return;

    clearMarkers(reportMarkersRef.current);

    stores.forEach((store) => {
      if (!store.latitude || !store.longitude) return;

      const marker = new window.kakao.maps.Marker({
        map: mapRef.current,
        position: new window.kakao.maps.LatLng(store.latitude, store.longitude),
        title: store.name,
      });

      const infoWindow = new window.kakao.maps.InfoWindow({
        content: buildInfoWindowContent(store.name, store.address, store),
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infoWindow.open(mapRef.current, marker);
        activeInfoWindowRef.current = infoWindow;
        // infowindow 버튼 이벤트 리스너 추가
        attachInfoWindowButtonListener(store);
      });

      reportMarkersRef.current.push(marker);
    });
  }, [attachInfoWindowButtonListener, buildInfoWindowContent, clearMarkers, isMapReady, stores]);

  // selectedStore가 업데이트되면 infowindow도 자동으로 갱신
  useEffect(() => {
    if (!selectedStore || !isMapReady || !window.kakao?.maps) return;

    // stores에서 업데이트된 store 정보 찾기
    const updatedStore = stores.find(s => s.id === selectedStore.id);
    if (updatedStore && updatedStore !== selectedStore) {
      setSelectedStore(updatedStore);
    }

    // infowindow 내용 업데이트
    if (activeInfoWindowRef.current && updatedStore) {
      const newContent = buildInfoWindowContent(updatedStore.name, updatedStore.address, updatedStore);
      activeInfoWindowRef.current.setContent(newContent);
      // 업데이트된 버튼 리스너 재등록
      attachInfoWindowButtonListener(updatedStore);
    }
  }, [stores, selectedStore, isMapReady, buildInfoWindowContent, attachInfoWindowButtonListener]);

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
              key={searchInputResetKey}
              ref={searchInputRef}
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
          </div>

          <Button type="submit" className="h-10" disabled={!isMapReady || isSearching}>
            {isSearching ? '검색중' : '검색'}
          </Button>
        </form>

        {isSearchFocused && hasNearbyResults && (
          <div className="rounded-xl border border-white/60 bg-white/55 backdrop-blur-md shadow-md overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
            {nearbyPlaces.slice(0, 8).map((place) => (
              <button
                key={place.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleNearbyPlaceSelect(place);
                }}
                className="w-full border-b px-4 py-3 text-left last:border-b-0 hover:bg-slate-50"
              >
                <div className="text-sm font-medium text-slate-900 truncate">{place.name}</div>
                <div className="text-xs text-slate-500 truncate">{place.address}</div>
              </button>
            ))}
            </div>
          </div>
        )}

        {isSearchFocused && hasNoNearbyResults && (
          <div className="rounded-xl border border-white/60 bg-white/55 backdrop-blur-md px-4 py-3 text-sm text-slate-500 shadow-md">
            관련 이름이 없습니다.
          </div>
        )}

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
          <Button type="button" variant="outline" size="sm" onClick={refreshNearbyStores}>
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

      {/* 지도 핀 클릭 Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={(open: boolean) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setIsEditingStore(false);
        }
      }}>
        <SheetContent side="right" className="w-full max-w-[90vw] sm:max-w-2xl p-0 bg-white overflow-hidden flex flex-col">
          <SheetTitle className="sr-only">편의점 정보</SheetTitle>
          <SheetDescription className="sr-only">선택한 편의점의 상세 정보를 확인하거나 수정합니다.</SheetDescription>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {selectedStore && isEditingStore ? (
            <>
              <div className="mb-6 pb-4 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  {selectedStore.name} 정보 수정
                </h2>
              </div>
              <ReportForm
                storeId={selectedStore.id}
                initialData={selectedStore}
                actionType={actionType}
                onSuccess={async () => {
                  // 데이터 새로고침
                  await refreshStores();
                  // 수정 폼만 닫고 Sheet는 열려있게 유지 (업데이트된 정보를 볼 수 있음)
                  setIsEditingStore(false);
                }}
              />
            </>
          ) : selectedStore ? (
            <>
              {/* 헤더 */}
              <div className="mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedStore.name}</h2>
                    <div className="flex items-center text-gray-600 text-sm mt-2 gap-1">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <p className="line-clamp-2">{selectedStore.address}</p>
                    </div>
                  </div>
                  <div>
                    {(() => {
                      const { bg, text } = getSeatingBadgeStyle(selectedStore.hasSeating);
                      return (
                        <Badge className={`${bg} ${text} hover:${bg} text-xs px-3 py-1`}>
                          {getSeatingStatusText(selectedStore.hasSeating)}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pb-6">
                {/* 좌석 상태 경고/확인 배너 */}
                {selectedStore.hasSeating === 'unknown' ? (
                  <Card className="border-l-4 border-l-red-500 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">❓</div>
                        <div>
                          <h3 className="font-semibold text-red-900">좌석 정보 미확인</h3>
                          <p className="text-sm text-red-700 mt-1">정확한 좌석 정보를 입력해주세요</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className={`border-l-4 ${
                    selectedStore.hasSeating === 'yes'
                      ? 'border-l-green-500 bg-green-50'
                      : 'border-l-red-500 bg-red-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">
                          {selectedStore.hasSeating === 'yes' ? '✅' : '❌'}
                        </div>
                        <div>
                          <h3 className={`font-semibold ${
                            selectedStore.hasSeating === 'yes'
                              ? 'text-green-900'
                              : 'text-red-900'
                          }`}>
                            {selectedStore.hasSeating === 'yes'
                              ? '좌석이 있습니다'
                              : '좌석이 없습니다'}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            selectedStore.hasSeating === 'yes'
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}>
                            {selectedStore.hasSeating === 'yes'
                              ? '앉아서 취식할 수 있습니다'
                              : '서서 취식만 가능합니다'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 최근 업데이트 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">최근 업데이트</p>
                          <p className="font-semibold text-gray-900">{formatDate(selectedStore.lastUpdated)}</p>
                        </div>
                      </div>
                      {selectedStore.reportedBy && (
                        <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                          <User className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-500">제보자</p>
                            <p className="font-semibold text-gray-900">{selectedStore.reportedBy}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 상세 정보 */}
                {selectedStore.notes ? (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">상세 정보</h3>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedStore.notes}</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-gray-50">
                    <CardContent className="p-4 text-center">
                      <p className="text-sm text-gray-500">좌석 형태/비고 정보가 아직 없습니다.</p>
                    </CardContent>
                  </Card>
                )}

                {/* 버튼 섹션 */}
                <div className="mt-6">
                  <Button
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base"
                    onClick={() => setIsEditingStore(true)}
                  >
                    <Edit2 className="h-5 w-5 mr-2" />
                    정보 수정하기
                  </Button>
                </div>
              </div>
            </>
          ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
