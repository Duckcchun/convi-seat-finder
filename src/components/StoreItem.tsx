import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { MapPin, Clock, User, Trash2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Store } from '../types/store';

interface StoreItemProps {
  store: Store;
  onDelete: (storeId: string) => void;
}

export function StoreItem({ store, onDelete }: StoreItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getSeatingBadge = (hasSeating: Store['hasSeating']) => {
    switch (hasSeating) {
      case 'yes':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">좌석 있음</Badge>;
      case 'no':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">좌석 없음</Badge>;
      default:
        return <Badge variant="secondary">정보 부족</Badge>;
    }
  };

  const canDelete = () => {
    try {
      const reportedStores = JSON.parse(localStorage.getItem('reportedStores') || '[]');
      return reportedStores.includes(store.id);
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
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/stores/${store.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (response.ok) {
        // 로컬스토리지에서도 제거
        try {
          const reportedStores = JSON.parse(localStorage.getItem('reportedStores') || '[]');
          const updatedStores = reportedStores.filter((id: string) => id !== store.id);
          localStorage.setItem('reportedStores', JSON.stringify(updatedStores));
        } catch (error) {
          console.error('로컬스토리지 업데이트 오류:', error);
        }

        toast.success('편의점 정보가 삭제되었습니다.');
        onDelete(store.id);
      } else {
        const errorText = await response.text();
        console.error('삭제 실패:', errorText);
        toast.error('삭제 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('삭제 중 오류:', error);
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-lg">{store.name}</h3>
                <div className="flex items-center text-gray-600 text-sm mt-1">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{store.address}</span>
                </div>
              </div>
              {getSeatingBadge(store.hasSeating)}
            </div>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
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
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                <div className="flex items-start">
                  <MessageSquare className="h-3 w-3 mr-1 mt-0.5 text-gray-400" />
                  <span className="text-gray-700">{store.notes}</span>
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
              className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
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