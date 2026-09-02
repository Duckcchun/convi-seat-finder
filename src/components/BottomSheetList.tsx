import { useMemo } from 'react';
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { Store } from '../types/store';
import { ConvenienceStoreList } from './ConvenienceStoreList';

interface BottomSheetListProps {
  stores: Store[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (storeId: string) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

export function BottomSheetList({
  stores,
  isLoading,
  onRefresh,
  onDelete,
  expanded,
  onExpandedChange,
}: BottomSheetListProps) {
  const summary = useMemo(() => {
    const total = stores.length;
    const confirmed = stores.filter((s) => s.hasSeating !== 'unknown').length;
    const withSeating = stores.filter((s) => s.hasSeating === 'yes').length;
    return { total, confirmed, withSeating };
  }, [stores]);

  return (
    <section
      className={`absolute inset-x-0 bottom-0 z-40 flex flex-col rounded-t-3xl border-t border-border bg-card shadow-2xl transition-[height] duration-300 ease-in-out ${
        expanded ? 'h-[78vh]' : 'h-[124px]'
      }`}
      aria-label="편의점 목록"
    >
      {/* 핸들 + 요약 (탭하면 펼침/접힘 토글) */}
      <button
        type="button"
        onClick={() => onExpandedChange(!expanded)}
        aria-expanded={expanded}
        className="flex w-full shrink-0 flex-col items-stretch rounded-t-3xl px-5 pb-2 pt-2.5 text-left"
      >
        <span className="mx-auto mb-2.5 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        <span className="flex items-center justify-between gap-3">
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">제보된 편의점</span>
            <span className="text-xs text-muted-foreground">
              전체 {summary.total} · 좌석있음 {summary.withSeating} · 확인됨 {summary.confirmed}
            </span>
          </span>
          <span className="flex items-center gap-1">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onRefresh();
                }
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
              aria-label="목록 새로고침"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground">
              {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </span>
          </span>
        </span>
      </button>

      {/* 펼침 시 전체 목록 */}
      <div className={`min-h-0 flex-1 overflow-y-auto px-5 pb-6 ${expanded ? '' : 'pointer-events-none opacity-0'}`}>
        <ConvenienceStoreList
          stores={stores}
          isLoading={isLoading}
          onRefresh={onRefresh}
          onDelete={onDelete}
          embedded
        />
      </div>
    </section>
  );
}
