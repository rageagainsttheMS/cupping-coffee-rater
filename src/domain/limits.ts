/**
 * Every tunable number in one place. The database is authoritative: each constant names the SQL
 * that has to agree with it, so change both together.
 */

/** A metric's score is hidden until it has this many ratings. SQL: `scoring_constants().min_count`. */
export const MIN_RATINGS_FOR_SCORE = 3;

/** Star ratings run from 1 to 5 in half-star steps. SQL: the check constraint on every rating column. */
export const RATING_MIN = 1;
export const RATING_MAX = 5;
export const RATING_STEP = 0.5;

/** Review comment length. SQL: the check constraint on `reviews.comment`. */
export const COMMENT_MIN = 10;
export const COMMENT_MAX = 280;
