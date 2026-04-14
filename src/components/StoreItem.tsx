import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { MapPin, Clock, User, Trash2, MessageSquare, Edit2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Store } from '../types/store';
import { deleteStore } from '../utils/store-api';
import { formatDate, formatNotes, getSeatingBadgeStyle, getSeatingStatusText } from '../utils/formatters';
import { ReportForm } from './ReportForm';
import { useStore } from '../context/StoreContext';

interface StoreItemProps {
  store: Store;
  onDelete: (storeId: string) => void;
}

export function StoreItem({ store, onDelete }: StoreItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [actionType, setActionType] = useState<'edit' | 'warning'>('edit');
  const { refreshStores } = useStore();

  const canDelete = () => {
    try {
      const reportedStores: string[] = JSON.parse(localStorage.getItem('reportedStores') || '[]');
      return Array.isArray(reportedStores) && reportedStores.includes(store.id);
    } catch {
      return false;
    }
  };

  const canEdit = canDelete(); // 제보자만 수정 가능

  const handleDelete = async () => {
    if (!canDelete()) {
      toast.error('본인이 제보한 편의점만 삭제할 수 있습니다.');
      return;
    }

    if (!confirm(`${store.name} 정보를 삭제하시겠습니까?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const isDeleted = await deleteStore(store.id);

      if (isDeleted) {
        // 로컬스토리지에서도 제거
        try {
          const reportedStores: string[] = JSON.parse(localStorage.getItem('reportedStores') || '[]');
          if (Array.isArray(reportedStores)) {
            const updatedStores = reportedStores.filter((id: string) => id !== store.id);
            localStorage.setItem('reportedStores', JSON.stringify(updatedStores));
          }
        } catch {
          // 로컬스토리지 업데이트 실패는 무시 - 기능에 영향 없음
        }

        toast.success('편의점 정보가 삭제되었습니다.');
        onDelete(store.id);
      } else {
        toast.error('삭제 중 오류가 발생했습니다.');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      toast.error(`삭제 중 오류: ${errorMessage}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              {/* 이름 + 주소 + 버튼/배지 */}
              <div className="flex items-start justify-between mb-3 gap-3">
                <div>
                  <h3 className="font-medium text-lg">{store.name}</h3>
                  <div className="flex items-center text-gray-600 text-sm mt-1">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{store.address}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditDialogOpen(true)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {(() => {
                    const { bg, text } = getSeatingBadgeStyle(store.hasSeating);
                    return (
                      <Badge className={`${bg} ${text} hover:${bg}`}>
                        {getSeatingStatusText(store.hasSeating)}
                      </Badge>
                    );
                  })()}
                </div>
              </div>

              {/* 시간 + 제보자 */}
              <div className="flex items-center text-xs text-gray-500 mb-3">
                <div className="flex items-center flex-1">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>{formatDate(store.lastUpdated)}</span>
                </div>
                {store.reportedBy && (
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    <span>{store.reportedBy}</span>
                  </div>
                )}
              </div>

              {/* 설명 */}
              {store.notes && (
                <div className="rounded bg-gray-50 p-2.5 text-sm">
                  <div className="flex items-start">
                    <MessageSquare className="h-3 w-3 mr-1.5 mt-0.5 text-gray-400 shrink-0" />
                    <span className="text-gray-700">{formatNotes(store.notes, store.hasSeating)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 편의점 정보 수정 Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setIsEditingStore(false);
        }
      }}>
        <SheetContent side="right" className="w-full max-w-2xl bg-white flex flex-col p-0">
          <SheetTitle className="sr-only">편의점 정보 수정</SheetTitle>
          <SheetDescription className="sr-only">편의점 정보를 확인하고 필요한 내용을 수정합니다.</SheetDescription>
          <div className="overflow-y-auto flex-1 p-6">
            {isEditingStore ? (
              <>
                {/* 수정 모드 */}
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="text-xl">✏️</span>
                    {store.name} 정보 수정
                  </h2>
                </div>

                <ReportForm
                  storeId={store.id}
                  initialData={store}
                  actionType={actionType}
                  onSuccess={async () => {
                    setIsEditDialogOpen(false);
                    setIsEditingStore(false);
                    // 데이터 새로고침
                    await refreshStores();
                  }}
                />
              </>
            ) : (
              <>
                {/* 정보 조회 모드 */}
                <div className="mb-6 pb-4 border-b border-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{store.name}</h2>
                      <div className="flex items-center text-gray-600 text-sm mt-2 gap-1">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <p className="line-clamp-2">{store.address}</p>
                      </div>
                    </div>
                    <div>
                      {(() => {
                        const { bg, text } = getSeatingBadgeStyle(store.hasSeating);
                        return (
                          <Badge className={`${bg} ${text} hover:${bg} text-xs px-3 py-1`}>
                            {getSeatingStatusText(store.hasSeating)}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 좌석 상태 */}
                  {store.hasSeating === 'unknown' ? (
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
                      store.hasSeating === 'yes'
                        ? 'border-l-green-500 bg-green-50'
                        : 'border-l-red-500 bg-red-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">
                            {store.hasSeating === 'yes' ? '✅' : '❌'}
                          </div>
                          <div>
                            <h3 className={`font-semibold ${
                              store.hasSeating === 'yes'
                                ? 'text-green-900'
                                : 'text-red-900'
                            }`}>
                              {store.hasSeating === 'yes'
                                ? '좌석이 있습니다'
                                : '좌석이 없습니다'}
                            </h3>
                            <p className={`text-sm mt-1 ${
                              store.hasSeating === 'yes'
                                ? 'text-green-700'
                                : 'text-red-700'
                            }`}>
                              {store.hasSeating === 'yes'
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
                            <p className="font-semibold text-gray-900">{formatDate(store.lastUpdated)}</p>
                          </div>
                        </div>
                        {store.reportedBy && (
                          <div className="flex items-start gap-3 pt-2 border-t border-gray-100">
                            <User className="h-5 w-5 text-gray-400 mt-1 shrink-0" />
                            <div>
                              <p className="text-xs text-gray-500">제보자</p>
                              <p className="font-semibold text-gray-900">{store.reportedBy}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 상세 정보 */}
                  {store.notes ? (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">상세 정보</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">{store.notes}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-gray-50">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-gray-500">좌석 형태/비고 정보가 아직 없습니다.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 고정 버튼 영역 (스크롤 상관없이 항상 보임) */}
          {!isEditingStore && (
            <div className="border-t border-slate-200 p-6 bg-white space-y-3">
              <Button
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-base"
                onClick={() => {
                  setActionType('edit');
                  setIsEditingStore(true);
                }}
              >
                <Edit2 className="h-5 w-5 mr-2" />
                정보 수정하기
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 border-2 border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold rounded-lg"
                onClick={() => {
                  setActionType('warning');
                  setIsEditingStore(true);
                }}
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                <div className="flex flex-col items-start">
                  <span className="text-base">⚠️ 실제와 다른가요?</span>
                  <span className="text-xs opacity-80">잘못된 정보를 제보해주세요</span>
                </div>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}