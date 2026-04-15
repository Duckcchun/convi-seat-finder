import { useCallback } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Logo } from './components/ui/Logo';
import { toast } from 'sonner';
import { Button } from './components/ui/button';
import { ConvenienceStoreList } from './components/ConvenienceStoreList';
import { MapView } from './components/MapView';
import { ReportForm } from './components/ReportForm';
import { useStore } from './context/StoreContext';

export function AppContent() {
  const { stores, isLoading, refreshStores, isReportOpen, selectedStoreData, openReport, closeReport } = useStore();

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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-4xl mx-auto w-full px-4 py-4 md:py-5">
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex h-12 items-center gap-1 pl-0">
                <Logo size={112} className="mr-0" />
                <h1 className="text-xl font-semibold text-slate-900">편의점 좌석 찾기</h1>
              </div>
               <p className="text-sm text-slate-600 pl-20">
                 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;주변 편의점 좌석 현황을 먼저 확인하고, 제보하세요.
               </p>
            </div>

            <div className="shrink-0">
              <Button
                type="button"
                onClick={() => isReportOpen ? closeReport() : openReport()}
                aria-expanded={isReportOpen}
                className="h-12 shrink-0 rounded-xl bg-blue-600 px-5 text-base font-semibold leading-none shadow-sm hover:bg-blue-700"
              >
                {isReportOpen ? <X className="mr-2 h-5 w-5" /> : <PlusCircle className="mr-2 h-5 w-5" />}
                {isReportOpen ? '제보 닫기' : '좌석 제보'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 md:py-5">
        <section className="space-y-4">
          {isReportOpen && (
            <div className="relative mt-2 mb-2 rounded-xl border bg-white p-2 md:p-2.5 shadow-sm overflow-visible">
              <div className="flex items-start justify-between gap-3 border-b pb-3 mb-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">좌석 정보 제보</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeReport}
                  aria-label="제보 패널 닫기"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <ReportForm
                onSuccess={handleReportSuccess}
                initialData={selectedStoreData || undefined}
              />
            </div>
          )}

          <div className="rounded-xl border bg-white p-3">
            <MapView
              stores={stores}
              onStoreSelect={handleStoreSelect}
            />
          </div>

          <div className="mt-6">
            <ConvenienceStoreList
              stores={stores}
              isLoading={isLoading}
              onRefresh={refreshStores}
              onDelete={() => {}}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
