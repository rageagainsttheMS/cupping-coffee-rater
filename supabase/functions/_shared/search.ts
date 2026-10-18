import type { SearchInput } from "./schemas.ts";
import type { Box, CafeStore, PlaceCafe, PlacesClient, StoredCafe } from "./types.ts";

/** An area with this many stored cafes is not worth a Google search. This is the main cost control. */
export const ENOUGH_STORED_CAFES = 10;
/** Searched areas and queries are not searched again for this long. Also keeps coordinates inside the 30-day cache limit. */
export const SEARCH_REPEAT_DAYS = 25;

const DEFAULT_RADIUS_M = 1000;
const MIN_RADIUS_M = 300;
const MAX_RADIUS_M = 3000;
/** About 1.1 km. Areas are logged per tile so nearby searches share one Google call. */
const TILES_PER_DEGREE = 100;
const METRES_PER_DEGREE_LAT = 111_320;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SearchResult = {
  status: "enough_stored" | "recently_searched" | "searched";
  /** Cafes stored by this search. Empty when Google was skipped. */
  cafes: StoredCafe[];
};

type Deps = { store: CafeStore; places: PlacesClient; now?: () => Date };

type Point = { lat: number; lng: number };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function tileKey({ lat, lng }: Point): string {
  return `t:${Math.floor(lat * TILES_PER_DEGREE)}:${Math.floor(lng * TILES_PER_DEGREE)}`;
}

function distanceM(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * METRES_PER_DEGREE_LAT;
  const dLng = (b.lng - a.lng) * METRES_PER_DEGREE_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLng);
}

function boxAround({ lat, lng }: Point, radiusM: number): Box {
  const dLat = radiusM / METRES_PER_DEGREE_LAT;
  const dLng = radiusM / (METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return { minLng: lng - dLng, minLat: lat - dLat, maxLng: lng + dLng, maxLat: lat + dLat };
}

async function storeFound(
  store: CafeStore,
  key: string,
  found: PlaceCafe[],
): Promise<StoredCafe[]> {
  // Google can list a place twice. Upserting one place twice in one statement would fail.
  const unique = [...new Map(found.map((c) => [c.googlePlaceId, c])).values()];
  const cafes = unique.length > 0 ? await store.upsertCafes(unique) : [];
  await store.logSearch(key, unique.length);
  return cafes;
}

export async function searchPlaces(input: SearchInput, deps: Deps): Promise<SearchResult> {
  const { store, places } = deps;
  const now = (deps.now ?? (() => new Date()))();
  const since = new Date(now.getTime() - SEARCH_REPEAT_DAYS * DAY_MS);

  if (input.query !== undefined) {
    const query = input.query.replace(/\s+/g, " ");
    const near =
      input.lat !== undefined && input.lng !== undefined
        ? { lat: input.lat, lng: input.lng }
        : undefined;
    const key = `q:${query.toLowerCase()}:${near ? tileKey(near) : "any"}`;

    if (await store.wasSearchedSince(key, since)) return { status: "recently_searched", cafes: [] };
    const found = await places.searchText({ query, near });
    return { status: "searched", cafes: await storeFound(store, key, found) };
  }

  let center: Point;
  let radiusM: number;
  if (input.bbox) {
    const { min_lng, min_lat, max_lng, max_lat } = input.bbox;
    center = { lat: (min_lat + max_lat) / 2, lng: (min_lng + max_lng) / 2 };
    radiusM = distanceM(center, { lat: max_lat, lng: max_lng });
  } else {
    center = { lat: input.lat as number, lng: input.lng as number };
    radiusM = input.radius_m ?? DEFAULT_RADIUS_M;
  }
  radiusM = Math.round(clamp(radiusM, MIN_RADIUS_M, MAX_RADIUS_M));

  if ((await store.countCafesInBox(boxAround(center, radiusM))) >= ENOUGH_STORED_CAFES) {
    return { status: "enough_stored", cafes: [] };
  }
  const key = tileKey(center);
  if (await store.wasSearchedSince(key, since)) return { status: "recently_searched", cafes: [] };

  const found = await places.searchNearby({ ...center, radiusM });
  return { status: "searched", cafes: await storeFound(store, key, found) };
}
