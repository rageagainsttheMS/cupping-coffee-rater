import { z } from "zod";
import { MILKS } from "@/domain/drinks";
import { MAX_PHOTOS } from "@/domain/review.schema";
import { dropInactiveTagIds } from "@/domain/reference";
import type { ReferenceTag } from "@/domain/reference";
import { blankValues, WIZARD_STEPS } from "./types";
import type { WizardStep, WizardValues } from "./types";

export const DRAFT_KEY = "review-draft:v1";
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type DraftStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};

/** What is saved: the form, where the person was, and when. */
export type StoredDraft = {
  values: WizardValues;
  step: WizardStep;
  drinkIndex: number;
  savedAt: number;
};

const rating = z.number().min(1).max(5).nullable();

const photoSchema = z.object({
  uri: z.string(),
  width: z.number(),
  height: z.number(),
  thumbUri: z.string().optional(),
});

// Loose on purpose: a draft is the person's work in progress, so only the shape is checked here.
// The full review rules run when it is posted.
const draftSchema = z.object({
  version: z.literal(1),
  savedAt: z.number(),
  step: z.enum(WIZARD_STEPS),
  drinkIndex: z.number().int().min(0),
  values: z.object({
    reviewId: z.string().min(1),
    cafe: z
      .object({
        id: z.string().min(1),
        name: z.string(),
        suburb: z.string().nullable(),
        lat: z.number(),
        lng: z.number(),
      })
      .nullable(),
    drinks: z
      .array(
        z.object({
          drinkId: z.number().int().nullable(),
          milk: z.enum(MILKS).nullable(),
          rating,
          priceAud: z.number().nullable(),
        }),
      )
      .min(1),
    food: rating,
    vibe: rating,
    work: rating,
    tagIds: z.array(z.number().int()),
    comment: z.string(),
    beans: z.string(),
    // Drafts saved before multiple photos hold a single `photo` instead of the list.
    photo: photoSchema.nullable().optional(),
    photos: z.array(photoSchema).max(MAX_PHOTOS).optional(),
  }),
});

export async function saveDraft(
  storage: DraftStorage,
  draft: Omit<StoredDraft, "savedAt">,
  now: number = Date.now(),
): Promise<void> {
  try {
    await storage.setItem(DRAFT_KEY, JSON.stringify({ version: 1, savedAt: now, ...draft }));
  } catch {
    // A draft that fails to save must never get in the way of writing the review.
  }
}

export async function clearDraft(storage: DraftStorage): Promise<void> {
  try {
    await storage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do. A stale draft is discarded by age on the next open anyway.
  }
}

/**
 * The saved draft, or null when there is none, it is unreadable or it is older than 24 hours.
 * Tags that have been retired since are dropped, so the person never posts a tag the server rejects.
 */
export async function loadDraft(
  storage: DraftStorage,
  tags: readonly ReferenceTag[],
  now: number = Date.now(),
): Promise<StoredDraft | null> {
  let raw: string | null;
  try {
    raw = await storage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = draftSchema.safeParse(json);
  if (!parsed.success) return null;

  const { savedAt, step, values } = parsed.data;
  const age = now - savedAt;
  if (age < 0 || age >= DRAFT_MAX_AGE_MS) return null;

  const drinkIndex = Math.min(parsed.data.drinkIndex, values.drinks.length - 1);
  const { photo, photos, ...rest } = values;
  return {
    savedAt,
    step,
    drinkIndex,
    values: {
      ...blankValues(values.reviewId),
      ...rest,
      photos: photos ?? (photo ? [photo] : []),
      tagIds: dropInactiveTagIds(values.tagIds, tags),
    },
  };
}
