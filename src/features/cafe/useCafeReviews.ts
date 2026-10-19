import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Metric } from "@/domain/metrics";
import { supabase } from "@/lib/supabase";
import type { CafeReview, ReviewCursor, ReviewsResult } from "./types";

export const CAFE_REVIEWS_KEY = "cafe-reviews";
export const REVIEWS_PAGE_SIZE = 20;

/** Newest first, filtered by metric and optionally by drink. Pages load as the list is scrolled. */
export function useCafeReviews(
  cafeId: string,
  metric: Metric,
  drinkId: number | null,
): ReviewsResult {
  const query = useInfiniteQuery({
    queryKey: [CAFE_REVIEWS_KEY, cafeId, metric, drinkId],
    initialPageParam: null as ReviewCursor | null,
    queryFn: async ({ pageParam }): Promise<CafeReview[]> => {
      const { data, error } = await supabase.rpc("cafe_reviews", {
        p_cafe_id: cafeId,
        p_metric: metric,
        p_drink_id: drinkId ?? undefined,
        p_page_size: REVIEWS_PAGE_SIZE,
        p_before_created_at: pageParam?.created_at,
        p_before_id: pageParam?.review_id,
      });
      if (error) throw error;
      return data as unknown as CafeReview[];
    },
    getNextPageParam: (lastPage): ReviewCursor | undefined => {
      const last = lastPage[lastPage.length - 1];
      return lastPage.length < REVIEWS_PAGE_SIZE || !last
        ? undefined
        : { created_at: last.created_at, review_id: last.review_id };
    },
  });

  const reviews = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const { fetchNextPage, refetch } = query;
  return {
    reviews,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: () => void fetchNextPage(),
    refetch: () => void refetch(),
  };
}
