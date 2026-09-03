import { Clock, User } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Store } from '../types/store';
import { formatDate, SEAT_TYPE_META } from '../utils/formatters';

interface StoreDetailContentProps {
  store: Store;
}

/**
 * 편의점 상세 정보 표시 블록 (좌석 상태 배너 · 좌석 형태 · 최근 업데이트 · 상세 정보).
 * StoreItem과 MapView의 핀 클릭 상세 시트에서 공통으로 사용한다.
 */
export function StoreDetailContent({ store }: StoreDetailContentProps) {
  const isYes = store.hasSeating === 'yes';

  return (
    <div className="space-y-4">
      {/* 좌석 상태 배너 */}
      {store.hasSeating === 'unknown' ? (
        <Card className="rounded-2xl border-l-4 border-l-slate-400 bg-muted/40">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">❓</div>
              <div>
                <h3 className="font-semibold text-foreground">좌석 정보 미확인</h3>
                <p className="mt-1 text-sm text-muted-foreground">정확한 좌석 정보를 입력해주세요</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`rounded-2xl border-l-4 ${
            isYes ? 'border-l-emerald-500 bg-emerald-50' : 'border-l-red-500 bg-red-50'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{isYes ? '✅' : '❌'}</div>
              <div>
                <h3 className={`font-semibold ${isYes ? 'text-emerald-900' : 'text-red-900'}`}>
                  {isYes ? '좌석이 있습니다' : '좌석이 없습니다'}
                </h3>
                <p className={`mt-1 text-sm ${isYes ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isYes ? '앉아서 취식할 수 있습니다' : '서서 취식만 가능합니다'}
                </p>
                {/* 좌석 형태 뱃지 */}
                {isYes && store.seatTypes && store.seatTypes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {store.seatTypes.map((type) => {
                      const meta = SEAT_TYPE_META[type];
                      if (!meta) return null;
                      return (
                        <Badge
                          key={type}
                          className="rounded-full border border-emerald-300 bg-white text-emerald-700 hover:bg-white"
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

      {/* 최근 업데이트 · 제보자 */}
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
  );
}
