import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { Metric } from "@/domain/metrics";
import { supabase } from "@/lib/supabase";
import { regionToBbox, roundBbox } from "./geo";
import type { MapCafe, Region } from "./types";

export const CAFES_IN_VIEW_KEY = "cafes-in-view";

/**
 * Cafes inside the map view with scores for the selected metric. The box snaps to a grid so a small
 * pan reuses the same query, and the previous cafes stay on screen while a new box loads.
 */
export function useCafesInView(region: Region | null, metric: Metric) {
  const bbox = region ? roundBbox(regionToBbox(region)) : null;
  return useQuery({
    queryKey: [CAFES_IN_VIEW_KEY, bbox, metric],
    enabled: bbox !== null,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async (): Promise<MapCafe[]> => {
      const [minLng, minLat, maxLng, maxLat] = bbox as NonNullable<typeof bbox>;
      const { data, error } = await supabase.rpc("cafes_in_view", {
        min_lng: minLng,
        min_lat: minLat,
        max_lng: maxLng,
        max_lat: maxLat,
        p_metric: metric,
      });
      if (error) throw error;
      return data as unknown as MapCafe[];
    },
  });
}
