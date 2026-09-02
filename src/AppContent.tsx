import { useCallback, useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Logo } from './components/ui/Logo';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { BottomSheetList } from './components/BottomSheetList';
import { MapView } from './components/MapView';
import { ReportForm } from './components/ReportForm';
import { useStore } from './context/StoreContext';

export function AppContent() {
  const { stores, isLoading, refreshStores, isReportOpen, selectedStoreData, openReport, closeReport } = useStore();
  const [sheetExpanded, setSheetExpanded] = useState(false);

  const handleReportSuccess = useCallback(() => {
    closeReport();
    refreshStores();
  }, [closeReport, refreshStores]);

  const handleStoreSelect = useCallback((storeInfo: { name: string; address: string; latitude?: number; longitude?: number }) => {
    openReport(storeInfo);

    const message = storeInfo.name
      ? `${storeInfo.name}이(가) 선택되었습니다. 좌석 정보를 입력해주세요.`
      : '선택한 위치의 주소가 입력되었습니다. 편의점 정보를 입력해주세요.';

    toast.success(message);
  }, [openReport]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* 지도: 화면 전체를 채우는 배경 */}
      <div className="absolute inset-0">
        <MapView stores={stores} onStoreSelect={handleStoreSelect} />
      </div>

      {/* 플로팅 헤더 */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
        <div className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/85 px-4 py-2.5 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <div className="leading-tight">
              <h1 className="text-base font-semibold text-foreground">편의점 좌석 찾기</h1>
              <p className="text-xs text-muted-foreground">좌석 유무·형태를 확인하고 제보하세요</p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => (isReportOpen ? closeReport() : openReport())}
            aria-expanded={isReportOpen}
            size="sm"
            className="shrink-0 rounded-xl"
          >
            {isReportOpen ? <X className="mr-1 h-4 w-4" /> : <PlusCircle className="mr-1 h-4 w-4" />}
            {isReportOpen ? '닫기' : '제보'}
          </Button>
        </div>
      </header>

      {/* 하단 바텀시트 목록 */}
      <BottomSheetList
        stores={stores}
        isLoading={isLoading}
        onRefresh={refreshStores}
        onDelete={() => {}}
        expanded={sheetExpanded}
        onExpandedChange={setSheetExpanded}
      />

      {/* 제보 폼 오버레이 */}
      {isReportOpen && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">좌석 정보 제보</h2>
              <Button variant="ghost" size="icon" onClick={closeReport} aria-label="제보 패널 닫기">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="overflow-y-auto px-5 py-5">
              <ReportForm
                onSuccess={handleReportSuccess}
                initialData={selectedStoreData || undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
