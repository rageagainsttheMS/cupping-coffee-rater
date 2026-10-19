import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { CAFE_DETAIL_KEY } from "./useCafeDetail";
import type { CafeDetail } from "./types";

/** The Saved tab's query (M8). Invalidated here so it is fresh when it is built. */
export const SAVED_CAFES_KEY = "saved-cafes";

/**
 * Saves or unsaves a cafe. The heart flips straight away on the cached detail and goes back if the
 * request fails. `onError` lets the screen say so.
 */
export function useSaveCafe(cafeId: string, onError: () => void) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;
  const detailKey = [CAFE_DETAIL_KEY, cafeId];

  return useMutation({
    mutationFn: async (save: boolean) => {
      if (!userId) throw new Error("not_signed_in");
      const { error } = save
        ? await supabase.from("saved_cafes").upsert({ user_id: userId, cafe_id: cafeId })
        : await supabase.from("saved_cafes").delete().eq("user_id", userId).eq("cafe_id", cafeId);
      if (error) throw error;
    },
    onMutate: async (save) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const before = queryClient.getQueryData<CafeDetail | null>(detailKey);
      if (before) queryClient.setQueryData<CafeDetail>(detailKey, { ...before, saved: save });
      return { before };
    },
    onError: (_error, _save, context) => {
      if (context?.before) queryClient.setQueryData(detailKey, context.before);
      onError();
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: [SAVED_CAFES_KEY] });
    },
  });
}
