import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

interface StoreData {
  id: string;
  name: string;
  address: string;
  hasSeating: "yes" | "no" | "unknown";
  lastUpdated: string;
  reportedBy?: string;
  notes?: string;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("*", logger(console.log));

// 모든 편의점 조회
app.get("/make-server-3e44bc02/stores", async (c) => {
  try {
    console.log("편의점 목록 조회 요청");

    // 환경변수 확인
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    console.log("Supabase URL:", supabaseUrl ? "설정됨" : "없음");
    console.log("Supabase Service Key:", supabaseKey ? "설정됨" : "없음");

    const stores = await kv.getByPrefix("store:");
    console.log(`${stores.length}개의 편의점 데이터 조회됨`);
    console.log("조회된 데이터 샘플:", stores.slice(0, 2));

    // getByPrefix는 이미 value 배열을 ��환하므로 직접 사용
    const storeList = stores
      .filter((store) => store && store.id)
      .map((store) => store as StoreData);

    console.log(`필터링 후 ${storeList.length}개의 유효한 편의점 데이터`);

    // 최신 업데이트 순으로 정렬
    storeList.sort(
      (a, b) =>
        new Date(b.lastUpdated).getTime() -
        new Date(a.lastUpdated).getTime(),
    );

    return c.json(storeList);
  } catch (error) {
    console.error("편의점 목록 조회 중 상세 오류:", error);
    console.error("오류 스택:", error.stack);
    return c.json(
      {
        error: "편의점 목록을 조회하는 중 오류가 발생했습니다.",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      500,
    );
  }
});

// 새 편의점 정보 추가
app.post("/make-server-3e44bc02/stores", async (c) => {
  try {
    console.log("새 편의점 정보 제보 요청");

    const body = await c.req.json();
    const { name, address, hasSeating, reporterName, notes } =
      body;

    if (!name || !address) {
      return c.json(
        { error: "편의점 이름과 주소는 필수 입력 항목입니다." },
        400,
      );
    }

    // 중복 체크
    const existingStores = await kv.getByPrefix("store:");
    const duplicate = existingStores.find(
      (storeData: StoreData) => {
        return (
          storeData &&
          storeData.name &&
          storeData.address &&
          storeData.name.toLowerCase() === name.toLowerCase() &&
          storeData.address.toLowerCase() ===
            address.toLowerCase()
        );
      },
    );

    if (duplicate) {
      const existingStore = duplicate as StoreData;
      const updatedStore: StoreData = {
        ...existingStore,
        hasSeating: hasSeating || existingStore.hasSeating,
        lastUpdated: new Date().toISOString(),
        reportedBy:
          reporterName || existingStore.reportedBy || "익명",
        notes: notes || existingStore.notes,
      };

      await kv.set(`store:${existingStore.id}`, updatedStore);
      console.log(`기존 편의점 정보 업데이트: ${name}`);

      return c.json(updatedStore);
    }

    // 새 편의점 추가
    const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newStore: StoreData = {
      id: storeId,
      name: name.trim(),
      address: address.trim(),
      hasSeating: hasSeating || "unknown",
      lastUpdated: new Date().toISOString(),
      reportedBy: reporterName?.trim() || "익명",
      notes: notes?.trim() || "",
    };

    await kv.set(`store:${storeId}`, newStore);
    console.log(`새 편의점 정보 추가: ${name}`);

    return c.json(newStore, 201);
  } catch (error) {
    console.error("편의점 정보 제보 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 저장하는 중 오류가 발생했습니다.",
      },
      500,
    );
  }
});

// 특정 편의점 정보 조회
app.get("/make-server-3e44bc02/stores/:id", async (c) => {
  try {
    const storeId = c.req.param("id");
    console.log(`편의점 정보 조회 요청: ${storeId}`);

    const store = await kv.get(`store:${storeId}`);

    if (!store) {
      return c.json(
        { error: "편의점을 찾을 수 없습니다." },
        404,
      );
    }

    return c.json(store);
  } catch (error) {
    console.error("편의점 정보 조회 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 조회하는 중 오류가 발생했습니다.",
      },
      500,
    );
  }
});

// 편의점 정보 업데이트
app.put("/make-server-3e44bc02/stores/:id", async (c) => {
  try {
    const storeId = c.req.param("id");
    const body = await c.req.json();

    console.log(`편의점 정보 업데이트 요청: ${storeId}`);

    const existingStore = await kv.get(`store:${storeId}`);

    if (!existingStore) {
      return c.json(
        { error: "편의점을 찾을 수 없습니다." },
        404,
      );
    }

    const updatedStore: StoreData = {
      ...(existingStore as StoreData),
      ...body,
      lastUpdated: new Date().toISOString(),
    };

    await kv.set(`store:${storeId}`, updatedStore);
    console.log(`편의점 정보 업데이트 완료: ${storeId}`);

    return c.json(updatedStore);
  } catch (error) {
    console.error("편의점 정보 업데이트 중 오류:", error);
    return c.json(
      {
        error:
          "편의점 정보를 업데이트하는 중 오류가 발생했습니다.",
      },
      500,
    );
  }
});

// 편의점 정보 삭제
app.delete("/make-server-3e44bc02/stores/:id", async (c) => {
  try {
    const storeId = c.req.param("id");
    console.log(`편의점 정보 삭제 요청: ${storeId}`);

    const existingStore = await kv.get(`store:${storeId}`);

    if (!existingStore) {
      return c.json(
        { error: "편의점을 찾을 수 없습니다." },
        404,
      );
    }

    await kv.del(`store:${storeId}`);
    console.log(`편의점 정보 삭제 완료: ${storeId}`);

    return c.json({ 
      message: "편의점 정보가 성공적으로 삭제되었습니다.",
      deletedStore: existingStore 
    });
  } catch (error) {
    console.error("편의점 정보 삭제 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 삭제하는 중 오류가 발생했습니다.",
      },
      500,
    );
  }
});

// 헬스 체크 엔드포인트
app.get("/make-server-3e44bc02/health", async (c) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    // KV 스토어 연결 테스트
    let kvStatus = "ok";
    let kvError = null;
    try {
      // 간단한 테스트 키로 연결 확인
      await kv.get("health_check_test");
    } catch (error) {
      kvStatus = "error";
      kvError = error.message;
    }
    
    return c.json({
      status: "ok",
      message: "편의점 좌석 정보 서버가 정상 작동 중입니다.",
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl ? "configured" : "missing",
        supabaseKey: supabaseKey ? "configured" : "missing",
        kvStore: {
          status: kvStatus,
          error: kvError,
        },
      },
    });
  } catch (error) {
    console.error("헬스 체크 중 오류:", error);
    return c.json({
      status: "error",
      message: "서버에 문제가 발생했습니다.",
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// 환경변수 조회 엔드포인트 (보안상 제한적으로 사용)
app.get("/make-server-3e44bc02/env/:key", (c) => {
  try {
    const key = c.req.param("key");
    
    // 허용된 환경변수만 접근 가능
    const allowedKeys = ["KAKAO_MAP_API_KEY"];
    
    if (!allowedKeys.includes(key)) {
      return c.json({ error: "접근이 허용되지 않은 환경변수입니다." }, 403);
    }
    
    const value = Deno.env.get(key);
    
    if (!value) {
      return c.json({ error: "환경변수를 찾을 수 없습니다." }, 404);
    }
    
    return c.json({ key, value });
  } catch (error) {
    console.error("환경변수 조회 중 오류:", error);
    return c.json({ error: "환경변수 조회 중 오류가 발생했습니다." }, 500);
  }
});

// 초기 샘플 데이터 추가
app.post(
  "/make-server-3e44bc02/init-sample-data",
  async (c) => {
    try {
      console.log("샘플 데이터 초기화 요청");

      // 기존 데이터 확인
      const existingStores = await kv.getByPrefix("store:");
      console.log(`기존 편의점 데이터 ${existingStores.length}개 발견`);

      // 샘플 데이터가 이미 있으면 스킵
      if (existingStores.length > 0) {
        console.log("이미 샘플 데이터가 존재하므로 스킵");
        return c.json({
          message: "샘플 데이터가 이미 존재합니다.",
          count: existingStores.length,
        });
      }

      const sampleStores: StoreData[] = [
        {
          id: "sample_1",
          name: "세븐일레븐 강남역점",
          address: "서울특별시 강남구 강남대로 지하 396",
          hasSeating: "yes",
          lastUpdated: new Date().toISOString(),
          reportedBy: "관리자",
          notes: "좌석 형태: 2인/4인 테이블 | 비고: 2인 3개, 4인 2개",
        },
        {
          id: "sample_2",
          name: "CU 홍대입구역점",
          address: "서울특별시 마포구 양화로 지하 188",
          hasSeating: "no",
          lastUpdated: new Date().toISOString(),
          reportedBy: "관리자",
          notes: "좌석 형태: 높은 스탠딩 테이블 | 비고: 서서 취식만 가능",
        },
        {
          id: "sample_3",
          name: "GS25 신촌점",
          address: "서울특별시 서대문구 신촌로 134",
          hasSeating: "yes",
          lastUpdated: new Date().toISOString(),
          reportedBy: "관리자",
          notes: "좌석 형태: 창가 2인 테이블 | 비고: 총 4개",
        },
        {
          id: "sample_4",
          name: "emart24 역삼점",
          address: "서울특별시 강남구 역삼동 678-9",
          hasSeating: "unknown",
          lastUpdated: new Date().toISOString(),
          reportedBy: "",
          notes: "",
        },
      ];

      console.log(`${sampleStores.length}개의 샘플 데이터 추가 시작`);

      for (const store of sampleStores) {
        try {
          await kv.set(`store:${store.id}`, store);
          console.log(`샘플 데이터 추가 성공: ${store.name}`);
        } catch (storeError) {
          console.error(`샘플 데이터 추가 실패 (${store.name}):`, storeError);
        }
      }

      console.log("샘플 데이터 초기화 완료");
      return c.json({
        message: "샘플 데이터가 추가되었습니다.",
        count: sampleStores.length,
        stores: sampleStores.map(s => ({ id: s.id, name: s.name })),
      });
    } catch (error) {
      console.error("샘플 데이터 초기화 중 상세 오류:", error);
      console.error("오류 스택:", error.stack);
      return c.json(
        { 
          error: "샘플 데이터 초기화 중 오류가 발생했습니다.",
          details: error.message,
          timestamp: new Date().toISOString(),
        },
        500,
      );
    }
  },
);

Deno.serve(app.fetch);