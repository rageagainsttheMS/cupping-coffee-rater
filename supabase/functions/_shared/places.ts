import { z } from "zod";
import { PlacesError } from "./types.ts";
import type { PlaceCafe, PlaceDetails, PlacesClient } from "./types.ts";

const DEFAULT_BASE_URL = "https://places.googleapis.com";

// Field masks are what Google bills on, so each request asks only for what the app uses.
export const SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.location,places.addressComponents";
export const DETAILS_FIELD_MASK =
  "id,displayName,location,regularOpeningHours,currentOpeningHours,rating,userRatingCount,googleMapsUri";

const TEXT_SEARCH_BIAS_RADIUS_M = 5000;

type FetchResponse = { ok: boolean; status: number; json(): Promise<unknown> };
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<FetchResponse>;

const placeSchema = z.object({
  id: z.string().min(1).optional(),
  displayName: z.object({ text: z.string().min(1) }).optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  addressComponents: z
    .array(z.object({ longText: z.string().optional(), types: z.array(z.string()).optional() }))
    .optional(),
});

const openingHoursSchema = z
  .object({
    openNow: z.boolean().optional(),
    weekdayDescriptions: z.array(z.string()).optional(),
  })
  .optional();

const detailsSchema = z.object({
  displayName: z.object({ text: z.string() }).optional(),
  location: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  currentOpeningHours: openingHoursSchema,
  regularOpeningHours: openingHoursSchema,
  rating: z.number().optional(),
  userRatingCount: z.number().optional(),
  googleMapsUri: z.string().optional(),
});

function suburbOf(place: z.infer<typeof placeSchema>): string | null {
  const components = place.addressComponents ?? [];
  const pick = (type: string) =>
    components.find((c) => c.types?.includes(type) && c.longText)?.longText ?? null;
  return pick("locality") ?? pick("sublocality") ?? pick("sublocality_level_1");
}

function toCafes(body: unknown): PlaceCafe[] {
  const places = (body as { places?: unknown[] } | null)?.places;
  if (!Array.isArray(places)) return [];
  const cafes: PlaceCafe[] = [];
  for (const raw of places) {
    const parsed = placeSchema.safeParse(raw);
    if (!parsed.success) continue;
    const { id, displayName, location } = parsed.data;
    if (!id || !displayName || !location) continue;
    cafes.push({
      googlePlaceId: id,
      name: displayName.text,
      suburb: suburbOf(parsed.data),
      lat: location.latitude,
      lng: location.longitude,
    });
  }
  return cafes;
}

export function createPlacesClient({
  apiKey,
  fetch,
  baseUrl = DEFAULT_BASE_URL,
}: {
  apiKey: string;
  fetch: FetchLike;
  baseUrl?: string;
}): PlacesClient {
  // Every failure becomes a bare PlacesError: no status text, body or URL reaches the caller.
  async function request(
    method: "GET" | "POST",
    path: string,
    fieldMask: string,
    body?: unknown,
  ): Promise<{ status: number; json: unknown }> {
    let response: FetchResponse;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": fieldMask,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new PlacesError();
    }
    if (response.status === 404) return { status: 404, json: null };
    if (!response.ok) throw new PlacesError(response.status);
    try {
      return { status: response.status, json: await response.json() };
    } catch {
      throw new PlacesError(response.status);
    }
  }

  return {
    async searchNearby({ lat, lng, radiusM }) {
      const { json } = await request("POST", "/v1/places:searchNearby", SEARCH_FIELD_MASK, {
        includedTypes: ["cafe", "coffee_shop"],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: {
          circle: { center: { latitude: lat, longitude: lng }, radius: radiusM },
        },
      });
      return toCafes(json);
    },

    async searchText({ query, near }) {
      const { json } = await request("POST", "/v1/places:searchText", SEARCH_FIELD_MASK, {
        textQuery: query,
        includedType: "cafe",
        pageSize: 20,
        ...(near && {
          locationBias: {
            circle: {
              center: { latitude: near.lat, longitude: near.lng },
              radius: TEXT_SEARCH_BIAS_RADIUS_M,
            },
          },
        }),
      });
      return toCafes(json);
    },

    async getDetails(placeId): Promise<PlaceDetails | null> {
      const { status, json } = await request(
        "GET",
        `/v1/places/${encodeURIComponent(placeId)}`,
        DETAILS_FIELD_MASK,
      );
      if (status === 404) return null;
      const parsed = detailsSchema.safeParse(json);
      if (!parsed.success) throw new PlacesError(200);
      const d = parsed.data;
      return {
        name: d.displayName?.text ?? null,
        lat: d.location?.latitude ?? null,
        lng: d.location?.longitude ?? null,
        openNow: d.currentOpeningHours?.openNow ?? d.regularOpeningHours?.openNow ?? null,
        weekdayDescriptions: d.regularOpeningHours?.weekdayDescriptions ?? null,
        rating: d.rating ?? null,
        ratingCount: d.userRatingCount ?? null,
        mapsUri: d.googleMapsUri ?? null,
      };
    },
  };
}
