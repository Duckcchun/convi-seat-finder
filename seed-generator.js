import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_BRANDS = ["CU", "GS25", "세븐일레븐", "이마트24"];

function parseDotenv(content) {
  const env = {};
  const lines = content.split(/\r?\n/);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadDotenv() {
  const envPath = path.join(__dirname, ".env");

  try {
    const raw = await readFile(envPath, "utf8");
    const parsed = parseDotenv(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (process.env[k] == null) {
        process.env[k] = v;
      }
    }
  } catch {
    return;
  }
}

function getConfig() {
  const serviceKey =
    process.env.PUBLIC_DATA_KEY ||
    process.env.VITE_PUBLIC_DATA_KEY ||
    process.env.DATA_GO_KR_SERVICE_KEY ||
    "";

  const kakaoRestKey =
    process.env.KAKAO_REST_KEY ||
    process.env.VITE_KAKAO_REST_KEY ||
    "";

  const numOfRows = Number(process.env.SEED_NUM_OF_ROWS || "100");
  const pageNo = Number(process.env.SEED_PAGE_NO || "1");
  const regions = (process.env.SEED_TARGET_REGIONS || process.env.SEED_TARGET_REGION || "강남구,강동구,강북구,강서구,관악구,광진구,구로구,금천구,노원구,도봉구,동대문구,동작구,마포구,서대문구,서초구,성동구,성북구,송파구,양천구,영등포구,용산구,은평구,종로구,중구,중랑구")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const delayMs = Number(process.env.SEED_DELAY_MS || "100");
  const geoConcurrency = Number(process.env.SEED_GEO_CONCURRENCY || "5");

  const brandsStr = process.env.SEED_BRANDS;
  const brands = (brandsStr === undefined || brandsStr === null || brandsStr === "")
    ? []
    : brandsStr.split(",").map((v) => v.trim()).filter(Boolean);
  const finalBrands = brands.length > 0 ? brands : DEFAULT_BRANDS;

  return {
    serviceKey,
    kakaoRestKey,
    numOfRows,
    pageNo,
    regions,
    delayMs,
    geoConcurrency,
    brands: finalBrands,
    useAllBrands: brandsStr === "", // 명시적으로 empty string 뜻일 때만 true
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJsonWithTextFallback(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
  
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${raw.slice(0, 300)}`);
    }

    try {
      return JSON.parse(raw);
    } catch {
      throw new Error(`JSON parse failed: ${raw.slice(0, 300)}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function getCoordinates(address, kakaoRestKey) {
  const endpoint = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;

  try {
    const data = await fetchJsonWithTextFallback(endpoint, {
      headers: {
        Authorization: `KakaoAK ${kakaoRestKey}`,
      },
    });

    const doc = data?.documents?.[0];
    if (!doc) return null;

    const lat = Number(doc.y);
    const lng = Number(doc.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

function normalizeItems(rawItems) {
  if (Array.isArray(rawItems)) return rawItems;
  if (rawItems && typeof rawItems === "object") return [rawItems];
  return [];
}

function makeStableId(name, address) {
  const hash = createHash("sha1")
    .update(`${name}::${address}`)
    .digest("hex")
    .slice(0, 14);
  return `seed_${hash}`;
}

function toStoreRecord(row, coords) {
  const name = String(row.BPLC_NM || "").trim();
  const address = String(row.ROAD_NM_ADDR || "").trim();
  const now = new Date().toISOString();

  return {
    id: makeStableId(name, address),
    name,
    address,
    hasSeating: "unknown",
    latitude: coords.lat,
    longitude: coords.lng,
  };
}

async function fetchStoresByBrand({ serviceKey, numOfRows, brand, targetRegion }) {
  const allItems = [];
  const maxPages = 5; // 최대 5 페이지까지 요청
  const maxRetries = 2;
  
  for (let pageNo = 1; pageNo <= maxPages; pageNo++) {
    let retries = 0;
    let success = false;
    let items = [];

    while (retries < maxRetries && !success) {
      try {
        const url = new URL("https://apis.data.go.kr/1741000/tobacco_retailers/info");
        url.searchParams.append("serviceKey", serviceKey);
        url.searchParams.append("pageNo", String(pageNo));
        url.searchParams.append("numOfRows", String(numOfRows));
        url.searchParams.append("returnType", "JSON");
        url.searchParams.append("cond[SALS_STTS_CD::EQ]", "01");
        url.searchParams.append("cond[BPLC_NM::LIKE]", brand);
        url.searchParams.append("cond[ROAD_NM_ADDR::LIKE]", targetRegion);

        const data = await fetchJsonWithTextFallback(url.toString());
        items = normalizeItems(data?.response?.body?.items?.item);
        success = true;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.warn(`    Failed to fetch ${targetRegion} ${brand || '(all)'} after ${maxRetries} attempts`);
          return allItems; // 재시도 실패 시 지금까지 수집한 데이터 반환
        }
        console.warn(`    Retry ${retries}/${maxRetries} for ${targetRegion} ${brand || '(all)'}...`);
        await sleep(1000); // 재시도 전 1초 대기
      }
    }
    
    if (items.length === 0) break; // 더 이상 항목이 없으면 중단
    allItems.push(...items);
  }
  
  return allItems;
}

function uniqueByNameAddress(rows) {
  const map = new Map();

  for (const row of rows) {
    const name = String(row.BPLC_NM || "").trim();
    const address = String(row.ROAD_NM_ADDR || "").trim();
    if (!name || !address) continue;
    const key = `${name.toLowerCase()}::${address.toLowerCase()}`;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

async function buildSeedData(config) {
  const collected = [];
  
  // useAllBrands가 true면 brand 필터 없이 지역별로만 요청
  if (config.useAllBrands) {
    console.log("Fetching convenience stores without brand filter...");
    for (const region of config.regions) {
      const rows = await fetchStoresByBrand({
        serviceKey: config.serviceKey,
        numOfRows: config.numOfRows,
        brand: "", // 빈값 (모든 편의점)
        targetRegion: region,
      });
      console.log(`  ${region}: ${rows.length}개 수집`);
      collected.push(...rows);
    }
  } else {
    // 기존 로직: 브랜드별로 요청
    console.log(`Fetching convenience stores by brand (${config.brands.join(", ")})...`);
    const perBrand = Math.max(1, Math.floor(config.numOfRows / config.brands.length));
    for (const brand of config.brands) {
      for (const region of config.regions) {
        const rows = await fetchStoresByBrand({
          serviceKey: config.serviceKey,
          numOfRows: perBrand,
          brand,
          targetRegion: region,
        });
        console.log(`    ${region} > ${brand}: ${rows.length}개 수집`);
        collected.push(...rows);
      }
    }
  }

  const uniqueRows = uniqueByNameAddress(collected);
  const stores = [];
  const failedGeocode = [];

  console.log(`\nGeocoding ${uniqueRows.length} addresses (concurrency: ${config.geoConcurrency})...`);
  
  // 배치로 나누어 병렬 처리 (동시성 제어)
  const batchSize = config.geoConcurrency;
  for (let i = 0; i < uniqueRows.length; i += batchSize) {
    const batch = uniqueRows.slice(i, i + batchSize);
    const promises = batch.map(async (row) => {
      const address = String(row.ROAD_NM_ADDR || "").trim();
      if (!address) return null;

      const coords = await getCoordinates(address, config.kakaoRestKey);
      await sleep(config.delayMs);

      if (!coords) {
        return {
          failed: true,
          name: String(row.BPLC_NM || "").trim(),
          address,
        };
      }

      return {
        failed: false,
        store: toStoreRecord(row, coords),
      };
    });

    const results = await Promise.all(promises);
    for (const result of results) {
      if (result) {
        if (result.failed) {
          failedGeocode.push({ name: result.name, address: result.address });
        } else {
          stores.push(result.store);
        }
      }
    }

    const processed = Math.min(i + batchSize, uniqueRows.length);
    console.log(`  ${processed}/${uniqueRows.length}`);
  }

  stores.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return {
    stores,
    failedGeocode,
    sourceCount: collected.length,
    uniqueCount: uniqueRows.length,
  };
}

function toKvRecords(stores) {
  return stores.map((store) => ({
    key: `store:${store.id}`,
    value: store,
  }));
}

async function writeOutputs(stores, failedGeocode) {
  const outDir = path.join(__dirname, "seed-output");
  await mkdir(outDir, { recursive: true });

  const storesPath = path.join(outDir, "stores.seed.json");
  const kvPath = path.join(outDir, "stores.kv.seed.json");
  const failuresPath = path.join(outDir, "geocode-failures.json");

  await writeFile(storesPath, JSON.stringify(stores, null, 2), "utf8");
  await writeFile(kvPath, JSON.stringify(toKvRecords(stores), null, 2), "utf8");
  await writeFile(failuresPath, JSON.stringify(failedGeocode, null, 2), "utf8");

  return { outDir, storesPath, kvPath, failuresPath };
}

function validateConfig(config) {
  const missing = [];

  if (!config.serviceKey) missing.push("PUBLIC_DATA_KEY or VITE_PUBLIC_DATA_KEY or DATA_GO_KR_SERVICE_KEY");
  if (!config.kakaoRestKey) missing.push("KAKAO_REST_KEY or VITE_KAKAO_REST_KEY");

  if (missing.length > 0) {
    const msg = `Missing env keys: ${missing.join(", ")}`;
    throw new Error(msg);
  }
}

async function main() {
  await loadDotenv();
  const config = getConfig();
  validateConfig(config);

  console.log("Starting seed generation...");
  console.log(`Regions: ${config.regions.join(", ")}`);
  console.log(`Brands: ${config.brands.join(", ")}`);
  console.log();

  try {
    const result = await buildSeedData(config);
    const written = await writeOutputs(result.stores, result.failedGeocode);

    console.log("\n✅ Seed generation completed");
    console.log(`source rows: ${result.sourceCount}`);
    console.log(`unique rows: ${result.uniqueCount}`);
    console.log(`seed rows: ${result.stores.length}`);
    console.log(`geocode failures: ${result.failedGeocode.length}`);
    console.log(`stores file: ${written.storesPath}`);
    console.log(`kv file: ${written.kvPath}`);
    console.log(`failures file: ${written.failuresPath}`);
  } catch (error) {
    console.error("❌ Seed generation failed");
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Seed generation failed");
  console.error(error.message || error);
  process.exitCode = 1;
});
