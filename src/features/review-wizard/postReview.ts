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

/** Where photo `index` of a review lives. Files stay flat in the person's folder, so deleting an account finds them. */
export function photoPaths(userId: string, reviewId: string, index: number) {
  const base = `${userId}/${reviewId}_${index}`;
  return { path: `${base}.jpg`, thumbPath: `${base}_t.jpg` };
}

async function removeFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await supabase.storage
    .from(PHOTO_BUCKET)
    .remove(paths)
    .catch(() => {});
}

/**
 * Posts a review: location, then the photos, then `submit_review`. The photos and their thumbnails
 * upload in parallel. If any upload fails, or the function fails after they went up, every file is
 * deleted so nothing is left behind. Retrying is safe: the same review id and paths are reused, and
 * the uploads overwrite.
 */
export async function postReview(args: {
  values: WizardValues;
  tags: readonly ReferenceTag[];
  userId: string;
  /** Skip the photos, details and all, for "Skip and post". */
  withoutDetails?: boolean;
}): Promise<PostResult> {
  const { userId, tags } = args;
  const values: WizardValues = args.withoutDetails
    ? {
        ...args.values,
        beans: "",
        photos: [],
        drinks: args.values.drinks.map((d) => ({ ...d, priceAud: null })),
      }
    : args.values;

  const location = await currentLocation();

  const planned = values.photos.map((photo, index) => {
    const { path, thumbPath } = photoPaths(userId, values.reviewId, index);
    return { photo, path, thumbPath: photo.thumbUri ? thumbPath : undefined };
  });
  const parsed = buildReviewInput(values, tags, {
    location,
    photos: planned.map(({ photo, path, thumbPath }) => ({
      path,
      thumbPath,
      width: photo.width,
      height: photo.height,
    })),
  });
  if (!parsed.success) throw new InvalidReviewError();

  const uploaded = planned.flatMap(({ photo, path, thumbPath }) => [
    { uri: photo.uri, path },
    ...(thumbPath && photo.thumbUri ? [{ uri: photo.thumbUri, path: thumbPath }] : []),
  ]);
  const files = uploaded.map((f) => f.path);
  try {
    await Promise.all(uploaded.map((f) => uploadPhoto(f.uri, f.path)));
  } catch (error) {
    await removeFiles(files);
    throw error;
  }

  const { data, error } = await supabase.rpc("submit_review", toSubmitArgs(parsed.data));
  if (error) {
    await removeFiles(files);
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
