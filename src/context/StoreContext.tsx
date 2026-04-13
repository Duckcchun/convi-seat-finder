import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Store, StoreSelectInfo } from '../types/store';
import { useStoreData } from '../hooks/useStoreData';

interface StoreContextType {
  // Data
  stores: Store[];
  isLoading: boolean;
  error: string | null;

  // UI State
  isReportOpen: boolean;
  selectedStoreData: StoreSelectInfo | null;

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

  const openReport = useCallback((storeData?: StoreSelectInfo) => {
    setSelectedStoreData(storeData || null);
    setIsReportOpen(true);
  }, []);

  const closeReport = useCallback(() => {
    setIsReportOpen(false);
    setSelectedStoreData(null);
  }, []);

  const value: StoreContextType = {
    stores,
    isLoading,
    error,
    isReportOpen,
    selectedStoreData,
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
