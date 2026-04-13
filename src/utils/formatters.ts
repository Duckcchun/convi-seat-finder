import { Store } from '../types/store';

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
 * 좌석 상태별 배지 스타일 정보
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
  const brands = ['CU', 'GS25', '세븐일레븐', '이마트24', '미니스톱', '씨스페이스'];
  const found = brands.find((brand) => name.includes(brand));
  return found || 'Other';
};

/**
 * 주소에서 구/군 추출
 */
export const extractDistrict = (address: string): string => {
  const match = address.match(/서울[^구]*[구]/);
  return match ? match[0] : address.split(' ')[0];
};
