/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_MAP_API_KEY?: string;
  readonly VITE_ENABLE_SUPABASE_REMOTE?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
