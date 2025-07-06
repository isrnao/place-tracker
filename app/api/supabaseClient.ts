import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl) {
  throw new Error(
    'Environment variable VITE_SUPABASE_URL is missing or empty.'
  );
}
if (!supabaseAnonKey) {
  throw new Error(
    'Environment variable VITE_SUPABASE_ANON_KEY is missing or empty.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
});

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function signOut() {
  try {
    await supabase.auth.signOut();
  } catch {
    // エラーが発生してもログアウト処理を続行
  }
  // ローカルストレージをクリア
  localStorage.clear();
  sessionStorage.clear();
  // ログアウト後にログイン画面にリダイレクト
  window.location.href = '/login';
}
