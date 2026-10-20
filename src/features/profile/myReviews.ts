import { METRICS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { formatPrice, reviewMetricRating } from "@/features/cafe/format";
import { copy } from "@/lib/copy/en";
import type { MyReview, MyReviewsMode } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The review's rating for one metric. Coffee is the best of the drinks. */
export function metricRating(review: MyReview, metric: Metric): number | null {
  return reviewMetricRating(review, metric, null);
}

/** The average of every metric the review rated, used to order "Highest rated". */
export function overallRating(review: MyReview): number {
  const rated = METRICS.flatMap((metric) => {
    const rating = metricRating(review, metric);
    return rating === null ? [] : [rating];
  });
  return rated.length === 0 ? 0 : rated.reduce((sum, r) => sum + r, 0) / rated.length;
}

const byNewest = (a: MyReview, b: MyReview) =>
  b.created_at.localeCompare(a.created_at) || b.review_id.localeCompare(a.review_id);

/** Filters and orders the list for the chosen chip. */
export function arrangeReviews(reviews: readonly MyReview[], mode: MyReviewsMode): MyReview[] {
  switch (mode) {
    case "newest":
      return [...reviews].sort(byNewest);
    case "highest":
      return [...reviews].sort((a, b) => overallRating(b) - overallRating(a) || byNewest(a, b));
    case "cafe":
      return [...reviews].sort((a, b) => a.cafe_name.localeCompare(b.cafe_name) || byNewest(a, b));
    case "photo":
      return reviews.filter((r) => r.photo_path !== null).sort(byNewest);
  }
}

/** How many reviews, and across how many different cafes. */
export function reviewStats(reviews: readonly MyReview[]): { reviews: number; cafes: number } {
  return { reviews: reviews.length, cafes: new Set(reviews.map((r) => r.cafe_id)).size };
}

/** "2 days ago", "last week", "3 weeks ago". Whole calendar days, so a late-night review is still "yesterday". */
export function relativeAge(isoTimestamp: string, now: Date): string {
  const then = new Date(isoTimestamp);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.max(0, Math.round((startOfDay(now) - startOfDay(then)) / DAY_MS));
  const ago = copy.profile.myReviews.ago;
  if (days === 0) return ago.today;
  if (days === 1) return ago.yesterday;
  if (days < 7) return ago.days(days);
  if (days < 14) return ago.lastWeek;
  if (days < 30) return ago.weeks(Math.floor(days / 7));
  if (days < 60) return ago.lastMonth;
  if (days < 365) return ago.months(Math.floor(days / 30));
  return days < 730 ? ago.lastYear : ago.years(Math.floor(days / 365));
}

/** "$5.80 · Single origin Ethiopian": the prices reported for the drinks, then the beans. */
export function detailsLine(review: MyReview): string {
  const prices = review.drinks.flatMap((d) =>
    d.price_aud === null ? [] : [formatPrice(d.price_aud)],
  );
  return [prices.join(", "), review.beans ?? ""].filter(Boolean).join(" · ");
}
