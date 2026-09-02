import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Store, StoreSelectInfo, SeatType } from '../types/store';
import { useStoreData } from '../hooks/useStoreData';

interface StoreContextType {
  // Data
  stores: Store[];
  isLoading: boolean;
  error: string | null;

  // UI State
  isReportOpen: boolean;
  selectedStoreData: StoreSelectInfo | null;

  // 공유 필터 상태 (지도/목록이 함께 사용)
  seatTypeFilter: SeatType[];
  toggleSeatTypeFilter: (type: SeatType) => void;
  clearSeatTypeFilter: () => void;
  brandFilter: string; // 'all' | 브랜드명
  setBrandFilter: (brand: string) => void;

  // Actions
  refreshStores: () => Promise<void>;
  openReport: (storeData?: StoreSelectInfo) => void;
  closeReport: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { stores, isLoading, error, refreshStores } = useStoreData();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedStoreData, setSelectedStoreData] = useState<StoreSelectInfo | null>(null);
  const [seatTypeFilter, setSeatTypeFilter] = useState<SeatType[]>([]);
  const [brandFilter, setBrandFilter] = useState<string>('all');

  const openReport = useCallback((storeData?: StoreSelectInfo) => {
    setSelectedStoreData(storeData || null);
    setIsReportOpen(true);
  }, []);

  const closeReport = useCallback(() => {
    setIsReportOpen(false);
    setSelectedStoreData(null);
  }, []);

  const toggleSeatTypeFilter = useCallback((type: SeatType) => {
    setSeatTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const clearSeatTypeFilter = useCallback(() => setSeatTypeFilter([]), []);

  const value: StoreContextType = {
    stores,
    isLoading,
    error,
    isReportOpen,
    selectedStoreData,
    seatTypeFilter,
    toggleSeatTypeFilter,
    clearSeatTypeFilter,
    brandFilter,
    setBrandFilter,
    refreshStores,
    openReport,
    closeReport,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
};

/**
 * Store Context를 사용하는 훅
 * @throws 에러: StoreProvider 내부에서만 사용 가능
 */
export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore는 StoreProvider 내부에서만 사용할 수 있습니다.');
  }
  return context;
};
