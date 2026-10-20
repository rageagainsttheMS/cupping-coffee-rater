import { reviewEditSchema } from "@/domain/review.schema";
import type { ReviewEditInput } from "@/domain/review.schema";
import type { ReferenceTag } from "@/domain/reference";
import type { MyReview } from "@/features/profile/types";
import { usableTagIds } from "./submission";
import type { WizardStep, WizardValues } from "./types";

/**
 * Editing a review reuses three of the wizard's screens: the drink ratings, Food/Vibe/Work, and the
 * comment. The cafe, drinks, price, beans and photo cannot change, so those steps are skipped.
 */
export const EDIT_STEPS = ["rate", "extras", "comment"] as const satisfies readonly WizardStep[];

/** "Step 2 of 3" counts from 1. */
export function editStepNumber(step: WizardStep): number {
  const index = (EDIT_STEPS as readonly WizardStep[]).indexOf(step);
  return index === -1 ? 1 : index + 1;
}

/** The form's starting values for a review that is being edited. */
export function reviewToValues(review: MyReview): WizardValues {
  return {
    reviewId: review.review_id,
    cafe: { id: review.cafe_id, name: review.cafe_name, suburb: review.suburb, lat: 0, lng: 0 },
    drinks: review.drinks.map((d) => ({
      drinkId: d.drink_id,
      milk: d.milk,
      rating: d.rating,
      priceAud: d.price_aud,
    })),
    food: review.ratings.food ?? null,
    vibe: review.ratings.vibe ?? null,
    work: review.ratings.work ?? null,
    tagIds: review.tags.map((t) => t.tag_id),
    comment: review.comment,
    beans: review.beans ?? "",
    photo: null,
  };
}

/** Checks the edited form with the shared schema. Tags that are retired or unrated are dropped. */
export function buildEditInput(values: WizardValues, tags: readonly ReferenceTag[]) {
  return reviewEditSchema.safeParse({
    reviewId: values.reviewId,
    drinks: values.drinks.flatMap((d) =>
      d.drinkId === null || d.rating === null ? [] : [{ drinkId: d.drinkId, rating: d.rating }],
    ),
    food: values.food,
    vibe: values.vibe,
    work: values.work,
    tagIds: usableTagIds(values, tags),
    comment: values.comment,
  });
}

/** The arguments of the `update_review` function. A null rating means "Didn't try". */
export function toUpdateArgs(input: ReviewEditInput) {
  return {
    p_review_id: input.reviewId,
    p_drinks: input.drinks.map((d) => ({ drink_id: d.drinkId, rating: d.rating })),
    p_food: input.food ?? undefined,
    p_vibe: input.vibe ?? undefined,
    p_work: input.work ?? undefined,
    p_tags: input.tagIds,
    p_comment: input.comment,
  };
}

/** The part of the form an edit can change, in a fixed order, for comparing two forms. */
function editable(values: WizardValues) {
  return {
    drinks: values.drinks.map((d) => [d.drinkId, d.rating]),
    food: values.food,
    vibe: values.vibe,
    work: values.work,
    tagIds: [...values.tagIds].sort((a, b) => a - b),
    comment: values.comment.trim(),
  };
}

/** Whether the person changed anything, so a save with nothing new does not mark the review Edited. */
export function hasChanges(initial: WizardValues, current: WizardValues): boolean {
  return JSON.stringify(editable(initial)) !== JSON.stringify(editable(current));
}

export type EditNext = { to: WizardStep | "save"; drinkIndex: number };

/** Where Continue goes while editing: through each drink, then Food/Vibe/Work, then the comment. */
export function editNext(step: WizardStep, drinkIndex: number, drinkCount: number): EditNext {
  switch (step) {
    case "rate":
      return drinkIndex < drinkCount - 1
        ? { to: "rate", drinkIndex: drinkIndex + 1 }
        : { to: "extras", drinkIndex };
    case "extras":
      return { to: "comment", drinkIndex };
    default:
      return { to: "save", drinkIndex };
  }
}

export type EditBack = { to: WizardStep | "close"; drinkIndex: number };

/** Where back goes while editing. From the first drink it leaves the edit. */
export function editBack(step: WizardStep, drinkIndex: number, drinkCount: number): EditBack {
  switch (step) {
    case "comment":
      return { to: "extras", drinkIndex };
    case "extras":
      return { to: "rate", drinkIndex: Math.max(0, drinkCount - 1) };
    default:
      return drinkIndex > 0
        ? { to: "rate", drinkIndex: drinkIndex - 1 }
        : { to: "close", drinkIndex };
  }
}
