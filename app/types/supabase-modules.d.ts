declare module '@supabase/ssr' {
  export function createBrowserClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>
  ): Record<string, unknown>;
  export function createServerClient(
    supabaseUrl: string,
    supabaseKey: string,
    options?: Record<string, unknown>
  ): Record<string, unknown>;
}
declare module '@supabase/auth-ui-react';
