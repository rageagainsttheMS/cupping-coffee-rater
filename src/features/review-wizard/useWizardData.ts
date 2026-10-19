import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Point } from "@/features/map/types";
import { supabase } from "@/lib/supabase";

export type NearbyCafe = {
  id: string;
  google_place_id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
  distance_m: number;
};

const NEARBY_COUNT = 5;

/** The nearest stored cafes to the person, for step 1. Waits until a position is known. */
export function useNearbyCafes(position: Point | null) {
  return useQuery({
    queryKey: ["nearby-cafes", position?.lat.toFixed(4), position?.lng.toFixed(4)],
    enabled: position !== null,
    staleTime: 60_000,
    queryFn: async (): Promise<NearbyCafe[]> => {
      const { data, error } = await supabase.rpc("nearby_cafes", {
        p_lat: (position as Point).lat,
        p_lng: (position as Point).lng,
        p_limit: NEARBY_COUNT,
      });
      if (error) throw error;
      return data as unknown as NearbyCafe[];
    },
  });
}

const USUAL_SAMPLE = 200;

/** How often the signed-in person has had each drink, from their latest reviews. */
export function useUsualDrinks() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: ["usual-drinks", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Record<number, number>> => {
      const { data, error } = await supabase
        .from("review_drinks")
        .select("drink_id, reviews!inner(user_id)")
        .eq("reviews.user_id", userId as string)
        .limit(USUAL_SAMPLE);
      if (error) throw error;
      const counts: Record<number, number> = {};
      for (const row of data) counts[row.drink_id] = (counts[row.drink_id] ?? 0) + 1;
      return counts;
    },
  });
}
