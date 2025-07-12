import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        signal: AbortSignal.timeout(15000), // 15秒タイムアウト
      });
    },
  },
});

// 認証されたSupabaseクライアントを作成する関数
export async function createAuthenticatedSupabaseClient(request: Request) {
  try {
    // まずAuthorizationヘッダーをチェック
    let token =
      request.headers.get('authorization')?.replace('Bearer ', '') || '';

    if (!token) {
      const cookieHeader = request.headers.get('cookie') ?? '';

      // より広範囲なトークン検索を試行
      const tokenPatterns = [
        /sb-[a-zA-Z0-9]+-auth-token=([^;]+)/,
        /sb-access-token=([^;]+)/,
        /supabase-auth-token=([^;]+)/,
        /supabase\.auth\.token=([^;]+)/,
        /access_token=([^;]+)/,
      ];

      for (const pattern of tokenPatterns) {
        const match = cookieHeader.match(pattern);
        if (match) {
          token = decodeURIComponent(match[1]);
          break;
        }
      }
    }

    if (!token) {
      return null;
    }

    // AbortControllerを使用してタイムアウト付きでトークンをテスト
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

    // トークンを使用してSupabaseクライアントを作成
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: controller.signal,
          });
        },
      },
    });

    try {
      // トークンが有効かテストしてみる
      const { data: user, error: _error } = await client.auth.getUser(token);
      clearTimeout(timeoutId);

      if (_error || !user.user) {
        return null;
      }

      return client;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Supabase auth token validation timeout');
      }
      return null;
    }
  } catch {
    return null;
  }
}

export async function getUser(request: Request): Promise<string | null> {
  try {
    let token =
      request.headers.get('authorization')?.replace('Bearer ', '') || '';
    if (!token) {
      const cookieHeader = request.headers.get('cookie') ?? '';
      const match = cookieHeader.match(/sb-access-token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
    if (!token) {
      return null;
    }

    // AbortControllerを使用してタイムアウト付きでユーザー情報を取得
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

    try {
      // AbortControllerのシグナルを使用してSupabaseクライアントを作成
      const clientWithAbort = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false },
        global: {
          fetch: (url, options = {}) => {
            return fetch(url, {
              ...options,
              signal: controller.signal,
            });
          },
        },
      });

      const { data, error: _error } = await clientWithAbort.auth.getUser(token);
      clearTimeout(timeoutId);

      if (_error) {
        console.warn('Supabase auth error:', _error);
        return null;
      }

      const userId = data.user?.id ?? null;
      return userId;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Supabase auth request timeout');
      } else {
        console.warn('Failed to get user:', error);
      }
      return null;
    }
  } catch (outerError) {
    console.warn('Failed to get user:', outerError);
    return null;
  }
}

export interface Category {
  id: number;
  key: string;
  slug: string;
  name: string;
}
export type CategoryId = Category['id'];
export type CategorySlug = Category['slug'];

export interface PrefectureProgressRow {
  id: number;
  name: string;
  visited: number;
  total: number;
}

export interface PlaceWithVisit {
  id: number;
  name: string;
  visited: boolean;
  prefecture_id?: number;
}

let cachedCategories: Category[] | null = null;

export async function fetchCategories(): Promise<Category[]> {
  if (cachedCategories) return cachedCategories;
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');
  if (error) throw error;
  cachedCategories = data ?? [];
  return cachedCategories;
}

export async function fetchCategoryBySlug(
  slug: CategorySlug
): Promise<Category | null> {
  const categories = await fetchCategories();
  return categories.find(c => c.slug === slug) ?? null;
}

export async function fetchPrefectureProgress(
  userId: string | null,
  categoryId?: number,
  authenticatedClient?: SupabaseClient | null
): Promise<PrefectureProgressRow[]> {
  const client = authenticatedClient || supabase;
  const { data, error } = await client.rpc('prefecture_progress', {
    p_user_id: userId,
    p_category: categoryId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlacesWithVisit(
  userId: string | null,
  prefectureId: number,
  categoryId?: number,
  authenticatedClient?: SupabaseClient | null
): Promise<PlaceWithVisit[]> {
  const client = authenticatedClient || supabase;

  const params = {
    p_user_id: userId,
    p_prefecture: prefectureId,
    p_category: categoryId ?? null,
  };

  const { data, error } = await client.rpc('places_with_visit', params);

  if (error) throw error;
  return data ?? [];
}

export async function fetchPlacesByCategory(
  userId: string | null,
  categoryId: number
): Promise<PlaceWithVisit[]> {
  const { data, error } = await supabase.rpc('places_by_category', {
    p_user_id: userId,
    p_category: categoryId,
  });
  if (error) throw error;
  return data ?? [];
}
