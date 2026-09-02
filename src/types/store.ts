/**
 * 좌석 형태 분류.
 * 지도 앱(네이버/카카오)이 정형화해서 제공하지 않는 정보로, 본 서비스의 핵심 차별점이다.
 * - bar: 창가/벽면 카운터형 바 테이블
 * - table: 2인 이상 앉을 수 있는 일반 테이블
 * - parasol: 외부 테라스의 파라솔/야외 좌석
 * - standing: 의자 없이 서서 이용하는 공간
 */
export type SeatType = "bar" | "table" | "parasol" | "standing";

export const SEAT_TYPE_VALUES: SeatType[] = ["bar", "table", "parasol", "standing"];

/**
 * 편의점 브랜드 필터 옵션. 여러 컴포넌트에서 공유한다.
 * 'all'은 전체를 의미하는 특수값.
 */
export const BRAND_OPTIONS = [
  "all",
  "CU",
  "GS25",
  "세븐일레븐",
  "이마트24",
  "미니스톱",
  "씨스페이스",
] as const;

export interface Store {
  id: string;
  name: string;
  address: string;
  hasSeating: "yes" | "no" | "unknown";
  seatTypes: SeatType[];
  lastUpdated: string;
  reportedBy?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  available_seats: number;
  total_seats: number;
}

export interface StoreFormData {
  name: string;
  address: string;
  hasSeating: "yes" | "no" | "unknown";
  seatTypes: SeatType[];
  reporterName: string;
  notes: string;
  latitude?: number;
  longitude?: number;
}

export interface ConvenienceStoreSearchResult {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name?: string;
  x: string; // longitude
  y: string; // latitude
  phone?: string;
}

export interface StoreSelectInfo {
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}