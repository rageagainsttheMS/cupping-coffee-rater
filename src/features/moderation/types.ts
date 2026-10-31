import type { Metric } from "@/domain/metrics";
import type { ReviewDrink, ReviewPhoto } from "@/features/cafe/types";
import type { ReportReason } from "@/features/safety/reports";

/** The lists on the Report queue screen. */
export type QueueTab = "open" | "hidden" | "banned";

/** What a moderator can do. Ban and unban go through the `moderate-user` Edge Function. */
export type ModerationAction = "dismiss" | "hide" | "restore" | "ban" | "unban";

type Ratings = Partial<Record<Exclude<Metric, "coffee">, number>>;

/**
 * One row from `moderation_queue()`. The function returns JSON for drinks, ratings and photos, which
 * the generated database types leave as `Json`, so the real shape is written out here.
 */
export type QueueItem = {
  review_id: string;
  cafe_id: string;
  cafe_name: string;
  suburb: string | null;
  user_id: string;
  author_name: string;
  created_at: string;
  hidden_at: string | null;
  comment: string;
  drinks: ReviewDrink[];
  ratings: Ratings;
  photos: ReviewPhoto[];
  /** Open reports on the Open list, every report on the Hidden list. */
  report_count: number;
  reasons: ReportReason[];
  /** Null on the Hidden list when the review was hidden without a report. */
  oldest_report_at: string | null;
};

/** One row from `moderation_banned_users()`. `banned_at` is null for a ban made in Supabase Studio. */
export type BannedUser = {
  user_id: string;
  display_name: string;
  banned_at: string | null;
  note: string | null;
  hidden_count: number;
};

/** What `moderation_review()` returns. Reports never say who sent them. */
export type ModerationDetail = {
  review: {
    review_id: string;
    cafe_id: string;
    cafe_name: string;
    suburb: string | null;
    visit_date: string;
    created_at: string;
    edited_at: string | null;
    hidden_at: string | null;
    comment: string;
    beans: string | null;
    verified: boolean;
    drinks: ReviewDrink[];
    ratings: Ratings;
    tags: { tag_id: number; metric: Metric; label: string }[];
    photos: ReviewPhoto[];
  };
  reports: {
    reason: ReportReason;
    details: string | null;
    created_at: string;
    resolved_at: string | null;
  }[];
  author: {
    user_id: string;
    display_name: string;
    joined_at: string;
    review_count: number;
    hidden_count: number;
    banned: boolean;
  };
};
