import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

interface StoreData {
  id: string;
  name: string;
  address: string;
  has_seating: "yes" | "no" | "unknown";
  last_updated: string;
  reported_by?: string;
  notes?: string;
}

const app = new Hono();

// Supabase 클라이언트 설정
const supabase = createClient(
  Deno.env.get("SB_URL") || "",
  Deno.env.get("SB_SERVICE_ROLE_KEY") || ""
);

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

    const { data: stores, error } = await supabase
      .from("user_submitted_stores")
      .select("*")
      .order("last_updated", { ascending: false });

    if (error) {
      console.error("DB 조회 오류:", error);
      return c.json(
        { error: "편의점 목록을 조회하는 중 오류가 발생했습니다." },
        500
      );
    }

    console.log(`${stores?.length || 0}개의 편의점 데이터 조회됨`);
    return c.json(stores || []);
  } catch (error) {
    console.error("편의점 목록 조회 중 상세 오류:", error);
    return c.json(
      {
        error: "편의점 목록을 조회하는 중 오류가 발생했습니다.",
        details: error.message,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// 새 편의점 정보 추가
app.post("/make-server-3e44bc02/stores", async (c) => {
  try {
    console.log("새 편의점 정보 제보 요청");

    const body = await c.req.json();
    const { name, address, hasSeating, reporterName, notes } = body;
    const has_seating = hasSeating;

    if (!name || !address) {
      return c.json(
        { error: "편의점 이름과 주소는 필수 입력 항목입니다." },
        400
      );
    }

    // 중복 체크
    const { data: existingStores, error: selectError } = await supabase
      .from("user_submitted_stores")
      .select("*")
      .ilike("name", name.toLowerCase())
      .ilike("address", address.toLowerCase());

    if (selectError) {
      console.error("중복 체크 오류:", selectError);
      return c.json({ error: "중복 체크 중 오류가 발생했습니다." }, 500);
    }

    if (existingStores && existingStores.length > 0) {
      const existingStore = existingStores[0];
      const updatedStore: StoreData = {
        ...existingStore,
        has_seating: has_seating || existingStore.has_seating || "unknown",
        last_updated: new Date().toISOString(),
        reported_by: reporterName || existingStore.reported_by || "익명",
        notes: notes || existingStore.notes,
      };

      const { error: updateError } = await supabase
        .from("user_submitted_stores")
        .update(updatedStore)
        .eq("id", existingStore.id);

      if (updateError) {
        console.error("업데이트 오류:", updateError);
        return c.json({ error: "데이터 업데이트 중 오류가 발생했습니다." }, 500);
      }

      console.log(`기존 편의점 정보 업데이트: ${name}`);
      return c.json(updatedStore);
    }

    // 새 편의점 추가
    const storeId = `store_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const trimmedNotes = notes ? String(notes).trim() : "";
    const newStore: StoreData = {
      id: storeId,
      name: name.trim(),
      address: address.trim(),
      has_seating: has_seating || "unknown",
      last_updated: new Date().toISOString(),
      reported_by: reporterName?.trim() || "익명",
      notes: trimmedNotes || undefined,
    };

    const { error: insertError } = await supabase
      .from("user_submitted_stores")
      .insert([newStore]);

    if (insertError) {
      console.error("삽입 오류:", insertError);
      return c.json({ error: "데이터 저장 중 오류가 발생했습니다." }, 500);
    }

    console.log(`새 편의점 정보 추가: ${name}`);
    return c.json(newStore, 201);
  } catch (error) {
    console.error("편의점 정보 제보 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 저장하는 중 오류가 발생했습니다.",
      },
      500
    );
  }
});

// 특정 편의점 정보 조회
app.get("/make-server-3e44bc02/stores/:id", async (c) => {
  try {
    const storeId = c.req.param("id");
    console.log(`편의점 정보 조회 요청: ${storeId}`);

    const { data: store, error } = await supabase
      .from("user_submitted_stores")
      .select("*")
      .eq("id", storeId)
      .maybeSingle();

    if (error) {
      console.error("조회 오류:", error);
      return c.json({ error: "데이터 조회 중 오류가 발생했습니다." }, 500);
    }

    if (!store) {
      return c.json({ error: "편의점을 찾을 수 없습니다." }, 404);
    }

    return c.json(store);
  } catch (error) {
    console.error("편의점 정보 조회 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 조회하는 중 오류가 발생했습니다.",
      },
      500
    );
  }
});

// 편의점 정보 업데이트
app.put("/make-server-3e44bc02/stores/:id", async (c) => {
  try {
    const storeId = c.req.param("id");
    const body = await c.req.json();

    console.log(`편의점 정보 업데이트 요청: ${storeId}`);

    const { data: existingStore, error: selectError } = await supabase
      .from("user_submitted_stores")
      .select("*")
      .eq("id", storeId)
      .maybeSingle();

    if (selectError) {
      console.error("조회 오류:", selectError);
      return c.json({ error: "데이터 조회 중 오류가 발생했습니다." }, 500);
    }

    if (!existingStore) {
      return c.json({ error: "편의점을 찾을 수 없습니다." }, 404);
    }

    const updatedStore: StoreData = {
      ...(existingStore as StoreData),
      ...body,
      last_updated: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from("user_submitted_stores")
      .update(updatedStore)
      .eq("id", storeId);

    if (updateError) {
      console.error("업데이트 오류:", updateError);
      return c.json({ error: "데이터 업데이트 중 오류가 발생했습니다." }, 500);
    }

    console.log(`편의점 정보 업데이트 완료: ${storeId}`);
    return c.json(updatedStore);
  } catch (error) {
    console.error("편의점 정보 업데이트 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 업데이트하는 중 오류가 발생했습니다.",
      },
      500
    );
  }
});

// 편의점 정보 삭제
app.delete("/make-server-3e44bc02/stores/:id", async (c) => {
  try {
    const storeId = c.req.param("id");
    console.log(`편의점 정보 삭제 요청: ${storeId}`);

    const { data: existingStore, error: selectError } = await supabase
      .from("user_submitted_stores")
      .select("*")
      .eq("id", storeId)
      .maybeSingle();

    if (selectError) {
      console.error("조회 오류:", selectError);
      return c.json({ error: "데이터 조회 중 오류가 발생했습니다." }, 500);
    }

    if (!existingStore) {
      return c.json({ error: "편의점을 찾을 수 없습니다." }, 404);
    }

    const { error: deleteError } = await supabase
      .from("user_submitted_stores")
      .delete()
      .eq("id", storeId);

    if (deleteError) {
      console.error("삭제 오류:", deleteError);
      return c.json({ error: "데이터 삭제 중 오류가 발생했습니다." }, 500);
    }

    console.log(`편의점 정보 삭제 완료: ${storeId}`);
    return c.json({
      message: "편의점 정보가 성공적으로 삭제되었습니다.",
      deletedStore: existingStore,
    });
  } catch (error) {
    console.error("편의점 정보 삭제 중 오류:", error);
    return c.json(
      {
        error: "편의점 정보를 삭제하는 중 오류가 발생했습니다.",
      },
      500
    );
  }
});

// 헬스 체크 엔드포인트
app.get("/make-server-3e44bc02/health", async (c) => {
  try {
    const supabaseUrl = Deno.env.get("SB_URL");
    const supabaseKey = Deno.env.get("SB_SERVICE_ROLE_KEY");

    // DB 연결 테스트
    let dbStatus = "ok";
    let dbError = null;
    try {
      const { error } = await supabase
        .from("user_submitted_stores")
        .select("*", { count: "exact" });
      if (error) {
        dbStatus = "error";
        dbError = error.message;
      }
    } catch (error) {
      dbStatus = "error";
      dbError = error.message;
    }

    return c.json({
      status: "ok",
      message: "편의점 좌석 정보 서버가 정상 작동 중입니다.",
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl ? "configured" : "missing",
        supabaseKey: supabaseKey ? "configured" : "missing",
        database: {
          status: dbStatus,
          error: dbError,
        },
      },
    });
  } catch (error) {
    console.error("헬스 체크 중 오류:", error);
    return c.json(
      {
        status: "error",
        message: "서버에 문제가 발생했습니다.",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// 환경변수 조회 엔드포인트 (보안상 제한적으로 사용)
app.get("/make-server-3e44bc02/env/:key", (c) => {
  try {
    const key = c.req.param("key");

    // 허용된 환경변수만 접근 가능
    const allowedKeys = ["KAKAO_MAP_API_KEY"];

    if (!allowedKeys.includes(key)) {
      return c.json(
        { error: "접근이 허용되지 않은 환경변수입니다." },
        403
      );
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

Deno.serve(app.fetch);