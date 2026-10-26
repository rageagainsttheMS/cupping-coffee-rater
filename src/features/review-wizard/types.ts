import type { Milk } from "@/domain/drinks";

/** The cafe being reviewed, with what the later steps need (name for the pill, position for distance). */
export type WizardCafe = {
  id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
};

/** One drink in the visit. Steps 2 and 3 repeat for each. */
export type DraftDrink = {
  drinkId: number | null;
  milk: Milk | null;
  rating: number | null;
  /** Null until the person changes the stepper. The pre-filled median is a suggestion, not data. */
  priceAud: number | null;
};

/**
 * A photo already resized on the phone, waiting to upload when the review is posted. The thumbnail is
 * a small copy for lists. Photos saved in a draft before thumbnails existed have none.
 */
export type WizardPhoto = { uri: string; width: number; height: number; thumbUri?: string };

/** Everything the wizard collects. Null means "not chosen" or "didn't try". */
export type WizardValues = {
  reviewId: string;
  cafe: WizardCafe | null;
  drinks: DraftDrink[];
  food: number | null;
  vibe: number | null;
  work: number | null;
  /** Quick tags for every rated metric. Coffee, Food, Vibe and Work share the one list. */
  tagIds: number[];
  comment: string;
  beans: string;
  /** Up to MAX_PHOTOS, the first is the cover. */
  photos: WizardPhoto[];
};

export const WIZARD_STEPS = ["cafe", "drink", "rate", "extras", "comment", "details"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const BLANK_DRINK: DraftDrink = { drinkId: null, milk: null, rating: null, priceAud: null };

export function blankValues(reviewId: string, cafe: WizardCafe | null = null): WizardValues {
  return {
    reviewId,
    cafe,
    drinks: [{ ...BLANK_DRINK }],
    food: null,
    vibe: null,
    work: null,
    tagIds: [],
    comment: "",
    beans: "",
    photos: [],
  };
}
