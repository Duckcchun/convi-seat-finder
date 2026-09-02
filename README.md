
# 🏪 편의점 좌석 찾기 (Convi Seat Finder)
> 편의점 좌석 유무와 좌석 형태(바 테이블·일반 테이블·야외 파라솔)를 확인하고 다른 사용자를 위해 제보할 수 있는 웹 애플리케이션

**[🔗 Demo 바로가기](https://duckcchun.github.io/convi-seat-finder/)**

---
<br>

## 🔍 한줄 소개
편의점 방문 전에 미리 좌석 유무를 확인하여 불필요한 이동을 줄이고, 사용자들이 직접 최신 정보를 공유하는 커뮤니티 기반 서비스입니다.

---
<br>

## 🧰 기술 스택
- **Language:** TypeScript 5.x
- **Framework:** React 18.3.1 + Vite 6.x
- **Styling:** Tailwind CSS + Radix UI (shadcn/ui)
- **UI Components:** Radix UI v1.x, Lucide Icons
- **Forms:** React Hook Form 7.x (커스텀 검증 유틸)
- **Database / Realtime:** Supabase (PostgREST API + Realtime, 원격 설정 시)
- **Maps:** Kakao Maps API
- **Notifications:** Sonner (Toast)
- **Testing:** Vitest + @testing-library/react (jsdom)
- **Deployment:** GitHub Pages
- **Build Tool:** Vite 6.3.5 with SWC

---
<br>

## ✨ 주요 기능
- **좌석 형태 분류:** 좌석 유무를 넘어 좌석 형태(바 테이블·일반 테이블·야외 파라솔·스탠딩)까지 구조화해 제공합니다. 일반 지도 앱이 정형화해서 주지 않는 정보로, 본 서비스의 핵심 차별점입니다.
- **좌석 형태 필터:** 원하는 좌석 형태를 선택하면 지도와 목록이 해당 조건을 만족하는 매장만 보여줍니다.
- **간편 제보:** 지도/검색으로 편의점을 고르고 좌석 유무·형태를 선택해 빠르게 제보합니다. 좌석이 있을 때만 형태 선택이 노출되어 입력 부담을 줄였습니다.
- **데이터 동기화:** Supabase(PostgREST + Realtime)를 통한 다중 사용자 동기화를 지원하며, 원격 설정이 없으면 로컬 저장소 기반으로 동작합니다.
- **반응형 UI:** Radix UI 기반 컴포넌트로 데스크톱과 모바일 환경 모두에서 최적의 사용성을 제공합니다.

---
<br>

## 🚀 설치 및 실행 (로컬)

```bash
# 1. 저장소 클론
git clone https://github.com/Duckcchun/convi-seat-finder.git

# 2. 폴더 이동
cd convi-seat-finder

# 3. 의존성 설치
npm install

# 4. 환경변수 설정
# .env 파일 생성
touch .env

# 5. 개발 서버 실행
npm run dev

# 6. 프로덕션 빌드
npm run build

# 7. 빌드 결과 로컬 프리뷰
npm run preview
```

**필수 환경변수 (.env):**

```env
# Supabase 설정
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"

# Kakao Maps API (선택사항 - 없으면 내장 키 사용)
VITE_KAKAO_MAP_API_KEY="your-kakao-key"

# Supabase 원격 기능 활성화 (선택사항)
VITE_ENABLE_SUPABASE_REMOTE="false"
```

-----

<br>

## 📂 폴더 구조

```
/
├─ src/
│  ├─ components/          # UI 컴포넌트
│  │   ├─ ui/              # Radix UI 기반 기본 컴포넌트 (shadcn/ui)
│  │   ├─ figma/           # Figma export 컴포넌트
│  │   ├─ AdminDashboard.tsx
│  │   ├─ ConvenienceStoreList.tsx
│  │   ├─ MapView.tsx      # 카카오 지도 통합
│  │   ├─ ReportForm.tsx   # 좌석 정보 제보 폼
│  │   ├─ StoreCard.tsx
│  │   ├─ StoreItem.tsx
│  │   └─ SearchBar.tsx
│  ├─ guidelines/          # 가이드문서
│  ├─ styles/              # 글로벌 CSS (Tailwind)
│  ├─ supabase/            # Supabase 설정 및 함수
│  │   └─ functions/       # Edge Functions
│  ├─ types/               # TypeScript 타입 정의
│  │   └─ store.ts
│  ├─ utils/               # 유틸 함수 및 API
│  │   ├─ store-api.ts     # 로컬스토리지 + Supabase 통합
│  │   └─ supabase/
│  ├─ App.tsx              # 메인 애플리케이션 컴포넌트
│  ├─ main.tsx             # 애플리케이션 진입점
│  └─ index.css
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ tailwind.config.js
├─ postcss.config.js
└─ README.md
```

-----

<br>

## 🤝 데이터 정책 (Crowdsourcing)

### 초기 데이터 구성
본 서비스는 **60개 편의점의 오프라인 조사 데이터**를 기반으로 시작합니다.
- **권역별 데이터:** 종로(3개), 마포(5개), 성동(5개), 강남(5개), 영등포(6개), 관악(5개), 송파(5개), 성북(5개), 종로추가(5개), 강남추가(5개)
- **데이터 항목:** 매장 이름, 주소, 좌석 유무, 좌석 형태(바 테이블/일반 테이블/야외 파라솔), 최종 업데이트 날짜

### 데이터 업데이트 플로우
1. **사용자 제보:** 서비스에서 "제보하기" 버튼으로 새로운 정보 추가 또는 기존 정보 수정
2. **정보 검증:** 제보된 데이터의 신뢰도 평가 (중복 제보, 최근성 우위)
3. **데이터 병합:** 검증된 제보는 자동으로 서비스의 데이터베이스에 반영
4. **투명성:** 모든 제보자의 이름과 업데이트 시간이 기록되어 데이터 추적성 보장

### 제보 가이드라인
- **좌석 형태 분류:**
  - `일반 테이블`: 2인 이상의 의자가 있는 식탁
  - `바 테이블`: 창가 또는 벽면의 좁은 카운터형 테이블
  - `파라솔`: 외부 테라스의 파라솔 또는 야외 좌석
  - `스탠딩`: 의자가 없거나 서서 할 수 있는 공간만 존재
- **정보 정확성:** 최근 2주 이내 직접 방문 경험을 바탕으로 제보
- **존중:** 다른 제보자의 정보를 존중하고 객관적인 사실만 기록

### 데이터 활용 및 오픈소스 정신
- 모든 제보 데이터는 **CC0 1.0 Universal (Public Domain)** 라이선스 하에 공개
- 제보자는 자신의 데이터가 다른 서비스에서 활용될 수 있음에 동의
- 정기적으로 커뮤니티와 함께 데이터 정제 및 품질 개선

-----

<br>

## 📈 앞으로의 계획 (Roadmap)

- [x] **지도 기반 서비스:** Kakao Maps API를 활용한 위치 기반 편의점 표시
- [x] **좌석 형태 분류/필터:** 좌석 형태(바·테이블·파라솔·스탠딩) 제보 및 필터링
- [x] **데이터 동기화:** Supabase Realtime 기반 다중 사용자 동기화 (원격 설정 시)
- [x] **반응형 UI:** 모바일/태블릿/데스크톱 모두 최적화된 UI
- [x] **전역 상태 관리:** React Context API로 Props drilling 제거
- [x] **폼 검증:** react-hook-form 기반 실시간 입력 검증 및 에러 처리
- [x] **에러 경계 처리:** Error Boundary 컴포넌트로 렌더링 에러 캐치
- [x] **테스트 코드:** Vitest 유닛 테스트 (formatters, validation, components)
- [ ] **사용자 인증:** GitHub/Google 소셜 로그인 도입으로 제보자 신뢰도 향상
- [ ] **E2E 테스트:** Playwright로 주요 워크플로우 테스트
- [ ] **PWA 지원:** 오프라인 모드 및 홈 화면 설치 기능
- [ ] **데이터 마이그레이션:** Supabase 클라우드 DB로 완전 전환

-----

<br>

## 🛠️ 개발 가이드

### 프로젝트 설정
- **Node.js:** v18 이상 권장
- **Package Manager:** npm 또는 yarn
- **TypeScript:** Strict mode 지원

### 주요 명령어
```bash
# 개발 서버 시작 (핫 리로드 지원)
npm run dev

# 타입 체크
tsc --noEmit

# 프로덕션 빌드
npm run build

# 빌드된 결과 미리보기
npm run preview

# 단위 테스트 실행
npm test

# 테스트 UI 모드 (브라우저에서 테스트 보기)
npm run test:ui

# 테스트 커버리지 보고서
npm run test:coverage
```

### 코드 구조
- **컴포넌트:** React Functional Components + Hooks
- **상태 관리:** React Context + useState (간단한 크기의 앱)
- **API 통합:** fetch + Supabase SDK
- **로컬 저장소:** localStorage (MVP 단계)

---

<br>

## 📸 주요 기능 미리보기

### 지도 기반 편의점 검색
- 위치 기반 주변 편의점 표시 (Kakao Maps)
- 좌석 형태 필터로 원하는 조건의 매장만 보기
- 편의점 선택으로 빠른 정보 제보

### 편의점 좌석 정보 조회
- 좌석 유무 및 좌석 형태 뱃지 확인
- 최근 업데이트 시각과 제보자 표시

### 제보 플로우
1. 지도 또는 검색으로 편의점 선택
2. 좌석 유무 선택 (있음/없음/미확인)
3. 좌석이 있으면 좌석 형태 선택 (바 테이블·일반 테이블·야외 파라솔·스탠딩, 복수 선택 가능)
4. 제보 완료 후 목록/지도에 반영

-----

<br>

## 📬 Contact

  - **GitHub:** [@Duckcchun](https://github.com/Duckcchun)
  - **Email:** qasw1733@naver.com

---

<br>

## 📄 라이선스

- **프로젝트 코드:** MIT License
- **제보 데이터:** CC0 1.0 Universal (Public Domain) - 모든 사용자가 자유롭게 활용 가능
