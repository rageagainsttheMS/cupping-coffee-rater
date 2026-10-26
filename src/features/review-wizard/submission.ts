import { METRICS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { dropInactiveTagIds } from "@/domain/reference";
import type { ReferenceTag } from "@/domain/reference";
import { reviewSchema } from "@/domain/review.schema";
import type { ReviewInput } from "@/domain/review.schema";
import type { WizardValues } from "./types";

type Location = { lat: number; lng: number };
type UploadedPhoto = { path: string; thumbPath?: string; width: number; height: number };

/** Metrics the review rates. Coffee always is: the wizard cannot continue without it. */
function ratedMetrics(values: WizardValues): Set<Metric> {
  const rated = new Set<Metric>(["coffee"]);
  for (const metric of METRICS) {
    if (metric !== "coffee" && values[metric] !== null) rated.add(metric);
  }
  return rated;
}

/** Tags that are still active and belong to a metric the review rates. The server rejects the rest. */
export function usableTagIds(values: WizardValues, tags: readonly ReferenceTag[]): number[] {
  const rated = ratedMetrics(values);
  const metricOf = new Map(tags.map((t) => [t.id, t.metric]));
  return dropInactiveTagIds(values.tagIds, tags).filter((id) => {
    const metric = metricOf.get(id);
    return metric !== undefined && rated.has(metric);
  });
}

/**
 * Turns the form into the shared review shape and checks it with the review schema. Tags are kept
 * only if they are still active and belong to a metric that was rated: the server rejects the rest,
 * and a person who tapped "Didn't try" after picking tags should not see an error for it.
 */
export function buildReviewInput(
  values: WizardValues,
  tags: readonly ReferenceTag[],
  extras: { location?: Location | null; photos?: UploadedPhoto[] } = {},
) {
  const tagIds = usableTagIds(values, tags);

  const drinks = values.drinks.flatMap((d) =>
    d.drinkId === null || d.rating === null
      ? []
      : [
          {
            drinkId: d.drinkId,
            rating: d.rating,
            ...(d.milk ? { milk: d.milk } : {}),
            ...(d.priceAud !== null ? { priceAud: d.priceAud } : {}),
          },
        ],
  );

  const beans = values.beans.trim();
  return reviewSchema.safeParse({
    reviewId: values.reviewId,
    cafeId: values.cafe?.id,
    drinks,
    food: values.food,
    vibe: values.vibe,
    work: values.work,
    tagIds,
    comment: values.comment,
    ...(beans ? { beans } : {}),
    ...(extras.photos?.length ? { photos: extras.photos } : {}),
    ...(extras.location ? { location: extras.location } : {}),
  });
}

/** The arguments of the `submit_review` function. Metrics marked "Didn't try" are left out. */
export function toSubmitArgs(input: ReviewInput) {
  return {
    p_review_id: input.reviewId,
    p_cafe_id: input.cafeId,
    p_drinks: input.drinks.map((d) => ({
      drink_id: d.drinkId,
      rating: d.rating,
      milk: d.milk,
      price_aud: d.priceAud,
    })),
    p_food: input.food ?? undefined,
    p_vibe: input.vibe ?? undefined,
    p_work: input.work ?? undefined,
    p_tags: input.tagIds,
    p_comment: input.comment,
    p_beans: input.beans,
    p_photos: (input.photos ?? []).map((p) => ({
      path: p.path,
      thumb_path: p.thumbPath ?? null,
      width: p.width,
      height: p.height,
    })),
    p_lat: input.location?.lat,
    p_lng: input.location?.lng,
  };
}
