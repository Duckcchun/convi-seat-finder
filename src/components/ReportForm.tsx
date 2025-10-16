import { useState, useEffect, useCallback } from 'react';
import { StoreSearchInput } from './StoreSearchInput';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner@2.0.3';
import { StoreFormData, StoreSelectInfo } from '../types/store';
import { MapPin, User, MessageSquare, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface ReportFormProps {
  onSuccess: () => void;
  initialData?: StoreSelectInfo;
}

export function ReportForm({ onSuccess, initialData }: ReportFormProps) {
  const [formData, setFormData] = useState<StoreFormData>({
    name: '',
    address: '',
    hasSeating: 'unknown',
    reporterName: '',
    notes: '',
    latitude: undefined,
    longitude: undefined
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // initialData가 변경될 때 폼 데이터 업데이트
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name,
        address: initialData.address,
        latitude: initialData.latitude,
        longitude: initialData.longitude
      }));
    }
  }, [initialData]);

  // 편의점 검색에서 선택했을 때 처리
  const handleStoreSearchSelect = useCallback((storeInfo: StoreSelectInfo) => {
    setFormData(prev => ({
      ...prev,
      name: storeInfo.name,
      address: storeInfo.address,
      latitude: storeInfo.latitude,
      longitude: storeInfo.longitude
    }));
    toast.success(`${storeInfo.name}이(가) 선택되었습니다.`);
  }, []);

  // 폼 필드 업데이트 핸들러
  const updateFormField = useCallback((field: keyof StoreFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('편의점 이름과 주소는 필수 입력 항목입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const responseData = await response.json();
        
        // 로컬스토리지에 사용자가 제보한 편의점 ID 저장
        try {
          const reportedStores = JSON.parse(localStorage.getItem('reportedStores') || '[]');
          if (!reportedStores.includes(responseData.id)) {
            reportedStores.push(responseData.id);
            localStorage.setItem('reportedStores', JSON.stringify(reportedStores));
          }
        } catch (error) {
          console.error('로컬스토리지 저장 오류:', error);
        }

        toast.success('편의점 정보가 성공적으로 제보되었습니다!');
        
        // 폼 초기화
        setFormData({
          name: '',
          address: '',
          hasSeating: 'unknown',
          reporterName: '',
          notes: '',
          latitude: undefined,
          longitude: undefined
        });
        
        onSuccess();
      } else {
        const errorText = await response.text();
        console.error('제보 실패:', errorText);
        toast.error('제보 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      console.error('제보 중 오류:', error);
      toast.error('제보 중 오류가 발생했습니다. 네트워크 연결을 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 안내 카드 */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start space-x-3">
            <Info className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-900 text-lg">제보 안내</h4>
              <div className="text-blue-800 space-y-1 text-base">
                <p>• 정확한 정보 제공으로 다른 사용자들에게 도움을 주세요</p>
                <p>• 좌석 정보는 실제 방문 후 확인된 내용을 입력해주세요</p>
                <p>• 제보해주신 정보는 검토 후 공개됩니다</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 편의점 기본 정보 */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold text-gray-900">편의점 기본 정보</h3>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-base font-medium mb-3 block">
                편의점 이름 <span className="text-red-500">*</span>
              </Label>
              <StoreSearchInput
                value={formData.name}
                onValueChange={(value) => updateFormField('name', value)}
                onStoreSelect={handleStoreSearchSelect}
                placeholder="편의점 이름을 입력하거나 검색하세요 (예: CU 강남역점)"
                disabled={isSubmitting}
              />
              <p className="text-sm text-gray-600 mt-2 flex items-center">
                <Info className="h-4 w-4 mr-1" />
                편의점 이름을 입력하면 실제 편의점을 자동으로 검색할 수 있습니다
              </p>
            </div>

            <div>
              <Label htmlFor="address" className="text-base font-medium mb-3 block">
                주소 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="예: 서울시 강남구 테헤란로 123"
                value={formData.address}
                onChange={(e) => updateFormField('address', e.target.value)}
                disabled={isSubmitting}
                required
                className="h-12 text-base"
              />
              {formData.latitude && formData.longitude && (
                <p className="text-sm text-green-700 mt-2 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  위치 정보가 자동으로 설정되었습니다
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 좌석 정보 */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="text-xl font-semibold text-gray-900">좌석 정보</h3>
          </div>

          <div>
            <Label className="text-base font-medium mb-4 block">
              좌석 여부 <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.hasSeating}
              onValueChange={(value) => updateFormField('hasSeating', value)}
              disabled={isSubmitting}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3 p-4 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                <RadioGroupItem value="yes" id="yes" className="w-5 h-5" />
                <Label htmlFor="yes" className="text-base cursor-pointer flex-1">
                  <div className="font-medium text-green-800">좌석 있음</div>
                  <div className="text-sm text-green-600 mt-1">앉아서 취식할 수 있는 테이블이나 의자가 있음</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <RadioGroupItem value="no" id="no" className="w-5 h-5" />
                <Label htmlFor="no" className="text-base cursor-pointer flex-1">
                  <div className="font-medium text-red-800">좌석 없음</div>
                  <div className="text-sm text-red-600 mt-1">서서 취식만 가능하거나 좌석이 전혀 없음</div>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="unknown" id="unknown" className="w-5 h-5" />
                <Label htmlFor="unknown" className="text-base cursor-pointer flex-1">
                  <div className="font-medium text-gray-800">확실하지 않음</div>
                  <div className="text-sm text-gray-600 mt-1">좌석 여부를 확실히 알지 못하는 경우</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {/* 추가 정보 */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 pb-2 border-b">
            <User className="h-5 w-5 text-gray-600" />
            <h3 className="text-xl font-semibold text-gray-900">추가 정보 (선택사항)</h3>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="reporterName" className="text-base font-medium mb-3 block">
                제보자 이름
              </Label>
              <Input
                id="reporterName"
                type="text"
                placeholder="익명 (입력하지 않으면 익명으로 표시됩니다)"
                value={formData.reporterName}
                onChange={(e) => updateFormField('reporterName', e.target.value)}
                disabled={isSubmitting}
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-base font-medium mb-3 block flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                상세 정보
              </Label>
              <Textarea
                id="notes"
                placeholder="좌석 개수, 테이블 형태, 이용 시간대, 기타 특이사항 등 상세한 정보를 입력해주세요..."
                value={formData.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="text-base resize-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                예: "4인 테이블 2개, 2인 테이블 3개 있음. 주말에는 혼잡함"
              </p>
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-6 border-t">
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-lg font-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                제보 중...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle2 className="h-5 w-5 mr-2" />
                정보 제보하기
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}