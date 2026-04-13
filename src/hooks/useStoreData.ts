import { useState, useEffect, useCallback } from 'react';
import { Store } from '../types/store';
import { getStores } from '../utils/store-api';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/errorHandler';

interface UseStoreDataReturn {
  stores: Store[];
  isLoading: boolean;
  error: string | null;
  refreshStores: () => Promise<void>;
}

/**
 * 편의점 데이터 로드를 위한 단일 진입점 훅
 * 중복 호출 방지 및 상태 관리 통합
 */
export const useStoreData = (): UseStoreDataReturn => {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { stores: loadedStores, source } = await getStores();
      setStores(loadedStores);
      
      // 첫 로드 시에만 토스트 표시 (새로고침과 구분)
      if (loadedStores.length > 0 && source === 'local') {
        toast.success(`오프라인 데이터 ${loadedStores.length}개를 불러왔습니다.`);
      } else if (loadedStores.length > 0) {
        toast.success(`편의점 ${loadedStores.length}개 정보를 불러왔습니다.`);
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 렌더링 시 한 번만 로드
  useEffect(() => {
    loadStores();
  }, [loadStores]);

  return {
    stores,
    isLoading,
    error,
    refreshStores: loadStores,
  };
};
