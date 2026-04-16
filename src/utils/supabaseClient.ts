import { createClient } from '@supabase/supabase-js';

import { projectId, publicAnonKey } from './supabase/info';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl && projectId) {
	supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || publicAnonKey;

if (!supabaseUrl) {
	throw new Error('supabaseUrl is required. 환경변수 VITE_SUPABASE_URL 또는 projectId가 필요합니다.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
