import { NEARBY_MAX_RESULTS } from "./places.ts";
import type { SearchInput } from "./schemas.ts";
import type { Box, CafeStore, PlaceCafe, PlacesClient, StoredCafe } from "./types.ts";

/** An area with this many stored cafes is not worth a Google search. This is the main cost control. */
export const ENOUGH_STORED_CAFES = 10;
/** Searched areas and queries are not searched again for this long. Also keeps coordinates inside the 30-day cache limit. */
export const SEARCH_REPEAT_DAYS = 25;
/**
 * Google is asked about a circle this many times wider than the view, so panning a little stays
 * inside an area already searched. Nearby Search costs the same whatever the radius.
 */
export const SEARCH_RADIUS_FACTOR = 2;

const DEFAULT_RADIUS_M = 1000;
const MIN_RADIUS_M = 300;
const MAX_RADIUS_M = 3000;
/** About 1.1 km. Text queries with a position are logged per tile so nearby ones share one Google call. */
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

// Google can list a place twice. Upserting one place twice in one statement would fail.
const dedupe = (found: PlaceCafe[]) => [
  ...new Map(found.map((c) => [c.googlePlaceId, c])).values(),
];

async function storeCafes(store: CafeStore, unique: PlaceCafe[]): Promise<StoredCafe[]> {
  return unique.length > 0 ? await store.upsertCafes(unique) : [];
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
    const unique = dedupe(await places.searchText({ query, near }));
    const cafes = await storeCafes(store, unique);
    await store.logSearch(key, unique.length);
    return { status: "searched", cafes };
  }

  let center: Point;
  let viewRadiusM: number;
  let view: Box | null = null;
  if (input.bbox) {
    const { min_lng, min_lat, max_lng, max_lat } = input.bbox;
    center = { lat: (min_lat + max_lat) / 2, lng: (min_lng + max_lng) / 2 };
    viewRadiusM = distanceM(center, { lat: max_lat, lng: max_lng });
    view = { minLng: min_lng, minLat: min_lat, maxLng: max_lng, maxLat: max_lat };
  } else {
    center = { lat: input.lat as number, lng: input.lng as number };
    viewRadiusM = input.radius_m ?? DEFAULT_RADIUS_M;
  }
  const areaRadiusM = Math.round(clamp(viewRadiusM, MIN_RADIUS_M, MAX_RADIUS_M));

  // Count what the person can see, the same way the app decided to ask.
  const stored = await store.countCafesInBox(view ?? boxAround(center, areaRadiusM));
  if (stored >= ENOUGH_STORED_CAFES) return { status: "enough_stored", cafes: [] };
  if (await store.wasAreaSearchedSince({ ...center, radiusM: areaRadiusM }, since)) {
    return { status: "recently_searched", cafes: [] };
  }

  const searchRadiusM = Math.min(MAX_RADIUS_M, areaRadiusM * SEARCH_RADIUS_FACTOR);
  const found = await places.searchNearby({ ...center, radiusM: searchRadiusM });
  const unique = dedupe(found);
  // Results come nearest first, so a full page is complete only out to the farthest one.
  const coveredRadiusM =
    found.length >= NEARBY_MAX_RESULTS
      ? Math.floor(Math.max(...unique.map((c) => distanceM(center, c))))
      : searchRadiusM;
  const cafes = await storeCafes(store, unique);
  await store.logAreaSearch({ ...center, radiusM: coveredRadiusM }, unique.length);
  return { status: "searched", cafes };
}
