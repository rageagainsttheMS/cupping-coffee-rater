import { FunctionsHttpError } from "@supabase/supabase-js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";

/** What to search for: a text query, a point, or the visible map area. Sent to `places-search`. */
export type PlacesSearchInput = {
  query?: string;
  lat?: number;
  lng?: number;
  radius_m?: number;
  bbox?: { min_lng: number; min_lat: number; max_lng: number; max_lat: number };
};

export type PlacesSearchResult = {
  /**
   * `enough_stored` and `recently_searched` mean Google was not called. Read the stored cafes
   * with `cafes_in_view` or `search_cafes` as usual.
   */
  status: "enough_stored" | "recently_searched" | "searched";
  /** Cafes added or refreshed by this search. Empty when Google was skipped. */
  cafes: {
    id: string;
    google_place_id: string;
    name: string;
    suburb: string | null;
    lat: number;
    lng: number;
  }[];
};

/** Live from Google, never stored. Show "Google" next to the rating and hours. */
export type PlaceDetails = {
  open_now: boolean | null;
  weekday_descriptions: string[] | null;
  rating: number | null;
  rating_count: number | null;
  maps_uri: string | null;
  attribution: true;
};

/** A short code from the function (`unauthorized`, `cafe_not_found`, `upstream_error`, …) or `network`. */
export class PlacesRequestError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "PlacesRequestError";
    this.code = code;
  }
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const code = await error.context
        .json()
        .then((b: { error?: string }) => b.error)
        .catch(() => undefined);
      throw new PlacesRequestError(code ?? "unknown");
    }
    throw new PlacesRequestError("network");
  }
  return data as T;
}

export function searchPlaces(input: PlacesSearchInput): Promise<PlacesSearchResult> {
  return invoke<PlacesSearchResult>("places-search", { ...input });
}

export function fetchPlaceDetails(cafeId: string): Promise<PlaceDetails> {
  return invoke<PlaceDetails>("places-details", { cafe_id: cafeId });
}

/** Fill in an area (or a text query) from Google. The server skips Google when it can. */
export function usePlacesSearch() {
  return useMutation({ mutationFn: searchPlaces });
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

/**
 * Hours and Google rating for the cafe page. Held in memory only, for a few minutes, because the
 * Maps Platform terms do not allow storing them. Do not persist this query.
 */
export function usePlaceDetails(cafeId: string | undefined) {
  return useQuery({
    queryKey: ["place-details", cafeId],
    queryFn: () => fetchPlaceDetails(cafeId as string),
    enabled: !!cafeId,
    staleTime: FIVE_MINUTES_MS,
    gcTime: 2 * FIVE_MINUTES_MS,
    retry: (count, error) =>
      count < 1 && !(error instanceof PlacesRequestError && error.code.endsWith("_not_found")),
  });
}
