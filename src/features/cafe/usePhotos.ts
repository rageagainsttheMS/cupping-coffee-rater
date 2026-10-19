import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CafePhoto } from "./types";

const PHOTO_BUCKET = "review-photos";
const PHOTO_GRID_COUNT = 5;

/** Signed links last an hour. The query is fresh for half that, so a link is never used near expiry. */
const SIGNED_URL_SECONDS = 60 * 60;
const SIGNED_URL_FRESH_MS = (SIGNED_URL_SECONDS / 2) * 1000;

/** The most recent community photos at this cafe. Row-level security hides hidden and blocked reviews. */
export function useCafePhotos(cafeId: string | undefined) {
  return useQuery({
    queryKey: ["cafe-photos", cafeId],
    enabled: !!cafeId,
    queryFn: async (): Promise<CafePhoto[]> => {
      const { data, error } = await supabase
        .from("review_photos")
        .select("storage_path, width, height, reviews!inner(cafe_id, created_at)")
        .eq("reviews.cafe_id", cafeId as string)
        .order("created_at", { referencedTable: "reviews", ascending: false })
        .limit(PHOTO_GRID_COUNT);
      if (error) throw error;
      return data.map((row) => ({ path: row.storage_path, width: row.width, height: row.height }));
    },
  });
}

/** A short-lived link to one private photo. Cached per path, so the grid and a review share it. */
export function useSignedPhotoUrl(path: string | null) {
  return useQuery({
    queryKey: ["photo-url", path],
    enabled: !!path,
    staleTime: SIGNED_URL_FRESH_MS,
    gcTime: SIGNED_URL_FRESH_MS + 60_000,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path as string, SIGNED_URL_SECONDS);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
