import { Store, SeatType, BRAND_OPTIONS } from '../types/store';

/** 'all'을 제외한 실제 편의점 브랜드 목록 */
export const BRAND_NAMES = BRAND_OPTIONS.filter((b) => b !== 'all');

/**
 * 좌석 형태 표시 정보 (라벨 + 이모지).
 * 지도 앱이 제공하지 않는 정형화된 좌석 형태 정보로, 본 서비스의 핵심 차별 데이터다.
 */
export const SEAT_TYPE_META: Record<SeatType, { label: string; emoji: string }> = {
  bar: { label: '바 테이블', emoji: '🪑' },
  table: { label: '일반 테이블', emoji: '🍽️' },
  parasol: { label: '야외 파라솔', emoji: '⛱️' },
  standing: { label: '스탠딩', emoji: '🧍' },
};

/**
 * 좌석 형태 목록을 한글 라벨 배열로 변환
 */
export const getSeatTypeLabels = (seatTypes: SeatType[] | undefined): string[] => {
  if (!seatTypes || seatTypes.length === 0) return [];
  return seatTypes.map((type) => SEAT_TYPE_META[type]?.label).filter(Boolean);
};

/**
 * 좌석 형태 목록을 "🪑 바 테이블 · 🍽️ 일반 테이블" 형태의 요약 문자열로 변환
 */
export const formatSeatTypes = (seatTypes: SeatType[] | undefined): string => {
  if (!seatTypes || seatTypes.length === 0) return '';
  return seatTypes
    .map((type) => {
      const meta = SEAT_TYPE_META[type];
      return meta ? `${meta.emoji} ${meta.label}` : '';
    })
    .filter(Boolean)
    .join(' · ');
};

/**
 * 날짜 문자열을 한국 형식으로 포매팅
 * @example formatDate("2026-04-13T10:30:00") => "2026년 4월 13일 10:30"
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/**
 * 좌석 상태 텍스트 반환
 */
export const getSeatingStatusText = (hasSeating: Store['hasSeating']): string => {
  switch (hasSeating) {
    case 'yes':
      return '좌석 있음';
    case 'no':
      return '좌석 없음';
    default:
      return '정보 부족';
  }
};

/**
 * 좌석 상태별 배지 스타일 정보 (bg/text 분리 형태, 레거시)
 */
export const getSeatingBadgeStyle = (hasSeating: Store['hasSeating']): { bg: string; text: string } => {
  switch (hasSeating) {
    case 'yes':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'no':
      return { bg: 'bg-red-100', text: 'text-red-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};

/**
 * 좌석 상태별 배지에 적용할 완전한 정적 클래스 문자열.
 * (동적 조합 hover:${bg} 대신 Tailwind가 정적으로 스캔할 수 있는 클래스를 반환한다)
 */
export const getSeatingBadgeClass = (hasSeating: Store['hasSeating']): string => {
  switch (hasSeating) {
    case 'yes':
      return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
    case 'no':
      return 'bg-red-100 text-red-700 hover:bg-red-100';
    default:
      return 'bg-muted text-muted-foreground hover:bg-muted';
  }
};

/**
 * 메모 텍스트를 신청자 정보와 함께 포매팅
 */
export const formatNotes = (notes: string, hasSeating: Store['hasSeating']): string => {
  const trimmed = notes.trim();
  if (!trimmed) return '';

  if (trimmed.includes('좌석 형태:') && trimmed.includes('비고:')) {
    return trimmed;
  }

  const seatingLabel = getSeatingStatusText(hasSeating);

  return `좌석 형태: ${seatingLabel} | 비고: ${trimmed}`;
};

/**
 * 좌석 상태별 편의점 개수 계산
 */
export const countStoresBySeating = (stores: Store[]) => {
  return {
    total: stores.length,
    hasSeating: stores.filter((s) => s.hasSeating === 'yes').length,
    noSeating: stores.filter((s) => s.hasSeating === 'no').length,
    unknown: stores.filter((s) => s.hasSeating === 'unknown').length,
  };
};

/**
 * 좌석 상태별 백분율 계산
 */
export const getSeatingStats = (stores: Store[]) => {
  const stats = countStoresBySeating(stores);
  const total = stats.total || 1;

  return {
    hasSeatingPercent: Math.round((stats.hasSeating / total) * 100),
    noSeatingPercent: Math.round((stats.noSeating / total) * 100),
    unknownPercent: Math.round((stats.unknown / total) * 100),
    ...stats,
  };
};

/**
 * 편의점 이름으로 브랜드 파악
 */
export const extractBrandFromName = (name: string): string => {
  const found = BRAND_NAMES.find((brand) => name.includes(brand));
  return found || 'Other';
};

/**
 * 주소에서 구/군 추출
 */
export const extractDistrict = (address: string): string => {
  const match = address.match(/서울[^구]*[구]/);
  return match ? match[0] : address.split(' ')[0];
};
