import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { StoreSearchInput } from './StoreSearchInput';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { createStore } from '../utils/store-api';
import type { StoreFormData, StoreSelectInfo } from '../types/store';
import { MapPin, User, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { getErrorMessage } from '../utils/errorHandler';
import { validateField, type StoreFormSchema } from '../utils/validation';

interface ReportFormProps {
  onSuccess: () => void;
  initialData?: StoreSelectInfo;
}

type SeatOption = {
  id: StoreFormData['hasSeating'];
  title: string;
  desc: string;
  accent: string;
  colors: {
    default: {
      containerBg: string;
      containerBorder: string;
      title: string;
      desc: string;
      radioBorder: string;
    };
    selected: {
      containerBg: string;
      containerBorder: string;
      title: string;
      desc: string;
      radioBorder: string;
    };
  };
};

const SEAT_OPTIONS: SeatOption[] = [
  {
    id: 'yes',
    title: '좌석 있음',
    desc: '앉아서 취식할 수 있는 테이블이나 의자가 있음',
    accent: '#059669',
    colors: {
      default: {
        containerBg: '#f0fdf4',
        containerBorder: '#bbf7d0',
        title: '#065f46',
        desc: '#047857',
        radioBorder: '#059669',
      },
      selected: {
        containerBg: '#dcfce7',
        containerBorder: '#22c55e',
        title: '#064e3b',
        desc: '#047857',
        radioBorder: '#059669',
      },
    },
  },
  {
    id: 'no',
    title: '좌석 없음',
    desc: '서서 취식만 가능하거나 좌석이 전혀 없음',
    accent: '#dc2626',
    colors: {
      default: {
        containerBg: '#fff1f2',
        containerBorder: '#fecdd3',
        title: '#9f1239',
        desc: '#be123c',
        radioBorder: '#dc2626',
      },
      selected: {
        containerBg: '#ffe4e6',
        containerBorder: '#fb7185',
        title: '#881337',
        desc: '#be123c',
        radioBorder: '#dc2626',
      },
    },
  },
  {
    id: 'unknown',
    title: '확실하지 않음',
    desc: '좌석 여부를 확실히 알지 못하는 경우',
    accent: '#6b7280',
    colors: {
      default: {
        containerBg: '#f8fafc',
        containerBorder: '#e2e8f0',
        title: '#334155',
        desc: '#475569',
        radioBorder: '#6b7280',
      },
      selected: {
        containerBg: '#e2e8f0',
        containerBorder: '#94a3b8',
        title: '#0f172a',
        desc: '#334155',
        radioBorder: '#6b7280',
      },
    },
  },
];

export function ReportForm({ onSuccess, initialData }: ReportFormProps) {
  const { stores } = useStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<StoreFormSchema>({
    mode: 'onBlur',
    defaultValues: {
      name: '',
      address: '',
      hasSeating: 'unknown',
      reporterName: '',
      notes: '',
      latitude: undefined,
      longitude: undefined,
    },
  });

  const formValues = watch();

  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('address', initialData.address);
      if (initialData.latitude) setValue('latitude', initialData.latitude);
      if (initialData.longitude) setValue('longitude', initialData.longitude);
    }
  }, [initialData, setValue]);

  const handleStoreSearchSelect = useCallback((storeInfo: StoreSelectInfo) => {
    setValue('name', storeInfo.name);
    setValue('address', storeInfo.address);
    if (storeInfo.latitude) setValue('latitude', storeInfo.latitude);
    if (storeInfo.longitude) setValue('longitude', storeInfo.longitude);
    toast.success(`${storeInfo.name}이(가) 선택되었습니다.`);
  }, [setValue]);

  const resolveCoordinatesFromAddress = useCallback(async (address: string) => {
    const query = address.trim();
    if (!query) return null;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept-Language': 'ko',
          },
        },
      );

      if (!response.ok) return null;

      const results = await response.json();
      if (!Array.isArray(results) || results.length === 0) return null;

      const first = results[0];
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude, longitude };
    } catch {
      return null;
    }
  }, []);

  const onSubmit = async (data: StoreFormSchema) => {
    const normalizedName = data.name.trim().toLowerCase();
    const normalizedAddress = data.address.trim().toLowerCase();
    const isAlreadyReported = stores.some(
      (store) =>
        store.name.trim().toLowerCase() === normalizedName &&
        store.address.trim().toLowerCase() === normalizedAddress,
    );

    if (isAlreadyReported) {
      toast.error('이미 제보된 편의점입니다.');
      return;
    }

    try {
      let payload: StoreFormData = { ...data };

      if ((!payload.latitude || !payload.longitude) && payload.address.trim()) {
        const resolvedCoords = await resolveCoordinatesFromAddress(payload.address);
        if (resolvedCoords) {
          payload = {
            ...payload,
            latitude: resolvedCoords.latitude,
            longitude: resolvedCoords.longitude,
          };
        }
      }

      const savedStore = await createStore(payload);

      try {
        const reportedStores: string[] = JSON.parse(localStorage.getItem('reportedStores') || '[]');
        if (Array.isArray(reportedStores) && !reportedStores.includes(savedStore.id)) {
          reportedStores.push(savedStore.id);
          localStorage.setItem('reportedStores', JSON.stringify(reportedStores));
        }
      } catch {
        // 로컬스토리지 저장 실패는 무시 - 기능에 영향 없음
      }

      toast.success('편의점 정보가 성공적으로 제보되었습니다!');

      reset({
        name: '',
        address: '',
        hasSeating: 'unknown',
        reporterName: '',
        notes: '',
        latitude: undefined,
        longitude: undefined,
      });

      onSuccess();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      toast.error(errorMessage);
    }
  };

  const isAlreadyReported = Boolean(
    formValues.name &&
      formValues.address &&
      stores.some(
        (store) =>
          store.name.trim().toLowerCase() === formValues.name.trim().toLowerCase() &&
          store.address.trim().toLowerCase() === formValues.address.trim().toLowerCase(),
      ),
  );

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col">
        <div className="mb-6 mt-4 space-y-3 border-b border-slate-100 pb-5">
          <div className="mb-3 flex items-center gap-1.5">
            <MapPin className="h-5 w-5 shrink-0 text-blue-600" />
            <h3 className="text-base font-semibold text-gray-900">편의점 기본 정보</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="block text-sm font-medium">
                편의점 이름 <span className="text-red-500">*</span>
              </Label>
              <StoreSearchInput
                value={formValues.name}
                onValueChange={(value) => setValue('name', value)}
                onStoreSelect={handleStoreSearchSelect}
                placeholder="편의점 이름을 입력하거나 검색하세요"
                disabled={isSubmitting}
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
              <p className="mt-3 mb-4 flex items-center gap-2 text-xs text-blue-700">
                <Info className="h-4 w-4 shrink-0" />
                편의점 이름을 입력하면 실제 편의점을 자동으로 검색할 수 있습니다
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="block text-sm font-medium">
                주소 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="address"
                type="text"
                placeholder="예: 서울시 강남구 테헤란로 123"
                {...register('address', {
                  validate: (value) => validateField('address', value) || true,
                })}
                disabled={isSubmitting}
                className="h-11 border-slate-300 bg-white px-4 py-3 text-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
              {errors.address && <p className="mt-2 text-sm text-red-600">{errors.address.message}</p>}
              {formValues.latitude && formValues.longitude && (
                <p className="mt-1.5 flex items-center text-xs text-green-700 gap-1">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  위치 정보가 자동으로 설정되었습니다
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 mt-6 space-y-3 border-b border-slate-100 pb-5">
          <div className="mb-3 flex items-center gap-1.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-orange-600" />
            <h3 className="text-base font-semibold text-gray-900">좌석 정보</h3>
          </div>

          <div>
            <Label className="mb-2 block text-sm font-medium">
              좌석 여부 <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-3" role="radiogroup" aria-label="좌석 여부">
              {SEAT_OPTIONS.map((option) => {
                const isSelected = formValues.hasSeating === option.id;
                const currentStyle = isSelected ? option.colors.selected : option.colors.default;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setValue('hasSeating', option.id)}
                    aria-pressed={isSelected}
                    className={`flex min-h-[64px] w-full items-center rounded-lg border-2 gap-2.5 px-3 py-2 text-left transition-colors duration-200 ${isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    style={{
                      backgroundColor: currentStyle.containerBg,
                      borderColor: currentStyle.containerBorder,
                    }}
                  >
                    <div className="mr-2 shrink-0 pt-0.5">
                      <div
                        className="flex items-center justify-center rounded-full transition-colors duration-200"
                        style={{
                          width: '16px',
                          height: '16px',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                          borderColor: isSelected ? currentStyle.radioBorder : option.accent,
                          backgroundColor: isSelected ? currentStyle.radioBorder : '#ffffff',
                        }}
                      >
                        {isSelected && <div className="rounded-full" style={{ width: '6px', height: '6px', backgroundColor: '#ffffff' }} />}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span
                        className="text-sm font-semibold leading-tight transition-colors duration-200"
                        style={{ color: currentStyle.title }}
                      >
                        {option.title}
                      </span>
                      <span
                        className="text-xs font-normal leading-tight transition-colors duration-200"
                        style={{ color: currentStyle.desc }}
                      >
                        {option.desc}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.hasSeating && <p className="mt-2 text-sm text-red-600">{errors.hasSeating.message}</p>}
          </div>
        </div>

        <div className="mb-6 mt-6 space-y-3">
          <div className="mb-3 flex items-center gap-1.5">
            <User className="h-5 w-5 shrink-0 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">추가 정보 (선택사항)</h3>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reporterName" className="block text-sm font-medium">
                제보자 이름
              </Label>
              <Input
                id="reporterName"
                type="text"
                placeholder="익명 (입력하지 않으면 익명으로 표시됩니다)"
                {...register('reporterName', {
                  validate: (value) => !value || validateField('reporterName', value) || true,
                })}
                disabled={isSubmitting}
                className="h-11 border-slate-300 bg-white px-4 py-3 text-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
              {errors.reporterName && <p className="mt-2 text-sm text-red-600">{errors.reporterName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes" className="block text-sm font-medium">
                상세 정보
              </Label>
              <Textarea
                id="notes"
                placeholder="좌석 개수, 테이블 형태, 이용 시간대, 기타 특이사항 등 상세한 정보를 입력해주세요..."
                {...register('notes', {
                  validate: (value) => !value || validateField('notes', value) || true,
                })}
                disabled={isSubmitting}
                rows={4}
                className="resize-none border-slate-300 bg-white px-4 py-3 text-sm focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
              />
              {errors.notes && <p className="mt-2 text-sm text-red-600">{errors.notes.message}</p>}
              <p className="mt-1 text-xs text-gray-500">
                예: "4인 테이블 2개, 2인 테이블 3개 있음. 주말에는 혼잡함"
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-8 border-t border-slate-100">
          {isAlreadyReported && (
            <div className="w-full rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
              <div className="flex items-center justify-center font-medium text-amber-800">
                <AlertCircle className="mr-2 h-5 w-5" />
                이미 제보된 위치입니다
              </div>
              <p className="mt-2 text-sm text-amber-700">
                다른 편의점을 검색하거나 기존 정보를 업데이트해주세요
              </p>
            </div>
          )}
          <Button 
            type="submit" 
            className="h-12 w-full bg-blue-600 text-base font-medium hover:bg-blue-700 mt-4" 
            disabled={isSubmitting || isAlreadyReported}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <div className="mr-3 h-5 w-5 animate-spin rounded-full border-b-2 border-white" />
                제보 중...
              </div>
            ) : (
              <div className="flex items-center">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                정보 제보하기
              </div>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}