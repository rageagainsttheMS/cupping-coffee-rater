import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { CAFE_REVIEWS_KEY } from "@/features/cafe/useCafeReviews";
import { SAVED_CAFES_KEY } from "@/features/cafe/useSaveCafe";
import { CAFES_IN_VIEW_KEY } from "@/features/map/useCafesInView";
import { supabase } from "@/lib/supabase";
import type { MyReview } from "./types";

export const MY_REVIEWS_KEY = "my-reviews";
const PHOTO_BUCKET = "review-photos";

/** The signed-in person's own reviews, newest first. */
export function useMyReviews() {
  const { session } = useAuth();
  return useQuery({
    queryKey: [MY_REVIEWS_KEY],
    enabled: !!session,
    queryFn: async (): Promise<MyReview[]> => {
      const { data, error } = await supabase.rpc("my_reviews");
      if (error) throw error;
      return (data ?? []) as unknown as MyReview[];
    },
  });
}

/**
 * Deletes one of the person's reviews. Scores are views, so they recompute on their own. The photo
 * file is removed afterwards, and a failure there leaves only an unreachable file behind.
 */
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: MyReview) => {
      const { error } = await supabase.from("reviews").delete().eq("id", review.review_id);
      if (error) throw error;
      if (review.photo_path) {
        await supabase.storage
          .from(PHOTO_BUCKET)
          .remove([review.photo_path])
          .catch(() => {});
      }
    },
    onSettled: (_data, _error, review) => {
      for (const key of [
        MY_REVIEWS_KEY,
        SAVED_CAFES_KEY,
        CAFES_IN_VIEW_KEY,
        CAFE_REVIEWS_KEY,
        "cafe-photos",
      ]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      void queryClient.invalidateQueries({ queryKey: [CAFE_DETAIL_KEY, review.cafe_id] });
    },
  });
}
