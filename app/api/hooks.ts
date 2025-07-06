import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { getCurrentUser } from './supabaseClient';

export function useCurrentUser() {
  return useQuery({ queryKey: ['user'], queryFn: getCurrentUser });
}

export function usePrefectures() {
  const { data: userId } = useCurrentUser();
  return useQuery({
    queryKey: ['prefectures', userId],
    queryFn: () => supabase.rpc('prefecture_progress', { p_user_id: userId }),
    enabled: !!userId,
  });
}

export function useToggleVisit() {
  const { data: userId } = useCurrentUser();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      placeId,
      visited,
    }: {
      placeId: number;
      visited: boolean;
    }) => {
      if (visited) {
        return supabase
          .from('visits')
          .delete()
          .eq('user_id', userId)
          .eq('place_id', placeId);
      }
      return supabase
        .from('visits')
        .insert({ user_id: userId, place_id: placeId });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}
