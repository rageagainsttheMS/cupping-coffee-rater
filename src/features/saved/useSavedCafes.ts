import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { SAVED_CAFES_KEY } from "@/features/cafe/useSaveCafe";
import { supabase } from "@/lib/supabase";
import { insertAt } from "./filters";
import type { SavedCafe } from "./types";

/** The person's saved cafes, newest first, with scores and their own last rating at each. */
export function useSavedCafes() {
  const { session } = useAuth();
  return useQuery({
    queryKey: [SAVED_CAFES_KEY],
    enabled: !!session,
    queryFn: async (): Promise<SavedCafe[]> => {
      const { data, error } = await supabase.rpc("my_saved_cafes");
      if (error) throw error;
      return (data ?? []) as SavedCafe[];
    },
  });
}

type Change = { cafe: SavedCafe; save: boolean; index: number };

/**
 * Removes a cafe from the list straight away (or puts it back, for undo) and rolls back if the
 * request fails. `onError` lets the screen say so.
 */
export function useSetSaved(onError: () => void) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async ({ cafe, save }: Change) => {
      if (!userId) throw new Error("not_signed_in");
      const { error } = save
        ? await supabase.from("saved_cafes").upsert({ user_id: userId, cafe_id: cafe.id })
        : await supabase.from("saved_cafes").delete().eq("user_id", userId).eq("cafe_id", cafe.id);
      if (error) throw error;
    },
    onMutate: async ({ cafe, save, index }) => {
      await queryClient.cancelQueries({ queryKey: [SAVED_CAFES_KEY] });
      const before = queryClient.getQueryData<SavedCafe[]>([SAVED_CAFES_KEY]);
      if (before) {
        queryClient.setQueryData<SavedCafe[]>(
          [SAVED_CAFES_KEY],
          save ? insertAt(before, cafe, index) : before.filter((c) => c.id !== cafe.id),
        );
      }
      return { before };
    },
    onError: (_error, _change, context) => {
      if (context?.before) queryClient.setQueryData([SAVED_CAFES_KEY], context.before);
      onError();
    },
    onSettled: (_data, _error, { cafe }) => {
      void queryClient.invalidateQueries({ queryKey: [CAFE_DETAIL_KEY, cafe.id] });
      void queryClient.invalidateQueries({ queryKey: [SAVED_CAFES_KEY] });
    },
  });
}
