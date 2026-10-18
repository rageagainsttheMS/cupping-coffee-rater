/** A cafe as Google describes it, reduced to the fields we store. */
export type PlaceCafe = {
  googlePlaceId: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
};

/** A cafe row as returned by `upsert_cafes`. */
export type StoredCafe = {
  id: string;
  google_place_id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
};

/**
 * What Google says about one place right now. Rating, count and hours are passed straight through to
 * the app and never stored (Maps Platform terms allow caching only place ids and, for 30 days, coordinates).
 */
export type PlaceDetails = {
  name: string | null;
  lat: number | null;
  lng: number | null;
  openNow: boolean | null;
  weekdayDescriptions: string[] | null;
  rating: number | null;
  ratingCount: number | null;
  mapsUri: string | null;
};

export type Box = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/** Any failure talking to Google. Carries no response body, so nothing from Google can leak. */
export class PlacesError extends Error {
  readonly status: number | undefined;

  constructor(status?: number) {
    super("places_request_failed");
    this.name = "PlacesError";
    this.status = status;
  }
}

export interface PlacesClient {
  searchNearby(args: { lat: number; lng: number; radiusM: number }): Promise<PlaceCafe[]>;
  searchText(args: { query: string; near?: { lat: number; lng: number } }): Promise<PlaceCafe[]>;
  /** Null when Google no longer has the place. */
  getDetails(placeId: string): Promise<PlaceDetails | null>;
}

/** The only database access the functions need. Note there is no way to store ratings or hours. */
export interface CafeStore {
  countCafesInBox(box: Box): Promise<number>;
  wasSearchedSince(key: string, since: Date): Promise<boolean>;
  logSearch(key: string, resultCount: number): Promise<void>;
  upsertCafes(cafes: PlaceCafe[]): Promise<StoredCafe[]>;
  findCafePlaceId(cafeId: string): Promise<string | null>;
  refreshCafe(cafeId: string, update: { name: string; lat: number; lng: number }): Promise<void>;
}
