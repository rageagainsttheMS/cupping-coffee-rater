import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "./http.ts";

export const MODERATION_NOTE_MAX = 500;

/** Bans are permanent until a moderator lifts them. The auth API wants a duration, so: 100 years. */
export const BAN_DURATION = "876000h";

export const moderateUserInputSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["ban", "unban"]),
  note: z.string().max(MODERATION_NOTE_MAX).optional(),
});

export type ModerateUserInput = z.infer<typeof moderateUserInputSchema>;

/** What banning touches. Injected so it can be tested. */
export type ModerationStore = {
  /** True when the person has the moderator role and is not banned themselves. */
  isModerator: (userId: string) => Promise<boolean>;
  /** Sets or lifts the auth ban. A banned account cannot sign in or refresh its session. */
  setBanned: (userId: string, banned: boolean) => Promise<void>;
  /** Hides the person's reviews and logs the ban. Returns how many reviews it hid. */
  applyBan: (userId: string, moderatorId: string, note: string | null) => Promise<number>;
  /** Restores the reviews the ban hid and logs the unban. Returns how many it restored. */
  liftBan: (userId: string, moderatorId: string, note: string | null) => Promise<number>;
};

type AuthUser = { app_metadata?: Record<string, unknown>; banned_until?: string | null };

/** The same rule as `public.is_moderator()` in the database. */
export function isActiveModerator(user: AuthUser, now: Date): boolean {
  if (user.app_metadata?.role !== "moderator") return false;
  return !user.banned_until || new Date(user.banned_until) <= now;
}

/**
 * Bans or unbans a person. The auth ban goes first, so a banned person is locked out even if hiding
 * their reviews then fails; both steps are safe to repeat, so a failed request can be sent again.
 */
export async function moderateUser(
  input: ModerateUserInput,
  moderatorId: string,
  store: ModerationStore,
): Promise<{ banned: boolean; reviews: number }> {
  if (!(await store.isModerator(moderatorId))) throw new HttpError(403, "forbidden");
  if (input.userId === moderatorId) throw new HttpError(400, "cannot_ban_self");
  const note = input.note?.trim() || null;

  if (input.action === "ban") {
    if (await store.isModerator(input.userId)) throw new HttpError(400, "target_is_moderator");
    await store.setBanned(input.userId, true);
    return { banned: true, reviews: await store.applyBan(input.userId, moderatorId, note) };
  }

  await store.setBanned(input.userId, false);
  return { banned: false, reviews: await store.liftBan(input.userId, moderatorId, note) };
}

/** The ModerationStore backed by Supabase, using the service role client. */
export function createModerationStore(db: SupabaseClient): ModerationStore {
  return {
    async isModerator(userId) {
      const { data, error } = await db.auth.admin.getUserById(userId);
      if (error) {
        if (error.status === 404) return false;
        throw error;
      }
      return isActiveModerator(data.user, new Date());
    },

    async setBanned(userId, banned) {
      const { error } = await db.auth.admin.updateUserById(userId, {
        ban_duration: banned ? BAN_DURATION : "none",
      });
      if (error) {
        if (error.status === 404) throw new HttpError(404, "user_not_found");
        throw error;
      }
    },

    async applyBan(userId, moderatorId, note) {
      const { data, error } = await db.rpc("apply_ban", {
        p_user_id: userId,
        p_moderator_id: moderatorId,
        p_note: note,
      });
      if (error) throw error;
      return data as number;
    },

    async liftBan(userId, moderatorId, note) {
      const { data, error } = await db.rpc("lift_ban", {
        p_user_id: userId,
        p_moderator_id: moderatorId,
        p_note: note,
      });
      if (error) throw error;
      return data as number;
    },
  };
}
