import { useEffect, useRef } from 'react';
import { Store, StoreSelectInfo } from '../types/store'; // App.tsx에서 사용하는 타입 임포트

// TypeScript가 window.kakao 객체를 인식하도록 선언
declare global {
  interface Window {
    kakao: any;
  }
}

// MapView 컴포넌트가 받을 props 타입 정의 (App.tsx와 일치)
interface MapViewProps {
  stores: Store[];
  onStoreSelect: (storeInfo: StoreSelectInfo) => void;
}

export function MapView({ stores, onStoreSelect }: MapViewProps) {
  // 지도를 담을 div의 ref
  const mapContainer = useRef<HTMLDivElement>(null);
  
  // 생성된 지도 인스턴스를 저장할 ref
  const mapRef = useRef<any>(null);
  
  // 생성된 마커들을 저장할 ref (초기화를 위해)
  const markersRef = useRef<any[]>([]);

  // 1. 컴포넌트 마운트 시 "지도"를 생성하는 useEffect
  useEffect(() => {
    if (window.kakao && window.kakao.maps && mapContainer.current) {
      const mapOption = {
        center: new window.kakao.maps.LatLng(37.566826, 126.9786567), // 초기 중심 (서울시청)
        level: 3,
      };

      // 지도 생성 및 ref에 저장
      const map = new window.kakao.maps.Map(mapContainer.current, mapOption);
      mapRef.current = map;

      // 지도 클릭 이벤트 리스너 추가 (새 장소 제보용)
      window.kakao.maps.event.addListener(map, 'click', (mouseEvent: any) => {
        const latlng = mouseEvent.latLng; // 클릭한 위도, 경도

        // Geocoder 객체 (좌표 -> 주소 변환)
        const geocoder = new window.kakao.maps.services.Geocoder();
        
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const address = result[0]?.road_address 
              ? result[0].road_address.address_name 
              : result[0].address.address_name;
            
            // App.tsx의 onStoreSelect 함수 호출
            onStoreSelect({
              name: '', // 이름은 비워둠 (사용자가 입력)
              address: address,
              latitude: latlng.getLat(),
              longitude: latlng.getLng(),
            });
          } else {
            // 주소 변환 실패 시, 좌표만 전달
            console.warn('주소 변환 실패');
            onStoreSelect({
              name: '',
              address: '', // 주소 비워둠
              latitude: latlng.getLat(),
              longitude: latlng.getLng(),
            });
          }
        });
      });
    }
  }, [onStoreSelect]); // onStoreSelect가 바뀔 때만 리스너 재등록


  // 2. "stores" 데이터가 변경될 때 "마커"를 업데이트하는 useEffect
  useEffect(() => {
    // 지도 인스턴스나 kakao 객체가 없으면 실행 중지
    if (!mapRef.current || !window.kakao) return;

    // 1. 기존 마커 모두 제거
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = []; // 마커 배열 비우기

    // 2. 새 'stores' 데이터로 마커 생성
    stores.forEach((store) => {
      // 위도, 경도 값이 유효한지 확인
      if (store.latitude && store.longitude) {
        const position = new window.kakao.maps.LatLng(store.latitude, store.longitude);

        const marker = new window.kakao.maps.Marker({
          map: mapRef.current, // mapRef에 저장된 지도 인스턴스 사용
          position: position,
          title: store.name,
        });

        // (선택) 마커에 인포윈도우(말풍선) 추가
        const iwContent = `
          <div style="padding:5px; font-size: 13px;">
            <strong>${store.name}</strong><br/>
            ${store.address}<br/>
            좌석: ${store.available_seats} / ${store.total_seats}
          </div>`;
          
        const infowindow = new window.kakao.maps.InfoWindow({
          content: iwContent,
          removable: true
        });

        // 마커에 클릭 이벤트 등록
        window.kakao.maps.event.addListener(marker, 'click', () => {
          infowindow.open(mapRef.current, marker);
        });

        // 생성된 마커를 ref 배열에 추가
        markersRef.current.push(marker);
      }
    });

    // (선택) 가게가 하나라도 있으면 첫 번째 가게 위치로 지도 중심 이동
    if (stores.length > 0 && stores[0].latitude && stores[0].longitude) {
      const firstStorePosition = new window.kakao.maps.LatLng(stores[0].latitude, stores[0].longitude);
      mapRef.current.setCenter(firstStorePosition);
    }

  }, [stores]); // 'stores' prop이 변경될 때마다 이 effect 실행

  
  // 3. 지도를 렌더링할 div
  return (
    <div 
      id="map" 
      ref={mapContainer} 
      className="w-full h-80 sm:h-96 rounded-lg shadow-md border"
    >
      {/* 지도는 여기에 렌더링됩니다. */}
    </div>
  );
}