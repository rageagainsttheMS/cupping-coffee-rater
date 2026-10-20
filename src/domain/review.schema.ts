import { z } from "zod";
import { MILKS } from "./drinks";
import { COMMENT_MAX, COMMENT_MIN } from "./limits";
import { isValidRating } from "./rating";

const rating = z.number().refine(isValidRating, "Rating must be 1 to 5 in half-star steps");

const reviewDrink = z.object({
  drinkId: z.number().int().positive(),
  rating,
  milk: z.enum(MILKS).optional(),
  priceAud: z
    .number()
    .min(0)
    .max(999.99)
    .refine((p) => Math.abs(p * 100 - Math.round(p * 100)) < 1e-6, "Price must be in cents")
    .optional(),
});

/** Null means "Didn't try". */
const optionalRating = rating.nullable().optional();

/**
 * The review a user composes. Shared by the wizard and the `submit_review` payload.
 * Drink and tag IDs are only checked as integers here. The server checks they exist and are active.
 */
export const reviewSchema = z.object({
  reviewId: z.uuid(),
  cafeId: z.uuid(),
  drinks: z.array(reviewDrink).min(1),
  food: optionalRating,
  vibe: optionalRating,
  work: optionalRating,
  tagIds: z.array(z.number().int().positive()),
  comment: z.string().trim().min(COMMENT_MIN).max(COMMENT_MAX),
  beans: z.string().trim().max(80).optional(),
  photo: z
    .object({
      path: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  location: z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/**
 * What an edit sends: the new ratings, tags and comment. The cafe, drinks, price, beans and photo
 * cannot change, so each drink is only its id and new rating. Null means "Didn't try".
 */
export const reviewEditSchema = z.object({
  reviewId: z.uuid(),
  drinks: z.array(z.object({ drinkId: z.number().int().positive(), rating })).min(1),
  food: optionalRating,
  vibe: optionalRating,
  work: optionalRating,
  tagIds: z.array(z.number().int().positive()),
  comment: z.string().trim().min(COMMENT_MIN).max(COMMENT_MAX),
});

export type ReviewEditInput = z.infer<typeof reviewEditSchema>;
