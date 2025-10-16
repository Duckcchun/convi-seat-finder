import { useState, useEffect } from 'react';
import { Store } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { 
  Shield, 
  Database, 
  Users, 
  MapPin, 
  BarChart3, 
  Download, 
  Edit, 
  Trash2,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface AdminDashboardProps {
  onClose: () => void;
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Store>>({});

  useEffect(() => {
    loadAllStores();
  }, []);

  const loadAllStores = async () => {
    try {
      setIsLoading(true);
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/stores`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const validStores = (Array.isArray(data) ? data : []).filter(
          (store) => store && store.id && store.name && store.address
        );
        setStores(validStores);
      } else {
        toast.error('데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
      toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStore = (store: Store) => {
    setSelectedStore(store);
    setEditForm(store);
    setIsEditDialogOpen(true);
  };

  const handleUpdateStore = async () => {
    if (!selectedStore || !editForm.name || !editForm.address) {
      toast.error('필수 정보를 모두 입력해주세요.');
      return;
    }

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/stores/${selectedStore.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(editForm),
        },
      );

      if (response.ok) {
        toast.success('정보가 업데이트되었습니다.');
        setIsEditDialogOpen(false);
        loadAllStores();
      } else {
        toast.error('업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('업데이트 오류:', error);
      toast.error('업데이트 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm('정말로 이 데이터를 삭제하시겠습니까?')) return;

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/stores/${storeId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        },
      );

      if (response.ok) {
        toast.success('데이터가 삭제되었습니다.');
        loadAllStores();
      } else {
        toast.error('삭제에 실패했습니다.');
      }
    } catch (error) {
      console.error('삭제 오류:', error);
      toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(stores, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `convenience_stores_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('데이터가 내보내기되었습니다.');
  };

  const getStatistics = () => {
    const total = stores.length;
    const hasSeating = stores.filter(store => store.hasSeating === 'yes').length;
    const noSeating = stores.filter(store => store.hasSeating === 'no').length;
    const unknown = stores.filter(store => store.hasSeating === 'unknown').length;
    const recentReports = stores.filter(store => {
      const reportDate = new Date(store.lastUpdated);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reportDate > weekAgo;
    }).length;

    return { total, hasSeating, noSeating, unknown, recentReports };
  };

  const stats = getStatistics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-semibold">관리자 대시보드</h2>
        </div>
        <Button variant="outline" onClick={onClose}>
          <LogOut className="h-4 w-4 mr-2" />
          나가기
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="data">데이터 관리</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 편의점</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">좌석 있음</CardTitle>
                <MapPin className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.hasSeating}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? ((stats.hasSeating / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">좌석 없음</CardTitle>
                <MapPin className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.noSeating}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.total > 0 ? ((stats.noSeating / stats.total) * 100).toFixed(1) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">최근 7일 제보</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.recentReports}</div>
              </CardContent>
            </Card>
          </div>

          {/* 내보내기 버튼 */}
          <Card>
            <CardHeader>
              <CardTitle>데이터 관리</CardTitle>
              <CardDescription>
                편의점 데이터를 내보내거나 백업할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportData} className="inline-flex items-center">
                <Download className="h-4 w-4 mr-2" />
                데이터 내보내기 (JSON)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>편의점 데이터 ({stores.length}개)</CardTitle>
              <CardDescription>
                모든 편의점 데이터를 조회하고 관리할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>주소</TableHead>
                      <TableHead>좌석</TableHead>
                      <TableHead>제보자</TableHead>
                      <TableHead>업데이트</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{store.address}</TableCell>
                        <TableCell>
                          {store.hasSeating === 'yes' && (
                            <Badge className="bg-green-100 text-green-800">있음</Badge>
                          )}
                          {store.hasSeating === 'no' && (
                            <Badge className="bg-red-100 text-red-800">없음</Badge>
                          )}
                          {store.hasSeating === 'unknown' && (
                            <Badge variant="outline">미확인</Badge>
                          )}
                        </TableCell>
                        <TableCell>{store.reportedBy || '익명'}</TableCell>
                        <TableCell>
                          {new Date(store.lastUpdated).toLocaleDateString('ko-KR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditStore(store)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteStore(store.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {stores.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">등록된 편의점이 없습니다.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 편집 다이얼로그 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>편의점 정보 수정</DialogTitle>
            <DialogDescription>
              편의점 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">편의점 이름</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">주소</Label>
              <Input
                id="edit-address"
                value={editForm.address || ''}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <Label>좌석 여부</Label>
              <RadioGroup
                value={editForm.hasSeating || 'unknown'}
                onValueChange={(value) => setEditForm({ ...editForm, hasSeating: value as 'yes' | 'no' | 'unknown' })}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="edit-yes" />
                  <Label htmlFor="edit-yes">좌석 있음</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="edit-no" />
                  <Label htmlFor="edit-no">좌석 없음</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unknown" id="edit-unknown" />
                  <Label htmlFor="edit-unknown">확실하지 않음</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reporter">제보자</Label>
              <Input
                id="edit-reporter"
                value={editForm.reportedBy || ''}
                onChange={(e) => setEditForm({ ...editForm, reportedBy: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleUpdateStore}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}