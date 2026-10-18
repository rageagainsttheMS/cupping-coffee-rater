import type { SupabaseClient } from "@supabase/supabase-js";
import type { CafeStore, StoredCafe } from "./types.ts";

/** The CafeStore backed by the database, using the service role client. */
export function createCafeStore(db: SupabaseClient): CafeStore {
  return {
    async countCafesInBox(box) {
      const { data, error } = await db.rpc("count_cafes_in_box", {
        min_lng: box.minLng,
        min_lat: box.minLat,
        max_lng: box.maxLng,
        max_lat: box.maxLat,
      });
      if (error) throw error;
      return data as number;
    },

    async wasSearchedSince(key, since) {
      const { data, error } = await db
        .from("places_search_log")
        .select("search_key")
        .eq("search_key", key)
        .gte("searched_at", since.toISOString())
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },

    async logSearch(key, resultCount) {
      const { error } = await db
        .from("places_search_log")
        .upsert(
          { search_key: key, searched_at: new Date().toISOString(), result_count: resultCount },
          { onConflict: "search_key" },
        );
      if (error) throw error;
    },

    async upsertCafes(cafes) {
      const { data, error } = await db.rpc("upsert_cafes", {
        p_cafes: cafes.map((c) => ({
          google_place_id: c.googlePlaceId,
          name: c.name,
          suburb: c.suburb,
          lat: c.lat,
          lng: c.lng,
        })),
      });
      if (error) throw error;
      return data as StoredCafe[];
    },

    async findCafePlaceId(cafeId) {
      const { data, error } = await db
        .from("cafes")
        .select("google_place_id")
        .eq("id", cafeId)
        .maybeSingle();
      if (error) throw error;
      return (data?.google_place_id as string | undefined) ?? null;
    },

    async refreshCafe(cafeId, { name, lat, lng }) {
      const { error } = await db.rpc("refresh_cafe", {
        p_cafe_id: cafeId,
        p_name: name,
        p_lat: lat,
        p_lng: lng,
      });
      if (error) throw error;
    },
  };
}
