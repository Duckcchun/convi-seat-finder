
# 🏪 편의점 좌석 찾기 (Convi Seat Finder)
> 편의점 좌석의 실시간 상태를 확인하고 다른 사용자를 위해 제보할 수 있는 웹 애플리케이션

**[🔗 Demo 바로가기](https://duckcchun.github.io/convi-seat-finder/)**

---
<br>

## 🔍 한줄 소개
편의점 방문 전에 미리 좌석 유무를 확인하여 불필요한 이동을 줄이고, 사용자들이 직접 최신 정보를 공유하는 커뮤니티 기반 서비스입니다.

---
<br>

## 🧰 기술 스택
- **Language:** TypeScript
- **Framework:** React, Vite
- **Styling:** Tailwind CSS, Radix UI
- **Database / Realtime:** Supabase
- **Deployment:** GitHub Pages

---
<br>

## ✨ 주요 기능
- **실시간 좌석 상태 조회:** Supabase의 Realtime 기능을 활용해 여러 사용자가 동시에 보아도 좌석 정보가 실시간으로 동기화됩니다.
- **사용자 제보 기능:** 사용자가 직접 좌석 상태(있음/없음)를 변경하여 최신 정보로 업데이트할 수 있습니다.
- **반응형 UI:** Radix UI를 기반으로 한 컴포넌트를 사용하여 데스크톱과 모바일 환경 모두에서 최적의 사용성을 제공합니다.

---
<br>

## 🚀 설치 및 실행 (로컬)

```bash
# 1. 저장소 클론
git clone [https://github.com/Duckcchun/convi-seat-finder.git](https://github.com/Duckcchun/convi-seat-finder.git)

# 2. 폴더 이동
cd convi-seat-finder

# 3. 의존성 설치
npm install

# 4. 개발 서버 실행
npm run dev
````

**환경변수 설정:**
프로젝트 루트에 `.env` 파일을 생성하고, Supabase에서 발급받은 **Project URL**과 **Anon Key**를 아래와 같이 추가해야 합니다.

```
VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
```

-----

<br>

## 📂 폴더 구조

```
/
├─ public/
├─ src/
│  ├─ components/  # 재사용 가능한 UI 컴포넌트
│  │   └─ ui/      # Radix UI 기반 기본 컴포넌트
│  ├─ hooks/       # 커스텀 훅
│  ├─ services/    # Supabase API 연동 로직
│  ├─ types/       # TypeScript 타입 정의
│  ├─ App.tsx      # 메인 애플리케이션 컴포넌트
│  └─ main.tsx     # 애플리케이션 진입점
├─ .gitignore
├─ package.json
└─ vite.config.ts
```

-----

<br>

## 📈 앞으로의 계획 (Roadmap)

  - [ ] **위치 기반 서비스:** 사용자 주변의 편의점을 지도에 표시하고 가까운 순으로 정렬하는 기능 추가
  - [ ] **사용자 인증:** GitHub 또는 소셜 로그인을 도입하여 제보자 신뢰도 향상
  - [ ] **테스트 코드 작성:** Vitest를 사용한 유닛 테스트 및 통합 테스트 코드 추가

-----

<br>

## 📸 스크린샷

*(프로젝트 스크린샷 추가 에정)*

-----

<br>

## 📬 Contact

  - **GitHub:** [@Duckcchun](https://github.com/Duckcchun)
  - **Email:** (qasw1733@naver.com)
