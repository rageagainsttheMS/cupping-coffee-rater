import { PlacesError } from "./types.ts";
import type { CafeStore, PlacesClient } from "./types.ts";

/** Google's 30-day coordinate limit, less a margin. */
export const COORDINATE_MAX_AGE_DAYS = 25;
/** Place IDs older than this get an ID-only check. */
export const PLACE_ID_MAX_AGE_DAYS = 365;
/** Most Places calls in one run, so a backlog cannot blow the budget. Coordinates go first. */
export const MAX_PER_RUN = 200;
/** A run that fails this many times in a row (bad key, quota) stops instead of burning its cap. */
export const MAX_CONSECUTIVE_FAILURES = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RefreshSummary = {
  coordinates_refreshed: number;
  place_ids_checked: number;
  place_ids_changed: number;
  /** Google no longer knows the place. The stored row is left alone. */
  not_found: number;
  failed: number;
};

type Deps = { store: CafeStore; places: PlacesClient; now?: Date };

/**
 * Re-fetches coordinates for cafes not refreshed in 25 days, then confirms Place IDs older than a
 * year. A failed lookup leaves the stored row exactly as it was.
 */
export async function refreshCafes({
  store,
  places,
  now = new Date(),
}: Deps): Promise<RefreshSummary> {
  const summary: RefreshSummary = {
    coordinates_refreshed: 0,
    place_ids_checked: 0,
    place_ids_changed: 0,
    not_found: 0,
    failed: 0,
  };
  let consecutiveFailures = 0;

  /** Runs one lookup. Returns false once the run should give up. */
  const attempt = async (work: () => Promise<void>): Promise<boolean> => {
    try {
      await work();
      consecutiveFailures = 0;
    } catch (error) {
      summary.failed += 1;
      consecutiveFailures += 1;
      console.error(
        error instanceof PlacesError
          ? `places failed (${error.status ?? "network"})`
          : "refresh failed",
      );
    }
    return consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
  };

  const staleCoordinates = await store.findCafesToRefresh(
    new Date(now.getTime() - COORDINATE_MAX_AGE_DAYS * DAY_MS),
    MAX_PER_RUN,
  );
  for (const cafe of staleCoordinates) {
    const keepGoing = await attempt(async () => {
      const details = await places.getDetails(cafe.googlePlaceId);
      if (!details) {
        summary.not_found += 1;
        return;
      }
      if (details.name === null || details.lat === null || details.lng === null) {
        throw new PlacesError(200);
      }
      await store.refreshCafe(cafe.id, { name: details.name, lat: details.lat, lng: details.lng });
      summary.coordinates_refreshed += 1;
    });
    if (!keepGoing) return summary;
  }

  const remaining = MAX_PER_RUN - staleCoordinates.length;
  if (remaining <= 0) return summary;

  const stalePlaceIds = await store.findPlaceIdsToCheck(
    new Date(now.getTime() - PLACE_ID_MAX_AGE_DAYS * DAY_MS),
    remaining,
  );
  for (const cafe of stalePlaceIds) {
    const keepGoing = await attempt(async () => {
      const currentId = await places.getPlaceId(cafe.googlePlaceId);
      if (!currentId) {
        summary.not_found += 1;
        return;
      }
      await store.markPlaceIdChecked(cafe.id, currentId);
      summary.place_ids_checked += 1;
      if (currentId !== cafe.googlePlaceId) summary.place_ids_changed += 1;
    });
    if (!keepGoing) return summary;
  }

  return summary;
}
