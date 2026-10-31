import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { CAFE_REVIEWS_KEY } from "@/features/cafe/useCafeReviews";
import { SAVED_CAFES_KEY } from "@/features/cafe/useSaveCafe";
import { CAFES_IN_VIEW_KEY } from "@/features/map/useCafesInView";
import { MY_REVIEWS_KEY } from "@/features/profile/useMyReviews";
import { supabase } from "@/lib/supabase";
import type { BannedUser, ModerationAction, ModerationDetail, QueueItem } from "./types";

/** Every moderation query starts with this, so one invalidation refreshes them all. */
export const MODERATION_KEY = "moderation";

/** What hiding, restoring or banning changes outside moderation: anywhere reviews and scores show. */
const KEYS_TO_REFRESH = [
  MODERATION_KEY,
  MY_REVIEWS_KEY,
  SAVED_CAFES_KEY,
  CAFES_IN_VIEW_KEY,
  CAFE_REVIEWS_KEY,
  CAFE_DETAIL_KEY,
  "cafe-photos",
];

/**
 * Whether the signed-in person is a moderator. Asked once per session; the server checks the role
 * again on every moderation call, so this only decides what to show.
 */
export function useIsModerator() {
  const { session } = useAuth();
  const userId = session?.user.id;
  return useQuery({
    queryKey: [MODERATION_KEY, "is-moderator", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.rpc("is_moderator");
      if (error) throw error;
      return data === true;
    },
  });
}

/** How many reviews have open reports, for the Profile row. */
export function useModerationOpenCount(enabled: boolean) {
  return useQuery({
    queryKey: [MODERATION_KEY, "open-count"],
    enabled,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("moderation_open_count");
      if (error) throw error;
      return data;
    },
  });
}

/** Reported reviews (oldest report first) or hidden reviews (most recently hidden first). */
export function useModerationQueue(status: "open" | "hidden", enabled: boolean) {
  return useQuery({
    queryKey: [MODERATION_KEY, "queue", status],
    enabled,
    queryFn: async (): Promise<QueueItem[]> => {
      const { data, error } = await supabase.rpc("moderation_queue", { p_status: status });
      if (error) throw error;
      return (data ?? []) as unknown as QueueItem[];
    },
  });
}

export function useBannedUsers(enabled: boolean) {
  return useQuery({
    queryKey: [MODERATION_KEY, "banned"],
    enabled,
    queryFn: async (): Promise<BannedUser[]> => {
      const { data, error } = await supabase.rpc("moderation_banned_users");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** One review with its reports and author, for the Report screen. */
export function useModerationReview(reviewId: string | undefined) {
  return useQuery({
    queryKey: [MODERATION_KEY, "review", reviewId],
    enabled: !!reviewId,
    queryFn: async (): Promise<ModerationDetail> => {
      const { data, error } = await supabase.rpc("moderation_review", {
        p_review_id: reviewId as string,
      });
      if (error) throw error;
      return data as unknown as ModerationDetail;
    },
  });
}

export type ModerateArgs =
  | { action: "dismiss" | "hide" | "restore"; reviewId: string; note: string }
  | { action: "ban" | "unban"; userId: string; note: string };

/**
 * Takes a moderation action. Review actions are a database function; ban and unban go through the
 * `moderate-user` Edge Function, because the auth ban needs the admin API. A ban hides all the
 * person's reviews, the reported one included, so "Hide and ban" is a single call.
 */
export function useModerate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: ModerateArgs) => {
      const note = args.note.trim() || undefined;
      if ("userId" in args) {
        const { error } = await supabase.functions.invoke("moderate-user", {
          body: { userId: args.userId, action: args.action, note },
        });
        if (error) throw error;
        return;
      }
      const { error } = await supabase.rpc("moderate_review", {
        p_review_id: args.reviewId,
        p_action: args.action satisfies ModerationAction,
        p_note: note,
      });
      if (error) throw error;
    },
    onSettled: () => {
      for (const key of KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
