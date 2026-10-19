import { RATING_MAX, RATING_MIN, RATING_STEP } from "./limits";

const STAR_COUNT = 5;

/**
 * The rating under a finger at horizontal position `x` in a row of five equal stars `width` wide.
 * Tapping the left half of a star gives a half step, the right half the whole star, so a drag
 * sweeps through every half step. Results stay between 1 and 5, as the database requires.
 */
export function ratingFromPosition(x: number, width: number): number {
  if (!(width > 0) || !Number.isFinite(x)) return RATING_MIN;
  const halfStarWidth = width / (STAR_COUNT * 2);
  const rating = Math.ceil(x / halfStarWidth) * RATING_STEP;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, rating));
}

/** One half step up or down, for screen readers and keyboards. Starts in the middle when unrated. */
export function stepRating(current: number | null, direction: 1 | -1): number {
  if (current === null) return 3;
  const next = current + direction * RATING_STEP;
  return Math.min(RATING_MAX, Math.max(RATING_MIN, next));
}
