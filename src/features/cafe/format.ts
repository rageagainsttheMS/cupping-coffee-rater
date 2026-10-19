import { MIN_RATINGS_FOR_SCORE } from "@/domain/limits";
import type { Metric } from "@/domain/metrics";
import type { PlaceDetails } from "@/lib/places";
import type { CafeDrink, CafeReview, CafeTag } from "./types";

/** The most tags a summary shows before "Show all". */
export const TAG_PREVIEW_COUNT = 6;

/** The most drinks What to order shows before "Show all". */
export const DRINK_PREVIEW_COUNT = 3;

/** A tag's count is shown from the first report, most common first. */
export function tagsForMetric(tags: readonly CafeTag[], metric: Metric): CafeTag[] {
  return tags.filter((t) => t.metric === metric).sort((a, b) => b.count - a.count);
}

/** "$5.80". */
export function formatPrice(aud: number): string {
  return `$${aud.toFixed(2)}`;
}

/** A drink's score is hidden under 3 ratings, as on every other score. */
export function drinkScore(drink: CafeDrink): number | null {
  return drink.score !== null && drink.rating_count >= MIN_RATINGS_FOR_SCORE ? drink.score : null;
}

/**
 * The Google rating stands in for "New" on the Coffee tile only, and only while the cafe has no
 * community coffee score. It is never mixed into a community score.
 */
export function googleFallbackRating(
  metric: Metric,
  score: number | null,
  count: number,
  google: Pick<PlaceDetails, "rating"> | null | undefined,
): number | null {
  if (metric !== "coffee") return null;
  if (score !== null && count >= MIN_RATINGS_FOR_SCORE) return null;
  return google?.rating ?? null;
}

export type OpenStatus = { kind: "open"; until: string | null } | { kind: "closed" };

/** "4:00 PM" to "4pm", "4:30 PM" to "4:30pm". Null for anything else, such as a 24-hour time. */
function shortTime(text: string): string | null {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(text.trim());
  if (!match) return null;
  const minutes = match[2] && match[2] !== "00" ? `:${match[2]}` : "";
  return `${Number(match[1])}${minutes}${match[3].toLowerCase()}`;
}

/** The closing time in a line such as "Monday: 7:00 AM – 4:00 PM", or null if it can't be read. */
function closingTime(description: string): string | null {
  const hours = description.slice(description.indexOf(":") + 1).replace(/[   ]/g, " ");
  const lastRange = hours.split(",").pop() ?? "";
  const end = lastRange.split(/\s[–—-]\s/).pop() ?? "";
  return shortTime(end);
}

/**
 * Open or closed from the live Google details. When open, adds the closing time if today's hours
 * can be read. Google lists the week from Monday.
 */
export function openStatus(
  details: Pick<PlaceDetails, "open_now" | "weekday_descriptions"> | null | undefined,
  now: Date = new Date(),
): OpenStatus | null {
  if (!details || details.open_now === null) return null;
  if (!details.open_now) return { kind: "closed" };
  const today = details.weekday_descriptions?.[(now.getDay() + 6) % 7];
  return { kind: "open", until: today ? closingTime(today) : null };
}

/** The maps link from Google, else a link that opens the phone's own maps app. */
export function directionsUrl(
  cafe: { name: string; lat: number; lng: number },
  mapsUri: string | null | undefined,
  os: string,
): string {
  if (mapsUri) return mapsUri;
  const name = encodeURIComponent(cafe.name);
  if (os === "ios") return `maps://?q=${name}&ll=${cafe.lat},${cafe.lng}`;
  if (os === "android") return `geo:${cafe.lat},${cafe.lng}?q=${cafe.lat},${cafe.lng}(${name})`;
  return `https://www.google.com/maps/search/?api=1&query=${cafe.lat},${cafe.lng}`;
}

/**
 * A review's rating for one metric. Coffee is the drinks' ratings: the filtered drink's if one is
 * chosen, else the best of them.
 */
export function reviewMetricRating(
  review: Pick<CafeReview, "drinks" | "ratings">,
  metric: Metric,
  drinkId: number | null,
): number | null {
  if (metric !== "coffee") return review.ratings[metric] ?? null;
  const drinks =
    drinkId === null ? review.drinks : review.drinks.filter((d) => d.drink_id === drinkId);
  return drinks.length > 0 ? Math.max(...drinks.map((d) => d.rating)) : null;
}

/** The other metrics this review rated, for the small icons beside the main rating. */
export function otherRatings(
  review: Pick<CafeReview, "drinks" | "ratings">,
  metric: Metric,
  metrics: readonly Metric[],
): { metric: Metric; rating: number }[] {
  return metrics
    .filter((m) => m !== metric)
    .flatMap((m) => {
      const rating = reviewMetricRating(review, m, null);
      return rating === null ? [] : [{ metric: m, rating }];
    });
}

/** "18 Oct 2026" from a `YYYY-MM-DD` date, without a time zone shift. */
export function formatVisitDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
