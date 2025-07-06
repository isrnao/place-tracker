import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
});

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}
