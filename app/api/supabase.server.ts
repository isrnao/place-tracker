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
    // 改善された認証ミドルウェアを使用してクライアントを取得
    const { protectedRouteAuth } = await import('~/lib/auth.middleware');
    const authResult = await protectedRouteAuth(request);

    if (authResult.authenticatedClient) {
      return authResult.authenticatedClient;
    }

    // フォールバック: SessionServiceから直接取得
    const { SessionService } = await import('~/lib/session.service');
    const authClient = await SessionService.getAuthenticatedClient(request);

    if (authClient) {
      return supabase;
    }

    return null;
  } catch (error) {
    // 認証エラーの場合はnullを返す（ミドルウェアがリダイレクトを処理）
    if (error instanceof Response) {
      throw error;
    }

    console.warn('Failed to create authenticated client:', error);
    return null;
  }
}

export async function getUser(request: Request): Promise<string | null> {
  // 改善された認証ミドルウェアを使用
  const { getUser: getAuthUser } = await import('~/lib/auth.middleware');
  return await getAuthUser(request);
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
