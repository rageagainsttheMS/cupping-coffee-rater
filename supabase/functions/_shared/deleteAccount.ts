import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/** The person must send the word, so a stray request cannot delete an account. */
export const deleteAccountInputSchema = z.object({ confirm: z.literal("DELETE") });

const PHOTO_BUCKET = "review-photos";
const PAGE = 100;

/** What deleting an account touches outside the database tables. Injected so it can be tested. */
export type AccountStore = {
  /** Every photo the user uploaded, as bucket paths (`<user_id>/<review_id>.jpg`). */
  listPhotoPaths: (userId: string) => Promise<string[]>;
  removePhotos: (paths: string[]) => Promise<void>;
  /** Deletes the auth user. The database removes the profile, reviews, saved cafes, blocks and reports with it. */
  deleteUser: (userId: string) => Promise<void>;
};

/**
 * Deletes everything about a person. Photos go first, because once the user row is gone nothing
 * points at them any more. If a step fails the request fails and can simply be tried again: the
 * photo list is read afresh each time and deleting a missing user is the last step.
 */
export async function deleteAccount(
  userId: string,
  store: AccountStore,
): Promise<{ deleted: true; photos: number }> {
  const paths = await store.listPhotoPaths(userId);
  if (paths.length > 0) await store.removePhotos(paths);
  await store.deleteUser(userId);
  return { deleted: true, photos: paths.length };
}

/** The AccountStore backed by Supabase, using the service role client. */
export function createAccountStore(db: SupabaseClient): AccountStore {
  return {
    async listPhotoPaths(userId) {
      const paths: string[] = [];
      for (let offset = 0; ; offset += PAGE) {
        const { data, error } = await db.storage
          .from(PHOTO_BUCKET)
          .list(userId, { limit: PAGE, offset });
        if (error) throw error;
        for (const file of data) if (file.name) paths.push(`${userId}/${file.name}`);
        if (data.length < PAGE) return paths;
      }
    },

    async removePhotos(paths) {
      for (let i = 0; i < paths.length; i += PAGE) {
        const { error } = await db.storage.from(PHOTO_BUCKET).remove(paths.slice(i, i + PAGE));
        if (error) throw error;
      }
    },

    async deleteUser(userId) {
      const { error } = await db.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
  };
}
