import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from './ui/sheet';
import { MapPin, Clock, User, Trash2, MessageSquare, Edit2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Store } from '../types/store';
import { deleteStore } from '../utils/store-api';
import { formatDate, formatNotes, getSeatingBadgeClass, getSeatingStatusText, SEAT_TYPE_META } from '../utils/formatters';
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
      <Card
        className={`gap-0 rounded-2xl border-border/70 py-0 shadow-sm transition-shadow hover:shadow-md ${
          store.hasSeating === 'unknown' ? 'border-dashed bg-muted/30' : 'bg-card'
        }`}
      >
        <CardContent className="p-4">
          {/* 이름 + 주소 + 상태 배지 */}
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">{store.name}</h3>
              <div className="mt-1 flex items-start gap-1 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{store.address}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label="정보 수정"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {canDelete() && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Badge className={`${getSeatingBadgeClass(store.hasSeating)} rounded-full`}>
                {getSeatingStatusText(store.hasSeating)}
              </Badge>
            </div>
          </div>

          {/* 좌석 형태 뱃지 */}
          {store.hasSeating === 'yes' && store.seatTypes && store.seatTypes.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {store.seatTypes.map((type) => {
                const meta = SEAT_TYPE_META[type];
                if (!meta) return null;
                return (
                  <Badge
                    key={type}
                    variant="outline"
                    className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                  >
                    {meta.emoji} {meta.label}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* 시간 + 제보자 */}
          <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex flex-1 items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(store.lastUpdated)}
            </span>
            {store.reportedBy && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {store.reportedBy}
              </span>
            )}
          </div>

          {/* 설명 / 미확인 안내 */}
          {store.hasSeating === 'unknown' ? (
            <button
              type="button"
              onClick={() => {
                setActionType('edit');
                setIsEditingStore(true);
                setIsEditDialogOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-2.5 text-left text-sm text-primary transition-colors hover:bg-primary/10"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>좌석 정보가 아직 없어요. 눌러서 제보해주세요</span>
            </button>
          ) : (
            store.notes && (
              <div className="rounded-xl bg-muted/60 p-2.5 text-sm">
                <div className="flex items-start gap-1.5">
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-foreground/80">{formatNotes(store.notes, store.hasSeating)}</span>
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {/* 편의점 정보 수정 Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={(open: boolean) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setIsEditingStore(false);
        }
      }}>
        <SheetContent side="right" className="flex w-full max-w-md flex-col bg-card p-0 sm:max-w-lg">
          <SheetTitle className="sr-only">편의점 정보 수정</SheetTitle>
          <SheetDescription className="sr-only">편의점 정보를 확인하고 필요한 내용을 수정합니다.</SheetDescription>
          <div className="flex-1 overflow-y-auto p-6">
            {isEditingStore ? (
              <>
                {/* 수정 모드 */}
                <div className="mb-6 border-b border-border pb-4">
                  <h2 className="text-xl font-bold text-foreground">{store.name} 정보 수정</h2>
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
                <div className="mb-6 border-b border-border pb-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-foreground">{store.name}</h2>
                      <div className="mt-2 flex items-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <p className="line-clamp-2">{store.address}</p>
                      </div>
                    </div>
                    <div>
                      <Badge className={`${getSeatingBadgeClass(store.hasSeating)} rounded-full px-3 py-1 text-xs`}>
                        {getSeatingStatusText(store.hasSeating)}
                      </Badge>
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
                            {store.hasSeating === 'yes' && store.seatTypes && store.seatTypes.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                {store.seatTypes.map((type) => {
                                  const meta = SEAT_TYPE_META[type];
                                  if (!meta) return null;
                                  return (
                                    <Badge
                                      key={type}
                                      className="bg-white text-emerald-700 border border-emerald-300 hover:bg-white"
                                    >
                                      {meta.emoji} {meta.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 최근 업데이트 */}
                  <Card className="rounded-2xl border-border/70">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Clock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">최근 업데이트</p>
                            <p className="font-semibold text-foreground">{formatDate(store.lastUpdated)}</p>
                          </div>
                        </div>
                        {store.reportedBy && (
                          <div className="flex items-start gap-3 border-t border-border pt-2">
                            <User className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">제보자</p>
                              <p className="font-semibold text-foreground">{store.reportedBy}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* 상세 정보 */}
                  {store.notes ? (
                    <Card className="rounded-2xl border-border/70">
                      <CardContent className="p-4">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">상세 정보</h3>
                        <p className="text-sm leading-relaxed text-foreground/80">{store.notes}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="rounded-2xl border-border/70 bg-muted/40">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground">좌석 형태/비고 정보가 아직 없습니다.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>

          {/* 고정 버튼 영역 (스크롤 상관없이 항상 보임) */}
          {!isEditingStore && (
            <div className="space-y-3 border-t border-border bg-card p-6">
              <Button
                className="h-12 w-full rounded-xl text-base font-semibold"
                onClick={() => {
                  setActionType('edit');
                  setIsEditingStore(true);
                }}
              >
                <Edit2 className="mr-2 h-5 w-5" />
                정보 수정하기
              </Button>
              <Button
                variant="outline"
                className="h-12 w-full rounded-xl border-2 border-amber-300 font-semibold text-amber-700 hover:bg-amber-50"
                onClick={() => {
                  setActionType('warning');
                  setIsEditingStore(true);
                }}
              >
                <AlertCircle className="mr-2 h-5 w-5" />
                <div className="flex flex-col items-start">
                  <span className="text-base">실제와 다른가요?</span>
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