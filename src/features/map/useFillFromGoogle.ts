import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { usePlacesSearch } from "@/lib/places";
import { CAFES_IN_VIEW_KEY } from "./useCafesInView";
import { regionToBbox, searchTileKey } from "./geo";
import type { Region } from "./types";

/** Fewer stored cafes than this in view is worth asking Google about. Matches the server's cut-off. */
export const FEW_CAFES = 10;
/** Past this many degrees of longitude the view is too wide to fill from one search. */
const MAX_SEARCH_SPAN_DEGREES = 0.08;

/**
 * When the visible area has few stored cafes, asks the `places-search` function to fill it from
 * Google, once per tile per session. The server decides whether Google is really called (it skips
 * areas that are covered or were searched recently), so this only avoids repeat requests.
 */
export function useFillFromGoogle(
  region: Region | null,
  cafeCount: number | undefined,
  loading: boolean,
) {
  const queryClient = useQueryClient();
  const search = usePlacesSearch();
  const tried = useRef(new Set<string>());

  useEffect(() => {
    if (!region || loading || cafeCount === undefined || cafeCount >= FEW_CAFES) return;
    if (region.longitudeDelta > MAX_SEARCH_SPAN_DEGREES) return;
    const tile = searchTileKey(region);
    if (tried.current.has(tile)) return;
    tried.current.add(tile);

    const [west, south, east, north] = regionToBbox(region);
    search.mutate(
      { bbox: { min_lng: west, min_lat: south, max_lng: east, max_lat: north } },
      {
        onSuccess: (result) => {
          if (result.cafes.length > 0) {
            void queryClient.invalidateQueries({ queryKey: [CAFES_IN_VIEW_KEY] });
          }
        },
        // A failed search is not worth interrupting anyone for, and the tile stays marked as tried
        // for this session so a function that is down is not asked again on every pan.
      },
    );
  }, [region, cafeCount, loading, search, queryClient]);

  return { searching: search.isPending };
}
