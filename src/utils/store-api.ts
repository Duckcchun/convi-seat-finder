import { projectId, publicAnonKey } from "./supabase/info";
import { Store, StoreFormData } from "../types/store";

const LOCAL_STORAGE_KEY = "convi-seat-finder:stores";
const SERVER_TIMEOUT_MS = 2500;
const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const REMOTE_ENABLED =
  import.meta.env.VITE_ENABLE_SUPABASE_REMOTE === "true" ||
  (import.meta.env.VITE_ENABLE_SUPABASE_REMOTE !== "false" && !IS_LOCALHOST);
const sampleStores: Store[] = [
  {
    id: "dtower_8",
    name: "GS25 광화문역점",
    address: "서울특별시 종로구 종로5길 19, 광화문센터빌딩 1층",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 스탠딩 거치대 중심 | 비고: 회전율 중심 구조",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5740,
    longitude: 126.9803,
  },
  {
    id: "dtower_9",
    name: "GS25 종로청진점",
    address: "서울특별시 종로구 돈화문로 34, 청진빌딩 1층",
    hasSeating: "unknown",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 확인 필요 | 비고: 좌석 기대치 낮아 방문 후순위",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5742,
    longitude: 126.9898,
  },
  {
    id: "dtower_10",
    name: "CU 종로타운점",
    address: "서울특별시 종로구 종로1길 12, 종로타운 1층",
    hasSeating: "unknown",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 확인 필요 | 비고: 테이크아웃 형태 비중 높음",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5713,
    longitude: 126.9864,
  },
  // 권역별 추가 편의점 데이터
  {
    id: "jongno_001",
    name: "CU 광화문광장점",
    address: "서울특별시 종로구 세종로 161, 광화문광장 지하1층",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 긴 바(Bar) 테이블, 고정형 스툴 의자 | 비고: 착석 가능",
    available_seats: 2,
    total_seats: 4,
    latitude: 37.5735,
    longitude: 126.9768,
  },
  {
    id: "jongno_002",
    name: "세븐일레븐 소공점",
    address: "서울특별시 종로구 소공로 103, 소공빌딩 1층",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 카페형 내부 좌석 (2~4인용 테이블 다수)",
    available_seats: 4,
    total_seats: 8,
    latitude: 37.5695,
    longitude: 126.9880,
  },
  {
    id: "jongno_003",
    name: "GS25 소공역점",
    address: "서울특별시 중구 소공로 41, 소공역 지하1층",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 및 내부 일반 테이블 | 비고: 착석 가능",
    available_seats: 3,
    total_seats: 6,
    latitude: 37.5680,
    longitude: 126.9805,
  },
  {
    id: "mapo_001",
    name: "CU 홍대상상점",
    address: "서울특별시 마포구 와우산로 122, 상상이뜨는집 1층",
    latitude: 37.5565,
    longitude: 126.9241,
    hasSeating: "yes",
    available_seats: 3,
    total_seats: 5,
  },
  {
    id: "mapo_002",
    name: "이마트24 홍대입구점",
    address: "서울특별시 마포구 홍익로 317, 홍대프라자 1층",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 북카페형 넓은 일반 좌석 | 비고: 콘센트/착석 가능",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5565,
    longitude: 126.9241,
  },
  {
    id: "mapo_003",
    name: "GS25 연대2점",
    address: "서울특별시 서대문구 이화여대길 45, 연세대 인근",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 바(Bar) 형태 테이블 및 의자, 야외 파라솔 (야장)",
    available_seats: 4,
    total_seats: 8,
    latitude: 37.5616,
    longitude: 126.9385,
  },
  {
    id: "mapo_004",
    name: "세븐일레븐 합정역점",
    address: "서울특별시 마포구/서대문구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 바(Bar) 테이블 | 비고: 의자 3~4개",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5565,
    longitude: 126.9241,
  },
  {
    id: "mapo_005",
    name: "이마트24 신촌본점",
    address: "서울특별시 마포구/서대문구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가형 1인 바 테이블 및 의자",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5565,
    longitude: 126.9241,
  },
  {
    id: "seongdong_001",
    name: "CU 성수낙낙점",
    address: "서울특별시 성동구/광진구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 카페형 일반 좌석 및 창가 바 테이블",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5399,
    longitude: 127.0690,
  },
  {
    id: "seongdong_002",
    name: "이마트24 트렌드랩 성수점",
    address: "서울특별시 성동구/광진구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: To-Go 카페존 (내부 테이블 및 의자 다수)",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5399,
    longitude: 127.0690,
  },
  {
    id: "seongdong_003",
    name: "GS25 건대스타점",
    address: "서울특별시 성동구/광진구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 내부 스탠딩 바, 야외 테라스 좌석 다수 (야장)",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5399,
    longitude: 127.0690,
  },
  {
    id: "seongdong_004",
    name: "CU 성수연무장길점",
    address: "서울특별시 성동구/광진구",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 벽면 밀착형 좁은 스탠딩 테이블 | 비고: 의자 없음",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5399,
    longitude: 127.0690,
  },
  {
    id: "seongdong_005",
    name: "세븐일레븐 성수다이캐스트점",
    address: "서울특별시 성동구/광진구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 미니 바 테이블 및 스툴 의자 2~3개",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5399,
    longitude: 127.0690,
  },
  {
    id: "gangnam_001",
    name: "GS25 강남역1호점",
    address: "서울특별시 강남구/서초구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 바(Bar) 테이블 및 스툴 의자",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    id: "gangnam_002",
    name: "이마트24 R강남센트럴점",
    address: "서울특별시 강남구/서초구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 쾌적한 카페형 테이블 및 다인용 일반 좌석",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    id: "gangnam_003",
    name: "CU 역삼센트럴점",
    address: "서울특별시 강남구/서초구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 바(Bar) 테이블 및 스툴 의자 구비",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    id: "gangnam_004",
    name: "세븐일레븐 강남코엑스점",
    address: "서울특별시 강남구/서초구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 내부 일반 좌석 및 바 테이블 혼합",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    id: "gangnam_005",
    name: "GS25 서초교대점",
    address: "서울특별시 강남구/서초구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 매장 앞 데크 야외 파라솔 테이블 다수",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.4979,
    longitude: 127.0276,
  },
  {
    id: "yeongdeungpo_001",
    name: "CU 여의도더현대점",
    address: "서울특별시 영등포/용산/기타",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 내부 카페형 일반 좌석",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5174,
    longitude: 126.9245,
  },
  {
    id: "yeongdeungpo_002",
    name: "GS25 한강반포1호점",
    address: "서울특별시 영등포/용산/기타",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 내부 창가 바 테이블, 야외 파라솔 테이블 (다수)",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5174,
    longitude: 126.9245,
  },
  {
    id: "yeongdeungpo_003",
    name: "CU 여의도한강공원점",
    address: "서울특별시 영등포/용산/기타",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 내부 스탠딩 바, 외부 파라솔 테이블 혼합",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5174,
    longitude: 126.9245,
  },
  {
    id: "yeongdeungpo_004",
    name: "이마트24 여의도IFC점",
    address: "서울특별시 영등포/용산/기타",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 좁은 스탠딩 테이블 | 비고: 의자 없음, 서서 취식",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5174,
    longitude: 126.9245,
  },
  {
    id: "yeongdeungpo_005",
    name: "세븐일레븐 용산아이파크몰점",
    address: "서울특별시 영등포/용산/기타",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 소형 스탠딩 바 테이블 | 비고: 외부 쇼핑몰 벤치 활용",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5174,
    longitude: 126.9245,
  },
  {
    id: "yeongdeungpo_006",
    name: "CU 이태원프리덤점",
    address: "서울특별시 영등포/용산/기타",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 외부 테라스형 좌석 및 스탠딩 테이블 혼합",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5174,
    longitude: 126.9245,
  },
  // 추가 권역 데이터
  {
    id: "gwanak_001",
    name: "CU 노량진점",
    address: "서울특별시 관악구/동작구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 1인용 창가 바(Bar) 테이블 및 의자 다수 | 비고: 고시촌 특화",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5104,
    longitude: 126.9700,
  },
  {
    id: "gwanak_002",
    name: "GS25 서울대입구역점",
    address: "서울특별시 관악구/동작구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 좁은 바 테이블 | 비고: 의자 2~3개",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5104,
    longitude: 126.9700,
  },
  {
    id: "gwanak_003",
    name: "세븐일레븐 샤로수길점",
    address: "서울특별시 관악구/동작구",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 스탠딩 테이블 | 비고: 의자 없음, 서서 취식",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5104,
    longitude: 126.9700,
  },
  {
    id: "gwanak_004",
    name: "이마트24 중앙대점",
    address: "서울특별시 관악구/동작구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 실내 2인용 사각 테이블 2개 | 비고: 착석 가능",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5104,
    longitude: 126.9700,
  },
  {
    id: "gwanak_005",
    name: "CU 보라매공원점",
    address: "서울특별시 관악구/동작구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 매장 앞 야외 플라스틱 파라솔 다수 | 비고: 야장",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5104,
    longitude: 126.9700,
  },
  {
    id: "songpa_001",
    name: "이마트24 석촌호수점",
    address: "서울특별시 송파구/강동구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 외부 테라스 및 파라솔 좌석 다수",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5128,
    longitude: 127.0851,
  },
  {
    id: "songpa_002",
    name: "CU 올림픽공원점",
    address: "서울특별시 송파구/강동구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 외부 대형 파라솔 및 야외 벤치 활용 | 비고: 야장",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5128,
    longitude: 127.0851,
  },
  {
    id: "songpa_003",
    name: "세븐일레븐 잠실새내점",
    address: "서울특별시 송파구/강동구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 실내 2인용 원형 테이블 1~2개",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5128,
    longitude: 127.0851,
  },
  {
    id: "songpa_004",
    name: "GS25 방이먹자골목점",
    address: "서울특별시 송파구/강동구",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 좁은 창가 스탠딩 테이블 | 비고: 의자 없음",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5128,
    longitude: 127.0851,
  },
  {
    id: "songpa_005",
    name: "CU 천호역점",
    address: "서울특별시 송파구/강동구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 바 테이블 및 고정형 스툴 의자",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5128,
    longitude: 127.0851,
  },
  {
    id: "seongbuk_001",
    name: "세븐일레븐 안암고대점",
    address: "서울특별시 성북구/동대문구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 실내 2~4인용 일반 테이블 다수 | 비고: 대학가 특화",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5885,
    longitude: 127.1069,
  },
  {
    id: "seongbuk_002",
    name: "GS25 경희대본점",
    address: "서울특별시 성북구/동대문구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 창가 바 테이블 및 실내 사각 테이블 혼합",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5885,
    longitude: 127.1069,
  },
  {
    id: "seongbuk_003",
    name: "CU 한국외대점",
    address: "서울특별시 성북구/동대문구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 1인용 바 테이블 및 의자 다수",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5885,
    longitude: 127.1069,
  },
  {
    id: "seongbuk_004",
    name: "이마트24 청량리역점",
    address: "서울특별시 성북구/동대문구",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 회전율을 위한 좁은 스탠딩 거치대 | 비고: 서서 취식",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5885,
    longitude: 127.1069,
  },
  {
    id: "seongbuk_005",
    name: "GS25 동대문DDP점",
    address: "서울특별시 성북구/동대문구",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 실내 바 테이블 및 스툴 의자 3~4개",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5885,
    longitude: 127.1069,
  },
  {
    id: "jongno_additional_001",
    name: "CU 명동본점",
    address: "서울특별시 종로/중구 (추가)",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 2층 취식 전용 공간 | 비고: 일반 테이블 및 의자 다수",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5652,
    longitude: 126.9819,
  },
  {
    id: "jongno_additional_002",
    name: "이마트24 삼청동점",
    address: "서울특별시 종로/중구 (추가)",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 한옥 인테리어형 실내 좌석 | 비고: 착석 가능",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5652,
    longitude: 126.9819,
  },
  {
    id: "jongno_additional_003",
    name: "CU 혜화역점 (대학로)",
    address: "서울특별시 종로/중구 (추가)",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 좁은 스탠딩 바 | 비고: 의자 없음",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5652,
    longitude: 126.9819,
  },
  {
    id: "jongno_additional_004",
    name: "GS25 서울역점",
    address: "서울특별시 종로/중구 (추가)",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 벽면 밀착형 좁은 스탠딩 바 | 비고: 서서 취식 위주",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5652,
    longitude: 126.9819,
  },
  {
    id: "jongno_additional_005",
    name: "세븐일레븐 남대문시장점",
    address: "서울특별시 종로/중구 (추가)",
    hasSeating: "no",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 매장 외부 좁은 스탠딩 테이블",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5652,
    longitude: 126.9245,
  },
    {
      id: "gangnam_additional_003",
      name: "세븐일레븐 압구정로데오점",
      address: "서울특별시 강남/서초 (추가)",
      hasSeating: "no",
      lastUpdated: new Date().toISOString(),
      reportedBy: "오프라인 가이드",
      notes: "좌석 형태: 스탠딩 테이블 위주 | 비고: 실내 공간 협소",
      available_seats: 0,
      total_seats: 0,
      latitude: 37.5178,
      longitude: 127.0256,
    },
  {
    id: "gangnam_additional_004",
    name: "GS25 방배카페골목점",
    address: "서울특별시 강남/서초 (추가)",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 매장 앞 나무 데크 및 파라솔 좌석",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5178,
    longitude: 127.0256,
  },
  {
    id: "gangnam_additional_005",
    name: "CU 양재시민의숲점",
    address: "서울특별시 강남/서초 (추가)",
    hasSeating: "yes",
    lastUpdated: new Date().toISOString(),
    reportedBy: "오프라인 가이드",
    notes: "좌석 형태: 야외 테라스 파라솔 좌석 다수",
    available_seats: 0,
    total_seats: 0,
    latitude: 37.5178,
    longitude: 127.0256,
  },
];

function mergeWithSampleStores(stores: Store[]): Store[] {
  const byId = new Map(stores.map((store) => [store.id, store]));

  for (const sample of sampleStores) {
    if (!byId.has(sample.id)) {
      byId.set(sample.id, sample);
    }
  }

  return Array.from(byId.values());
}

function normalizeStore(raw: Partial<Store> & Record<string, unknown>): Store {
  const normalizeNotes = (notes: unknown) => {
    if (typeof notes !== "string") return undefined;

    const cleaned = notes
      .replace(/^\s*(type|타입)\s*[abc]\s*\|\s*/i, "")
      .replace(/\s*\|\s*(type|타입)\s*[abc]\s*/gi, "")
      .trim();

    return cleaned || undefined;
  };

  const hasSeating = raw.hasSeating;
  const seating = hasSeating === "yes" || hasSeating === "no" || hasSeating === "unknown"
    ? hasSeating
    : "unknown";

  return {
    id: String(raw.id ?? `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
    name: String(raw.name ?? "이름 미상"),
    address: String(raw.address ?? "주소 미상"),
    hasSeating: seating,
    lastUpdated: String(raw.lastUpdated ?? new Date().toISOString()),
    reportedBy: typeof raw.reportedBy === "string" ? raw.reportedBy : undefined,
    latitude: typeof raw.latitude === "number" ? raw.latitude : undefined,
    longitude: typeof raw.longitude === "number" ? raw.longitude : undefined,
    notes: normalizeNotes(raw.notes),
    available_seats: typeof raw.available_seats === "number" ? raw.available_seats : 0,
    total_seats: typeof raw.total_seats === "number" ? raw.total_seats : 0,
  };
}

function writeLocalStores(stores: Store[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stores));
}

function readLocalStores(): Store[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      writeLocalStores(sampleStores);
      return sampleStores;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      writeLocalStores(sampleStores);
      return sampleStores;
    }

    const normalized = parsed.map((store) => normalizeStore(store));
    const merged = mergeWithSampleStores(normalized);
    if (merged.length !== normalized.length) {
      writeLocalStores(sortStores(merged));
    }
    return merged;
  } catch {
    writeLocalStores(sampleStores);
    return sampleStores;
  }
}

function sortStores(stores: Store[]) {
  return [...stores].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );
}

async function callServer(path: string, init?: RequestInit): Promise<Response | null> {
  if (!REMOTE_ENABLED || remoteFailedOnce) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SERVER_TIMEOUT_MS);

  try {
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3e44bc02${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    return response;
  } catch {
    remoteFailedOnce = true;
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getStores(): Promise<{ stores: Store[]; source: "server" | "local" }> {
  const response = await callServer("/stores", { method: "GET" });

  if (response?.ok) {
    const data = await response.json();
    const stores = sortStores(
      mergeWithSampleStores((Array.isArray(data) ? data : []).map((store) => normalizeStore(store))),
    );
    writeLocalStores(stores);
    return { stores, source: "server" };
  }

  return { stores: sortStores(readLocalStores()), source: "local" };
}

export async function createStore(payload: StoreFormData): Promise<Store> {
  const response = await callServer("/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (response?.ok) {
    const saved = normalizeStore(await response.json());
    const local = readLocalStores();
    const filtered = local.filter((store) => store.id !== saved.id);
    writeLocalStores(sortStores([saved, ...filtered]));
    return saved;
  }

  const local = readLocalStores();
  const duplicate = local.find(
    (store) =>
      store.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
      store.address.trim().toLowerCase() === payload.address.trim().toLowerCase(),
  );

  const nextStore = duplicate
    ? {
        ...duplicate,
        hasSeating: payload.hasSeating,
        reportedBy: payload.reporterName || duplicate.reportedBy,
        notes: payload.notes || duplicate.notes,
        latitude: payload.latitude ?? duplicate.latitude,
        longitude: payload.longitude ?? duplicate.longitude,
        lastUpdated: new Date().toISOString(),
      }
    : normalizeStore({
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name: payload.name.trim(),
        address: payload.address.trim(),
        hasSeating: payload.hasSeating,
        reportedBy: payload.reporterName || "익명",
        notes: payload.notes,
        latitude: payload.latitude,
        longitude: payload.longitude,
        lastUpdated: new Date().toISOString(),
        available_seats: payload.hasSeating === "yes" ? 1 : 0,
        total_seats: payload.hasSeating === "yes" ? 1 : 0,
      });

  const merged = duplicate
    ? local.map((store) => (store.id === duplicate.id ? normalizeStore(nextStore) : store))
    : [normalizeStore(nextStore), ...local];

  writeLocalStores(sortStores(merged));
  return normalizeStore(nextStore);
}

export async function updateStore(storeId: string, patch: Partial<Store>): Promise<Store | null> {
  const response = await callServer(`/stores/${storeId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });

  if (response?.ok) {
    const updated = normalizeStore(await response.json());
    const local = readLocalStores();
    const merged = local.map((store) => (store.id === storeId ? updated : store));
    writeLocalStores(sortStores(merged));
    return updated;
  }

  const local = readLocalStores();
  const existing = local.find((store) => store.id === storeId);
  if (!existing) return null;

  const updated = normalizeStore({
    ...existing,
    ...patch,
    id: storeId,
    lastUpdated: new Date().toISOString(),
  });

  const merged = local.map((store) => (store.id === storeId ? updated : store));
  writeLocalStores(sortStores(merged));
  return updated;
}

export async function deleteStore(storeId: string): Promise<boolean> {
  const response = await callServer(`/stores/${storeId}`, {
    method: "DELETE",
  });

  if (response?.ok) {
    const local = readLocalStores();
    writeLocalStores(local.filter((store) => store.id !== storeId));
    return true;
  }

  const local = readLocalStores();
  const exists = local.some((store) => store.id === storeId);
  if (!exists) return false;

  writeLocalStores(local.filter((store) => store.id !== storeId));
  return true;
}
