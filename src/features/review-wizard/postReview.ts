import * as Location from "expo-location";
import type { ReferenceTag } from "@/domain/reference";
import { supabase } from "@/lib/supabase";
import { buildEditInput, toUpdateArgs } from "./edit";
import { PhotoUploadError } from "./errors";
import type { ScoreChanges } from "./outcome";
import { buildReviewInput, toSubmitArgs } from "./submission";
import type { WizardValues } from "./types";

const PHOTO_BUCKET = "review-photos";
const LOCATION_TIMEOUT_MS = 4000;

/** What `submit_review` returns. */
export type PostResult = {
  review_id: string;
  verified: boolean;
  before: ScoreChanges;
  after: ScoreChanges;
};

/** Raised when the review itself is not valid. The wizard stops this earlier, so it should not happen. */
export class InvalidReviewError extends Error {
  constructor() {
    super("invalid_review");
    this.name = "InvalidReviewError";
  }
}

/**
 * A fresh position for the verified-visit check, or null. Never blocks posting: no permission, no
 * fix within a few seconds, or any error all mean the review is posted without a location.
 */
export async function currentLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS)),
    ]);
    return fix ? { lat: fix.coords.latitude, lng: fix.coords.longitude } : null;
  } catch {
    return null;
  }
}

async function uploadPhoto(uri: string, path: string): Promise<void> {
  try {
    const body = await (await fetch(uri)).arrayBuffer();
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, body, { contentType: "image/jpeg", upsert: true });
    if (error) throw error;
  } catch {
    throw new PhotoUploadError();
  }
}

/**
 * Posts a review: location, then the photo, then `submit_review`. If the function fails after the
 * photo went up, the photo is deleted so nothing is left behind. Retrying is safe: the same review
 * id and photo path are reused, and the upload overwrites.
 */
export async function postReview(args: {
  values: WizardValues;
  tags: readonly ReferenceTag[];
  userId: string;
  /** Skip the photo, details and all, for "Skip and post". */
  withoutDetails?: boolean;
}): Promise<PostResult> {
  const { userId, tags } = args;
  const values: WizardValues = args.withoutDetails
    ? {
        ...args.values,
        beans: "",
        photo: null,
        drinks: args.values.drinks.map((d) => ({ ...d, priceAud: null })),
      }
    : args.values;

  const location = await currentLocation();

  const photoPath = values.photo ? `${userId}/${values.reviewId}.jpg` : null;
  const parsed = buildReviewInput(values, tags, {
    location,
    photo:
      values.photo && photoPath
        ? { path: photoPath, width: values.photo.width, height: values.photo.height }
        : null,
  });
  if (!parsed.success) throw new InvalidReviewError();

  if (values.photo && photoPath) await uploadPhoto(values.photo.uri, photoPath);

  const { data, error } = await supabase.rpc("submit_review", toSubmitArgs(parsed.data));
  if (error) {
    if (photoPath)
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove([photoPath])
        .catch(() => {});
    throw error;
  }
  return data as unknown as PostResult;
}

/** What `update_review_ratings` returns. */
export type UpdateResult = { review_id: string; before: ScoreChanges; after: ScoreChanges };

/** Adds or changes Food, Vibe and Work on a review that was just posted. */
export async function updateRatings(args: {
  values: WizardValues;
  tags: readonly ReferenceTag[];
}): Promise<UpdateResult> {
  const { values, tags } = args;
  const rated = new Set(
    (["food", "vibe", "work"] as const).filter((metric) => values[metric] !== null),
  );
  const active = new Set(tags.filter((t) => t.active && t.metric !== "coffee").map((t) => t.id));
  const metricOf = new Map(tags.map((t) => [t.id, t.metric]));
  // Coffee tags were already saved with the review. Only the extras' tags are sent here.
  const tagIds = values.tagIds.filter((id) => {
    const metric = metricOf.get(id);
    return active.has(id) && metric !== undefined && metric !== "coffee" && rated.has(metric);
  });

  const { data, error } = await supabase.rpc("update_review_ratings", {
    p_review_id: values.reviewId,
    p_food: values.food ?? undefined,
    p_vibe: values.vibe ?? undefined,
    p_work: values.work ?? undefined,
    p_tags: tagIds,
  });
  if (error) throw error;
  return data as unknown as UpdateResult;
}

/** Saves an edited review's ratings, tags and comment. Nothing else about the review can change. */
export async function editReview(args: {
  values: WizardValues;
  tags: readonly ReferenceTag[];
}): Promise<UpdateResult> {
  const parsed = buildEditInput(args.values, args.tags);
  if (!parsed.success) throw new InvalidReviewError();
  const { data, error } = await supabase.rpc("update_review", toUpdateArgs(parsed.data));
  if (error) throw error;
  return data as unknown as UpdateResult;
}
