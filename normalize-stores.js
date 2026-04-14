import { readFile, writeFile } from "node:fs/promises";

async function normalizeStores() {
  // 오프라인 데이터 로드
  const content = await readFile("src/data/offline-stores.json", "utf8");
  const stores = JSON.parse(content);

  // 브랜드 정보
  const brands = [
    { pattern: /세븐일레븐/i, name: "세븐일레븐" },
    { pattern: /GS25|GS\s*25/i, name: "GS25" },
    { pattern: /\bCU\b|씨유/i, name: "CU" },
    { pattern: /이마트24/i, name: "이마트24" },
    { pattern: /미니스톱/i, name: "미니스톱" },
    { pattern: /씨스페이스/i, name: "씨스페이스" },
  ];

  // 이름 정규화
  const normalized = stores.map((store) => {
    let name = String(store.name || "").trim();

    // 법인 표시 제거: (주), (유), (사), (재), ㈜ 등
    name = name.replace(/^\(.*?\)\s*/g, "").trim(); // (어떤것) 제거
    name = name.replace(/^㈜\s*/g, "").trim(); // ㈜ 제거
    name = name.replace(/^\w+\s*/g, (match) => {
      // 처음 단어가 법인명 같으면 제거 (한글자나 한국식 이름)
      const firstWord = match.trim();
      if (firstWord.length <= 5 && !brands.some((b) => b.pattern.test(firstWord))) {
        return "";
      }
      return match;
    });

    // 주소 정제: 괄호 안 부가정보는 유지하되 길이 제한
    let address = String(store.address || "").trim();
    // 너무 길면 첫 번째 괄호까지만 유지
    const parenIndex = address.indexOf("(");
    if (parenIndex > 50 && parenIndex !== -1) {
      const closeParenIndex = address.indexOf(")", parenIndex);
      if (closeParenIndex !== -1) {
        address = address.substring(0, closeParenIndex + 1);
      }
    }

    // 브랜드명 찾기
    let brandName = null;
    let locationName = null;

    for (const { pattern, name: brand } of brands) {
      const match = name.match(pattern);
      if (match) {
        brandName = brand;
        
        // 브랜드를 기준으로 앞/뒤 텍스트 추출
        const idx = match.index;
        const before = name.substring(0, idx).trim();
        const after = name.substring(idx + match[0].length).trim();
        
        // 점/호 제거, 괄호 제거
        locationName = (after || before)
          .replace(/[()（）]/g, "") // 모든 괄호 제거
          .replace(/\s+/g, " ")
          .trim();
        
        // "점", "호", "점" 로 끝나는 숫자+한글 형식 추출
        const locationMatch = locationName.match(
          /([가-힣\w]+?\d*[가-힣]*?(?:점|호|터미널|선착장|센터|스테이션|휴게소))/
        );
        if (locationMatch) {
          locationName = locationMatch[1];
        } else if (locationName.length > 30) {
          // 너무 길면 짧게 자르기
          locationName = locationName.substring(0, 30);
        }
        
        break;
      }
    }

    // 최종 이름 조합
    if (brandName && locationName && locationName.length > 0) {
      // 중복 제거: "CU CU xxx" -> "CU xxx"
      locationName = locationName.replace(/^(CU|GS25|세븐일레븐)\s+/i, "").trim();
      name = `${brandName} ${locationName}`;
    } else if (brandName) {
      name = brandName;
    }

    return {
      ...store,
      name,
      address,
    };
  });

  // 브랜드별로 정렬
  normalized.sort((a, b) => {
    if (a.name !== b.name) {
      return a.name.localeCompare(b.name, "ko");
    }
    return a.address.localeCompare(b.address, "ko");
  });

  // 유효한 브랜드만 필터링 (CU, GS25, 세븐일레븐)
  const validBrands = ["CU", "GS25", "세븐일레븐"];
  const now = new Date().toISOString();
  
  const filtered = normalized
    .filter((store) => {
      const brandName = store.name.split(" ")[0];
      
      // 1. 유효한 브랜드 확인
      if (!validBrands.includes(brandName)) {
        return false;
      }
      
      // 2. 지점명이 있는지 확인 (브랜드명 + 지점명 형식)
      const parts = store.name.split(" ");
      if (parts.length < 2) {
        // 브랜드명만 있고 지점명이 없으면 제외
        return false;
      }
      
      // 3. 지점명이 숫자로 시작하면 제외 (예: "3차점", "1호", "2호", "43호")
      const locationName = parts.slice(1).join(" ");
      if (/^\d/.test(locationName)) {
        return false;
      }
      
      // 4. 서울 지역만 (주소에 "서울특별시" 포함)
      if (!store.address || !store.address.includes("서울특별시")) {
        return false;
      }
      
      return true;
    })
    .map((store) => ({
      ...store,
      lastUpdated: store.lastUpdated || now,
      reportedBy: "공공데이터 API",
      notes: "좌석 형태/비고 정보가 없습니다",
      hasSeating: "unknown",
      available_seats: 0,
      total_seats: 0,
    }));

  console.log(`\n정렬 및 필터링:`);
  console.log(`  전체: ${normalized.length}개`);
  console.log(`  유효 (CU/GS25/세븐일레븐): ${filtered.length}개`);
  console.log(`  제거됨: ${normalized.length - filtered.length}개`);

  // 저장
  await writeFile(
    "src/data/offline-stores.json",
    JSON.stringify(filtered, null, 2),
    "utf8"
  );

  console.log(`\n✅ ${filtered.length}개 편의점 이름 정규화 완료`);

  // 브랜드별 통계
  const brandCounts = {};
  for (const store of normalized) {
    brandCounts[store.name] = (brandCounts[store.name] || 0) + 1;
  }

  console.log("\n📊 브랜드별 통계:");
  Object.entries(brandCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([brand, count]) => {
      console.log(`  ${brand}: ${count}개`);
    });
}

normalizeStores().catch((error) => {
  console.error("❌ 정규화 실패:", error.message);
  process.exitCode = 1;
});
