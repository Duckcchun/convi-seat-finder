import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { getGeolocationErrorMessage } from '../utils/errorHandler';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseGeolocationReturn {
  coords: GeolocationCoordinates | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => void;
  clearError: () => void;
}

/**
 * Geolocation API를 래핑한 커스텀 훅
 * 사용자 위치 요청 및 에러 처리를 단순화합니다
 */
export function useGeolocation(): UseGeolocationReturn {
  const [coords, setCoords] = useState<GeolocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      const errorMsg = '이 브라우저는 위치 정보를 지원하지 않습니다.';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setError(null);
        setIsLoading(false);
      },
      (geolocationError) => {
        const errorMsg = getGeolocationErrorMessage(geolocationError.code);
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5분 캐시
      }
    );
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    coords,
    isLoading,
    error,
    requestLocation,
    clearError,
  };
}
