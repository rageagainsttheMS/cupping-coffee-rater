import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/AuthProvider";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { CAFE_REVIEWS_KEY } from "@/features/cafe/useCafeReviews";
import { supabase } from "@/lib/supabase";
import type { ReportReason } from "./reports";

export const BLOCKED_USERS_KEY = "blocked-users";

/** What a block changes: the reviews and photos the blocker can see, and the cafe page's tags. */
const KEYS_TO_REFRESH = [CAFE_REVIEWS_KEY, "cafe-photos", CAFE_DETAIL_KEY, BLOCKED_USERS_KEY];

/** Files a report. Reports can't be read back, so the insert asks for no row in return. */
export function useReportReview() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (args: { reviewId: string; reason: ReportReason; details: string }) => {
      if (!userId) throw new Error("not_signed_in");
      const details = args.details.trim();
      const { error } = await supabase.from("review_reports").insert({
        review_id: args.reviewId,
        reporter_id: userId,
        reason: args.reason,
        ...(details ? { details } : {}),
      });
      if (error) throw error;
    },
  });
}

/** Blocks a person: their reviews and photos disappear for the blocker straight away. */
export function useBlockUser() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!userId) throw new Error("not_signed_in");
      const { error } = await supabase
        .from("user_blocks")
        .upsert({ blocker_id: userId, blocked_id: blockedId });
      if (error) throw error;
    },
    onSettled: () => {
      for (const key of KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (blockedId: string) => {
      if (!userId) throw new Error("not_signed_in");
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", blockedId);
      if (error) throw error;
    },
    onSettled: () => {
      for (const key of KEYS_TO_REFRESH) void queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}

export type BlockedUser = { id: string; name: string | null; blockedAt: string };

/** The people the signed-in person has blocked, most recent first. */
export function useBlockedUsers() {
  const { session } = useAuth();
  return useQuery({
    queryKey: [BLOCKED_USERS_KEY],
    enabled: !!session,
    queryFn: async (): Promise<BlockedUser[]> => {
      const { data, error } = await supabase
        .from("user_blocks")
        .select("blocked_id, created_at, profiles!user_blocks_blocked_id_fkey(display_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((row) => ({
        id: row.blocked_id,
        name: row.profiles?.display_name ?? null,
        blockedAt: row.created_at,
      }));
    },
  });
}
