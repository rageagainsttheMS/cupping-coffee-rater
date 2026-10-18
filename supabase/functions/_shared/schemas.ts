import { z } from "zod";

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

const bbox = z
  .object({ min_lng: lng, min_lat: lat, max_lng: lng, max_lat: lat })
  .refine((b) => b.min_lng < b.max_lng && b.min_lat < b.max_lat, "Bounding box is back to front");

/**
 * Either a text query (optionally near a point), a centre point with an optional radius, or a
 * bounding box (the visible map area).
 */
export const searchInputSchema = z
  .object({
    query: z.string().trim().min(3).max(100).optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    radius_m: z.number().positive().max(50_000).optional(),
    bbox: bbox.optional(),
  })
  .refine((i) => (i.lat === undefined) === (i.lng === undefined), "lat and lng go together")
  .refine(
    (i) => i.query !== undefined || i.bbox !== undefined || i.lat !== undefined,
    "Give a query, a point or a bounding box",
  );

export type SearchInput = z.infer<typeof searchInputSchema>;

export const detailsInputSchema = z.object({ cafe_id: z.uuid() });

export type DetailsInput = z.infer<typeof detailsInputSchema>;
