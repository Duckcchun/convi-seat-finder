import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Clock, User, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { Store } from '../types/store';
import { deleteStore } from '../utils/store-api';
import { formatDate, formatNotes, getSeatingBadgeStyle, getSeatingStatusText } from '../utils/formatters';

interface StoreItemProps {
  store: Store;
  onDelete: (storeId: string) => void;
}

export function StoreItem({ store, onDelete }: StoreItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = () => {
    try {
      const reportedStores: string[] = JSON.parse(localStorage.getItem('reportedStores') || '[]');
      return Array.isArray(reportedStores) && reportedStores.includes(store.id);
    } catch {
      return false;
    }
  };

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
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2 gap-3">
              <div>
                <h3 className="font-medium text-lg">{store.name}</h3>
                <div className="flex items-center text-gray-600 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{store.address}</span>
                </div>
              </div>
              {(() => {
                const { bg, text } = getSeatingBadgeStyle(store.hasSeating);
                return (
                  <Badge className={`${bg} ${text} hover:${bg}`}>
                    {getSeatingStatusText(store.hasSeating)}
                  </Badge>
                );
              })()}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-gray-500">
              <div className="flex items-center">
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

            {store.notes && (
              <div className="mt-2 rounded bg-gray-50 p-2.5 text-sm">
                <div className="flex items-start">
                  <MessageSquare className="h-3 w-3 mr-1 mt-0.5 text-gray-400" />
                  <span className="text-gray-700">{formatNotes(store.notes, store.hasSeating)}</span>
                </div>
              </div>
            )}
          </div>

          {canDelete() && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="ml-3 shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}