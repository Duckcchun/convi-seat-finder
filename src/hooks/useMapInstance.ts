import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { Store } from '../types/store';

interface KakaoMapInstance {
  map: any;
  clusterer: any;
  infoWindows: Map<string, any>;
}

interface UseMapInstanceReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  mapInstance: KakaoMapInstance | null;
  isMapReady: boolean;
  error: string | null;
}

declare global {
  interface Window {
    kakao: any;
  }
}

/**
 * 카카오 지도 인스턴스 및 클러스터링 관리 훅
 * - 지도 초기화
 * - 마커 클러스터링
 * - 정보창 수명 관리
 */
export function useMapInstance(): UseMapInstanceReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<KakaoMapInstance | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 카카오 지도 API 로드 확인
    if (!window.kakao?.maps) {
      const errorMsg = '지도 API를 로드할 수 없습니다.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    try {
      const kakao = window.kakao;

      // 지도 인스턴스 생성
      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(37.4979, 127.0276), // 서울 기본값
        level: 5,
        mapTypeId: kakao.maps.MapTypeId.ROADMAP,
      });

      // 클러스터러 인스턴스 생성
      const clusterer = new kakao.maps.MarkerClusterer({
        map,
        averageCenter: true,
        minClusterSize: 2,
        disableClickZoom: false,
        calculator: [10, 20, 30, 40, 50], // 클러스터 깔때기
        styles: [
          {
            width: '53px',
            height: '53px',
            background: 'rgba(51, 153, 255, .7)',
            borderRadius: '27px',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '1.5',
            fontSize: '13px',
          },
          {
            width: '56px',
            height: '56px',
            background: 'rgba(51, 153, 255, .8)',
            borderRadius: '28px',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '1.6',
            fontSize: '13px',
          },
          {
            width: '66px',
            height: '66px',
            background: 'rgba(51, 153, 255, .9)',
            borderRadius: '33px',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '2',
            fontSize: '16px',
          },
          {
            width: '78px',
            height: '78px',
            background: 'rgba(51, 153, 255, 1)',
            borderRadius: '39px',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '2.5',
            fontSize: '18px',
          },
          {
            width: '100px',
            height: '100px',
            background: 'rgba(51, 153, 255, 1)',
            borderRadius: '50px',
            color: '#fff',
            textAlign: 'center',
            fontWeight: 'bold',
            lineHeight: '3.5',
            fontSize: '20px',
          },
        ],
      });

      setMapInstance({
        map,
        clusterer,
        infoWindows: new Map(),
      });
      setIsMapReady(true);
      setError(null);
    } catch (err) {
      const errorMsg = '지도 초기화에 실패했습니다.';
      setError(errorMsg);
      console.error(err);
    }
  }, []);

  return {
    containerRef,
    mapInstance,
    isMapReady,
    error,
  };
}

/**
 * 지도에 마커 추가 헬퍼 함수
 */
export function addMarkerToMap(
  map: any,
  store: Store,
  onClick?: (store: Store) => void
) {
  if (!store.latitude || !store.longitude) return null;

  const kakao = window.kakao;
  const marker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(store.latitude, store.longitude),
    title: store.name,
  });

  if (onClick) {
    kakao.maps.event.addListener(marker, 'click', () => {
      onClick(store);
    });
  }

  marker.setMap(map);
  return marker;
}

/**
 * 정보창 표시 헬퍼 함수
 */
export function showInfoWindow(
  map: any,
  infoWindows: Map<string, any>,
  storeId: string,
  content: string,
  position: { latitude: number; longitude: number }
) {
  const kakao = window.kakao;

  // 기존 정보창 모두 닫기
  infoWindows.forEach((infoWindow) => infoWindow.close());

  const infoWindow = new kakao.maps.InfoWindow({
    content,
    removable: true,
  });

  infoWindow.open(
    map,
    new kakao.maps.LatLng(position.latitude, position.longitude)
  );

  infoWindows.set(storeId, infoWindow);
}
