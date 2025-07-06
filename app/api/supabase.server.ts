import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export async function getUser(request: Request): Promise<string | null> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data } = await supabase.auth.getUser(token);
  return data.user?.id ?? null;
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
  categoryId?: number
): Promise<PrefectureProgressRow[]> {
  const { data, error } = await supabase.rpc('prefecture_progress', {
    p_user_id: userId,
    p_category: categoryId ?? null,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlacesWithVisit(
  userId: string | null,
  prefectureId: number,
  categoryId?: number
): Promise<PlaceWithVisit[]> {
  const { data, error } = await supabase.rpc('places_with_visit', {
    p_user_id: userId,
    p_prefecture: prefectureId,
    p_category: categoryId ?? null,
  });
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
