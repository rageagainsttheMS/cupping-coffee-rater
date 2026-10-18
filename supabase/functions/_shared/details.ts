import type { DetailsInput } from "./schemas.ts";
import { HttpError } from "./http.ts";
import type { CafeStore, PlacesClient } from "./types.ts";

export type DetailsResult = {
  open_now: boolean | null;
  weekday_descriptions: string[] | null;
  rating: number | null;
  rating_count: number | null;
  maps_uri: string | null;
  /** The app must show "Google" next to the rating and hours. */
  attribution: true;
};

type Deps = { store: CafeStore; places: PlacesClient };

/**
 * Live Place Details for one cafe. Rating, count and hours go straight back to the app and are not
 * stored. Only the cafe's name and coordinates are refreshed in the database.
 */
export async function placeDetails(
  { cafe_id }: DetailsInput,
  { store, places }: Deps,
): Promise<DetailsResult> {
  const placeId = await store.findCafePlaceId(cafe_id);
  if (!placeId) throw new HttpError(404, "cafe_not_found");

  const details = await places.getDetails(placeId);
  if (!details) throw new HttpError(404, "place_not_found");

  if (details.name !== null && details.lat !== null && details.lng !== null) {
    try {
      await store.refreshCafe(cafe_id, { name: details.name, lat: details.lat, lng: details.lng });
    } catch {
      // The refresh is a bonus. The user still gets their details.
    }
  }

  return {
    open_now: details.openNow,
    weekday_descriptions: details.weekdayDescriptions,
    rating: details.rating,
    rating_count: details.ratingCount,
    maps_uri: details.mapsUri,
    attribution: true,
  };
}
