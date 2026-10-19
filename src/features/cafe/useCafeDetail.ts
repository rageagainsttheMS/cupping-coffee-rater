import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CafeDetail } from "./types";

export const CAFE_DETAIL_KEY = "cafe-detail";

/** Everything the cafe page shows except reviews, photos and the live Google details. */
export function useCafeDetail(cafeId: string | undefined) {
  return useQuery({
    queryKey: [CAFE_DETAIL_KEY, cafeId],
    enabled: !!cafeId,
    queryFn: async (): Promise<CafeDetail | null> => {
      const { data, error } = await supabase.rpc("cafe_detail", { p_cafe_id: cafeId as string });
      if (error) throw error;
      return data as unknown as CafeDetail | null;
    },
  });
}
