import { useState, useEffect, useCallback } from "react";
import { ConvenienceStoreList } from "./components/ConvenienceStoreList";
import { MapView } from "./components/MapView";
import { AdminDashboard } from "./components/AdminDashboard";
import { ReportForm } from "./components/ReportForm";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { PlusCircle, MapPin, Shield, Eye, EyeOff } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { Toaster } from "./components/ui/sonner";
import { toast } from 'sonner';
import { Store, StoreSelectInfo } from './types/store';

export default function App() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedStoreData, setSelectedStoreData] = useState<StoreSelectInfo | null>(null);

  useEffect(() => {
    checkServerHealth();
    initializeSampleData();
    loadStores();
  }, []);

  const checkServerHealth = useCallback(async () => {
    try {
      const { projectId, publicAnonKey } = await import("./utils/supabase/info");
      console.log("서버 헬스 체크 시작");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/health`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        const health = await response.json();
        console.log("서버 헬스 체크 결과:", health);
        
        if (health.environment?.kvStore?.status === "error") {
          console.error("KV 스토어 연결 오류:", health.environment.kvStore.error);
          toast.error("데이터베이스 연결에 문제가 있습니다.");
        }
      } else {
        console.error("서버 헬스 체크 실패:", response.status, response.statusText);
        toast.error("서버 연결에 문제가 있습니다.");
      }
    } catch (error) {
      console.error("서버 헬스 체크 중 오류:", error);
      toast.error("서버에 연결할 수 없습니다.");
    }
  }, []);

  const initializeSampleData = useCallback(async () => {
    try {
      const { projectId, publicAnonKey } = await import("./utils/supabase/info");
      console.log("샘플 데이터 초기화 시작");
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/init-sample-data`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        console.log("샘플 데이터 초기화 성공:", result);
      } else {
        const errorText = await response.text();
        console.warn("샘플 데이터 초기화 실패 (무시됨):", {
          status: response.status,
          body: errorText,
        });
      }
    } catch (error) {
      console.warn("샘플 데이터 초기화 중 오류 (무시됨):", error.message);
    }
  }, []);

  const loadStores = useCallback(async () => {
    try {
      setIsLoading(true);
      const { projectId, publicAnonKey } = await import("./utils/supabase/info");
      console.log("편의점 데이터 로드 시작:", { projectId: projectId ? "설정됨" : "없음" });
      
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/stores`;
      console.log("요청 URL:", url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      });

      console.log("서버 응답:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("서버에서 받은 데이터:", data);
        
        const validStores = (Array.isArray(data) ? data : []).filter(
          (store) => store && store.id && store.name && store.address
        );
        console.log(`유효한 편의점 ${validStores.length}개 설정`);
        setStores(validStores);
        
        if (validStores.length > 0) {
          toast.success(`편의점 ${validStores.length}개 정보를 불러왔습니다.`);
        }
      } else {
        const errorText = await response.text();
        console.error("편의점 데이터 로드 실패:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        
        let errorMessage = "편의점 데이터를 불러올 수 없습니다.";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.details) {
            errorMessage += ` (${errorData.details})`;
          }
        } catch (e) {
          // JSON 파싱 실패시 원본 텍스트 사용
          errorMessage += ` (${errorText})`;
        }
        
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("편의점 데이터 로드 중 네트워크 오류:", error);
      toast.error(`네트워크 오류가 발생했습니다: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReportSuccess = useCallback(() => {
    setIsReportOpen(false);
    setSelectedStoreData(null);
    loadStores();
  }, [loadStores]);

  const handleStoreSelect = useCallback((storeInfo: StoreSelectInfo) => {
    setSelectedStoreData(storeInfo);
    setIsReportOpen(true);
    
    const message = storeInfo.name 
      ? `${storeInfo.name}이(가) 선택되었습니다. 좌석 정보를 입력해주세요.`
      : '선택한 위치의 주소가 입력되었습니다. 편의점 정보를 입력해주세요.';
    
    toast.success(message);
  }, []);

  const handleDelete = useCallback((storeId: string) => {
    setStores(prevStores => prevStores.filter(store => store.id !== storeId));
  }, []);

  const handleAdminLogin = useCallback(() => {
    if (adminPassword === 'admin123') {
      setIsAdminMode(true);
      setIsLoginDialogOpen(false);
      setAdminPassword('');
      toast.success('관리자 모드로 전환되었습니다.');
    } else {
      toast.error('비밀번호가 올바르지 않습니다.');
    }
  }, [adminPassword]);

  const handleAdminLogout = useCallback(() => {
    setIsAdminMode(false);
    toast.success('관리자 모드를 종료했습니다.');
  }, []);

  const closeLoginDialog = useCallback(() => {
    setIsLoginDialogOpen(false);
    setAdminPassword('');
  }, []);

  // 관리자 모드 렌더링
  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h1>편의점 좌석 찾기 - 관리자 모드</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <AdminDashboard onClose={handleAdminLogout} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-6 w-6 text-blue-600" />
              <h1>편의점 좌석 찾기</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 관리자 로그인 다이얼로그 */}
              <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    관리자
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>관리자 로그인</DialogTitle>
                    <DialogDescription>
                      관리자 권한으로 데이터를 관리하려면 비밀번호를 입력하세요.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">비밀번호</Label>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showPassword ? 'text' : 'password'}
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                          placeholder="관리자 비밀번호를 입력하세요"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        데모용 비밀번호: admin123
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeLoginDialog}>
                      취소
                    </Button>
                    <Button onClick={handleAdminLogin}>로그인</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* 제보 시트 - 크기 확대 */}
              <Sheet open={isReportOpen} onOpenChange={setIsReportOpen}>
                <SheetTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-base px-6 py-3 h-auto">
                    <PlusCircle className="h-5 w-5 mr-2" />
                    좌석 정보 제보
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
                  <SheetHeader className="space-y-4 pb-6 border-b">
                    <SheetTitle className="text-2xl text-left">편의점 좌석 정보 제보</SheetTitle>
                    <SheetDescription className="text-base text-left text-gray-600">
                      새로운 편의점의 좌석 정보를 제보해주세요. 정확한 정보는 다른 사용자들에게 큰 도움이 됩니다.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <ReportForm 
                      onSuccess={handleReportSuccess} 
                      initialData={selectedStoreData || undefined}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="shrink-0">
                <MapPin className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  편의점 좌석 정보를 확인하고 제보하세요
                </h3>
                <div className="mt-2 text-sm text-blue-700 space-y-1">
                  <p>
                    🗺️ <strong>지도에서 새 편의점 찾기:</strong> 지도에서 실제 편의점을 검색하여 좌석 정보를 제보할 수 있습니다.
                  </p>
                  <p>
                    📝 <strong>스마트 편의점 검색:</strong> 제보 폼에서 편의점 이름을 입력하면 실제 편의점을 자동으로 검색하고 선택할 수 있습니다.
                  </p>
                  <p>
                    📋 <strong>제보된 편의점 확인:</strong> 아래 목록에서 이미 제보된 편의점들의 좌석 정보를 확인하세요.
                  </p>
                  <p className="mt-2 pt-1 border-t border-blue-200">
                    본인이 제보한 편의점 정보는 언제든지 삭제할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 지도 뷰 */}
          <MapView stores={stores} onStoreSelect={handleStoreSelect} />

          {/* 편의점 목록 */}
          <ConvenienceStoreList
            stores={stores}
            isLoading={isLoading}
            onRefresh={loadStores}
            onDelete={handleDelete}
          />
        </div>
      </main>

      {/* Toast 알림 */}
      <Toaster />
    </div>
  );
}