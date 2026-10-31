import { copy } from "@/lib/copy/en";
import { MIN_RATINGS_FOR_SCORE, RATING_MAX, RATING_MIN, RATING_STEP } from "./limits";

export type ScoreBand = "low" | "mid" | "high" | "none";

/** 1 to 5 in half-star steps. Mirrors the database check constraint. */
export function isValidRating(rating: number): boolean {
  return (
    Number.isFinite(rating) &&
    rating >= RATING_MIN &&
    rating <= RATING_MAX &&
    Number.isInteger(rating / RATING_STEP)
  );
}

/** "4.2 (18)", or "New" while a metric has no ratings. */
export function formatScore(score: number | null, count: number): string {
  if (score === null || count < MIN_RATINGS_FOR_SCORE) return copy.score.new;
  return `${score.toFixed(1)} (${count})`;
}

/** Colour band for pins and tiles. `none` is the neutral grey for "New" and "Rate first". */
export function scoreBand(score: number | null): ScoreBand {
  if (score === null) return "none";
  if (score < 3.5) return "low";
  if (score < 4.3) return "mid";
  return "high";
}
