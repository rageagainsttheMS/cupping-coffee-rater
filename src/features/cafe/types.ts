import type { Milk } from "@/domain/drinks";
import type { Metric } from "@/domain/metrics";

/**
 * The shapes returned by `cafe_detail` and `cafe_reviews`. Both return JSON, which the generated
 * database types leave as `Json`, so the real shape is written out here.
 */

export type MetricScore = { score: number | null; count: number };
export type CafeScores = Record<Metric, MetricScore>;

export type CafeDrink = {
  drink_id: number;
  name: string;
  /** Null until the drink has 3 ratings. */
  score: number | null;
  rating_count: number;
  median_price: number | null;
  price_reports: number;
};

export type CafeBean = { beans: string; count: number };

export type CafeTag = { tag_id: number; metric: Metric; label: string; count: number };

export type CafeDetail = {
  cafe: {
    id: string;
    google_place_id: string;
    name: string;
    suburb: string | null;
    lat: number;
    lng: number;
  };
  scores: CafeScores;
  drinks: CafeDrink[];
  beans: CafeBean[];
  tags: CafeTag[];
  /** Whether the signed-in person has saved this cafe. */
  saved: boolean;
};

export type ReviewDrink = {
  drink_id: number;
  name: string;
  rating: number;
  milk: Milk | null;
  price_aud: number | null;
};

/** A photo on a review. `thumb_path` is null for photos from before thumbnails existed. */
export type ReviewPhoto = {
  path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
};

export type CafeReview = {
  review_id: string;
  user_id: string;
  author_name: string;
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
  /** In order, the first is the cover. Empty when the review has no photos. */
  photos: ReviewPhoto[];
};

/** Where the next page of reviews starts: the last row of the page before. */
export type ReviewCursor = { created_at: string; review_id: string };

export type CafePhoto = {
  path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
};

/** What the reviews list needs from a query, so the page can be tested without a network. */
export type ReviewsResult = {
  reviews: CafeReview[];
  isLoading: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
};
