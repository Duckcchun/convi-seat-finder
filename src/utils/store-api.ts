// REMOTE_ENABLED 상태 및 환경변수, 호스트명 로그 (앱 실행 시 자동 출력)
import { projectId, publicAnonKey } from "./supabase/info";
import { Store, StoreFormData, SeatType, SEAT_TYPE_VALUES, StoreSelectInfo } from "../types/store";
import offlineSeedStores from "../data/offline-stores.json";

/**
 * 임의의 입력값을 유효한 SeatType 배열로 정규화한다.
 * - 배열이면 각 요소를 검증, 문자열이면 콤마/파이프로 분리해 파싱한다.
 * - 하위 호환: 과거 notes 에 섞여 있던 "type a/b/c" 표기도 형태로 매핑한다.
 */
function normalizeSeatTypes(raw: unknown, notes?: unknown): SeatType[] {
  const collected = new Set<SeatType>();

  const pushIfValid = (value: string) => {
    const v = value.trim().toLowerCase();
    if ((SEAT_TYPE_VALUES as string[]).includes(v)) {
      collected.add(v as SeatType);
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach((item) => typeof item === "string" && pushIfValid(item));
  } else if (typeof raw === "string" && raw.trim()) {
    raw.split(/[|,]/).forEach(pushIfValid);
  }

  // 하위 호환: 예전 "type a" = bar, "type b" = table, "type c" = parasol 흔적 복원
  if (collected.size === 0 && typeof notes === "string") {
    const legacy = notes.toLowerCase();
    if (/\b(type|타입)\s*a\b/.test(legacy)) collected.add("bar");
    if (/\b(type|타입)\s*b\b/.test(legacy)) collected.add("table");
    if (/\b(type|타입)\s*c\b/.test(legacy)) collected.add("parasol");
  }

  return Array.from(collected);
}

const LOCAL_STORAGE_KEY = "convi-seat-finder:stores";
const SERVER_TIMEOUT_MS = 2500;
const IS_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const HAS_REMOTE_CONFIG =
  Boolean(import.meta.env.VITE_SUPABASE_PROJECT_ID || import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const REMOTE_ENABLED =
  import.meta.env.VITE_ENABLE_SUPABASE_REMOTE === "true" ||
  (import.meta.env.VITE_ENABLE_SUPABASE_REMOTE !== "false" && !IS_LOCALHOST && HAS_REMOTE_CONFIG);
let remoteFailedOnce = false;
// 시드 JSON 에는 seatTypes 필드가 없으므로 normalizeStore 로 보정해 Store[] 형태로 맞춘다.
const sampleStores: Store[] = (offlineSeedStores as Array<Partial<Store> & Record<string, unknown>>).map(
  (store) => normalizeStore(store),
);
const OFFLINE_REPORTERS = new Set(["오프라인 가이드", "공공데이터 API"]);

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
    
    const trimmed = notes.trim();
    if (!trimmed) return undefined;

    const cleaned = trimmed
      .replace(/^\s*(type|타입)\s*[abc]\s*\|\s*/i, "")
      .replace(/\s*\|\s*(type|타입)\s*[abc]\s*/gi, "")
      .trim();

    return cleaned || undefined;
  };

  // snake_case와 camelCase 둘 다 지원
  const hasSeating = raw.hasSeating || raw.has_seating;
  const seating = hasSeating === "yes" || hasSeating === "no" || hasSeating === "unknown"
    ? hasSeating
    : "unknown";

  const lastUpdated = raw.lastUpdated || raw.last_updated;
  const reportedBy = raw.reportedBy || raw.reported_by;
  const notes = raw.notes;  // notes는 snake/camel 모두 동일 필드명
  const rawSeatTypes = (raw as Record<string, unknown>).seatTypes ?? (raw as Record<string, unknown>).seat_types;

  // 좌석 없음/모름인데 형태가 들어온 경우는 무시한다(데이터 정합성).
  const seatTypes = seating === "yes" ? normalizeSeatTypes(rawSeatTypes, notes) : [];

  return {
    id: String(raw.id ?? `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
    name: String(raw.name ?? "이름 미상"),
    address: String(raw.address ?? "주소 미상"),
    hasSeating: seating,
    seatTypes,
    lastUpdated: String(lastUpdated ?? new Date().toISOString()),
    reportedBy: typeof reportedBy === "string" ? reportedBy : undefined,
    latitude: typeof raw.latitude === "number" ? raw.latitude : undefined,
    longitude: typeof raw.longitude === "number" ? raw.longitude : undefined,
    notes: normalizeNotes(notes),
    available_seats: typeof raw.available_seats === "number" ? raw.available_seats : 0,
    total_seats: typeof raw.total_seats === "number" ? raw.total_seats : 0,
  };
}

function writeLocalStores(stores: Store[]) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stores));
}

function readLocalStores(options?: { seedWithSample?: boolean }): Store[] {
  const seedWithSample = options?.seedWithSample ?? true;

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      if (seedWithSample) {
        writeLocalStores(sampleStores);
        return sampleStores;
      }
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      if (seedWithSample) {
        writeLocalStores(sampleStores);
        return sampleStores;
      }
      return [];
    }

    const normalized = parsed.map((store) => normalizeStore(store));
    if (!normalized.length && seedWithSample) {
      writeLocalStores(sampleStores);
      return sampleStores;
    }

    return normalized;
  } catch {
    if (seedWithSample) {
      writeLocalStores(sampleStores);
      return sampleStores;
    }
    return [];
  }
}

function makeStoreKey(store: Pick<Store, "name" | "address">): string {
  return `${store.name.trim().toLowerCase()}::${store.address.trim().toLowerCase()}`;
}

function shouldPreserveLocalStore(store: Store): boolean {
  if (store.id.startsWith("store_") || store.id.startsWith("local_")) {
    return true;
  }

  if (store.hasSeating !== "unknown") {
    return true;
  }

  if (store.reportedBy && !OFFLINE_REPORTERS.has(store.reportedBy)) {
    return true;
  }

  return false;
}

function sortStores(stores: Store[]) {
  return [...stores].sort((a, b) => {
    // 사용자 제보 편의점 먼저 (id가 "store_"로 시작)
    const aIsUserSubmitted = a.id.startsWith('store_');
    const bIsUserSubmitted = b.id.startsWith('store_');
    
    if (aIsUserSubmitted && !bIsUserSubmitted) return -1;   // a가 제보 편의점이면 앞으로
    if (!aIsUserSubmitted && bIsUserSubmitted) return 1;    // b가 제보 편의점이면 a 뒤로
    
    // 같은 카테고리 내에서는 lastUpdated 기준 (최신순)
    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });
}

function pruneDeletedServerStores(stores: Store[], serverStores: Store[]): Store[] {
  const serverIds = new Set(serverStores.map((store) => store.id));

  return stores.filter((store) => {
    // server-generated id가 local cache에만 남은 경우는 삭제된 데이터로 보고 정리한다.
    if (store.id.startsWith("store_")) {
      return serverIds.has(store.id);
    }

    return true;
  });
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
  let response: Response | null = null;
  try {
    response = await callServer("/stores", { method: "GET" });
  } catch {
    response = null;
  }

  if (response?.ok) {
    const data = await response.json();
    const serverData = (Array.isArray(data) ? data : []).map((store) => normalizeStore(store));
    const localData = readLocalStores({ seedWithSample: false });
    const baseStores = localData.length === 0 ? mergeWithSampleStores(serverData) : localData;
    const byKey = new Map<string, Store>();

    for (const local of baseStores) {
      const key = makeStoreKey(local);
      if (!byKey.has(key)) {
        byKey.set(key, local);
      }
    }

    for (const server of serverData) {
      const key = makeStoreKey(server);
      const existing = byKey.get(key);

      if (!existing) {
        byKey.set(key, server);
        continue;
      }

      if (shouldPreserveLocalStore(existing)) {
        continue;
      }

      byKey.set(key, server);
    }

    const merged = sortStores(Array.from(byKey.values()));
    const pruned = sortStores(pruneDeletedServerStores(merged, serverData));
    writeLocalStores(pruned);
    return { stores: pruned, source: "server" };
  }

  return { stores: sortStores(readLocalStores({ seedWithSample: true })), source: "local" };
}

export async function createStore(payload: StoreFormData): Promise<Store> {
  // undefined 필드 제거 (JSON.stringify에서 빠지는 것 방지)
  const cleanedPayload = {
    name: payload.name,
    address: payload.address,
    hasSeating: payload.hasSeating,
    seatTypes: payload.hasSeating === "yes" ? payload.seatTypes ?? [] : [],
    reporterName: payload.reporterName,
    notes: payload.notes,  // 명시적으로 포함
    latitude: payload.latitude,
    longitude: payload.longitude,
  };

  const response = await callServer("/stores", {
    method: "POST",
    body: JSON.stringify(cleanedPayload),
  });

  if (response?.ok) {
    const saved = normalizeStore(await response.json());
    const local = readLocalStores();
    const filtered = local.filter((store) => store.id !== saved.id);
    writeLocalStores(sortStores([saved, ...filtered]));
    return saved;
  }

  const local = readLocalStores();
  const duplicates = local.filter(
    (store) =>
      store.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
      store.address.trim().toLowerCase() === payload.address.trim().toLowerCase(),
  );

  // 같은 이름/주소가 있으면, 오프라인 가이드가 있으면 그것을 기준으로 사용 (ID 통일)
  // 없으면 먼저 찾은 것 사용
  const duplicate = duplicates.find(s => s.reportedBy === '오프라인 가이드') || duplicates[0];

  const nextSeatTypes = payload.hasSeating === "yes" ? payload.seatTypes ?? [] : [];

  const nextStore = duplicate
    ? {
        ...duplicate,
        hasSeating: payload.hasSeating,
        seatTypes: nextSeatTypes,
        reportedBy: payload.reporterName || (duplicate.reportedBy === '오프라인 가이드' ? '익명' : duplicate.reportedBy),
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
        seatTypes: nextSeatTypes,
        reportedBy: payload.reporterName || "익명",
        notes: payload.notes,
        latitude: payload.latitude,
        longitude: payload.longitude,
        lastUpdated: new Date().toISOString(),
        available_seats: payload.hasSeating === "yes" ? 1 : 0,
        total_seats: payload.hasSeating === "yes" ? 1 : 0,
      });

  const normalizedNext = normalizeStore(nextStore as Partial<Store> & Record<string, unknown>);

  const merged = duplicate
    ? local
        // 같은 이름/주소의 모든 데이터 제거 (중복 방지)
        .filter(store => 
          !(store.name.trim().toLowerCase() === payload.name.trim().toLowerCase() &&
            store.address.trim().toLowerCase() === payload.address.trim().toLowerCase())
        )
        // 수정된 데이터 추가
        .concat([normalizedNext])
    : [normalizedNext, ...local];

  writeLocalStores(sortStores(merged));
  return normalizedNext;
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

  // 서버에 없는 id로 update 실패 시, 자동으로 createStore를 호출해 서버에 새로 저장
  try {
    const mergedPayload = { ...patch };
    // name, address 등 필수값이 patch에 없으면 로컬에서 보충
    const local = readLocalStores();
    const existing = local.find((store) => store.id === storeId);
    if (existing) {
      if (!mergedPayload.name) mergedPayload.name = existing.name;
      if (!mergedPayload.address) mergedPayload.address = existing.address;
      if (!mergedPayload.hasSeating) mergedPayload.hasSeating = existing.hasSeating;
      if (!mergedPayload.latitude) mergedPayload.latitude = existing.latitude;
      if (!mergedPayload.longitude) mergedPayload.longitude = existing.longitude;
      if (!mergedPayload.notes) mergedPayload.notes = existing.notes;
      if (!mergedPayload.reportedBy) mergedPayload.reportedBy = existing.reportedBy;
    }
    // @ts-ignore
    const created = await createStore(mergedPayload);
    return created;
  } catch (e) {
    // 실패 시 fallback: 로컬만 갱신
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

/**
 * 폼 없이 좌석 유무만 한 번에 제보하는 간편 제보.
 * - 이미 매칭된 매장(existingStore)이 있으면 그 매장을 업데이트한다.
 * - 없으면 selection(지도/검색에서 고른 편의점)을 기반으로 신규 생성한다.
 * 좌석 형태는 원탭 제보 특성상 받지 않으며, 필요 시 이후 상세 제보로 보완한다.
 */
export async function quickReportSeating(
  selection: StoreSelectInfo,
  hasSeating: "yes" | "no",
  options?: { existingStore?: Store; reporterName?: string },
): Promise<Store> {
  const existing = options?.existingStore;
  const reporterName = options?.reporterName?.trim() || "익명";

  if (existing) {
    const updated = await updateStore(existing.id, {
      name: existing.name,
      address: existing.address,
      hasSeating,
      // 좌석 없음으로 바뀌면 기존 형태 정보는 비운다. 있음이면 기존 형태 유지.
      seatTypes: hasSeating === "yes" ? existing.seatTypes ?? [] : [],
      reportedBy: reporterName,
      latitude: existing.latitude ?? selection.latitude,
      longitude: existing.longitude ?? selection.longitude,
      available_seats: hasSeating === "yes" ? 1 : 0,
      total_seats: hasSeating === "yes" ? 1 : 0,
    });

    if (updated) return updated;
  }

  return createStore({
    name: selection.name.trim(),
    address: selection.address.trim(),
    hasSeating,
    seatTypes: [],
    reporterName,
    notes: "",
    latitude: selection.latitude,
    longitude: selection.longitude,
  });
}
