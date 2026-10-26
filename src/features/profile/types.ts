import type { Metric } from "@/domain/metrics";
import type { ReviewDrink, ReviewPhoto } from "@/features/cafe/types";

/**
 * One row from `my_reviews()`. The function returns JSON for drinks and ratings, which the generated
 * database types leave as `Json`, so the real shape is written out here.
 */
export type MyReview = {
  review_id: string;
  cafe_id: string;
  cafe_name: string;
  suburb: string | null;
  /** `YYYY-MM-DD`. */
  visit_date: string;
  created_at: string;
  /** Set once the review has been edited. */
  edited_at: string | null;
  comment: string;
  beans: string | null;
  verified: boolean;
  drinks: ReviewDrink[];
  /** Food, vibe and work only. Coffee is the drinks' ratings. Unrated metrics are missing. */
  ratings: Partial<Record<Exclude<Metric, "coffee">, number>>;
  tags: { tag_id: number; metric: Metric; label: string }[];
  photos: ReviewPhoto[];
};

/** The chips on My reviews. One is chosen at a time. */
export type MyReviewsMode = "newest" | "highest" | "cafe" | "photo";
