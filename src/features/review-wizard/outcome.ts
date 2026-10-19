import { MIN_RATINGS_FOR_SCORE } from "@/domain/limits";
import { METRICS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";

export type ScoreSnapshot = { score: number | null; count: number };

/** What `submit_review` and `update_review_ratings` return for the metrics a review touched. */
export type ScoreChanges = Partial<Record<Metric, ScoreSnapshot>>;

export type Movement = {
  metric: Metric;
  /** "New" or a score such as "4.2". */
  from: string;
  to: string;
  /** `unlocked`: it had no score and now has one. `pending`: still short of a score. */
  state: "unlocked" | "moved" | "unchanged" | "pending";
  /** Ratings still needed for a score, when `pending`. */
  remaining: number;
};

function visible(snapshot: ScoreSnapshot | undefined): number | null {
  if (!snapshot || snapshot.score === null || snapshot.count < MIN_RATINGS_FOR_SCORE) return null;
  return snapshot.score;
}

const label = (score: number | null, newLabel: string) =>
  score === null ? newLabel : score.toFixed(1);

/** How one review moved each metric it rated, for the "Posted" screen. */
export function describeMovements(
  before: ScoreChanges,
  after: ScoreChanges,
  newLabel: string,
): Movement[] {
  return METRICS.flatMap((metric): Movement[] => {
    const next = after[metric];
    if (!next) return [];
    const was = visible(before[metric]);
    const now = visible(next);
    const state =
      now === null
        ? "pending"
        : was === null
          ? "unlocked"
          : was.toFixed(1) === now.toFixed(1)
            ? "unchanged"
            : "moved";
    return [
      {
        metric,
        from: label(was, newLabel),
        to: label(now, newLabel),
        state,
        remaining: Math.max(0, MIN_RATINGS_FOR_SCORE - next.count),
      },
    ];
  });
}
