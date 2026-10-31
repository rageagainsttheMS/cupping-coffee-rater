import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { ActionSheet } from "@/features/moderation/ActionSheet";
import { ModerationReviewView } from "@/features/moderation/ModerationReviewView";
import type { ModerationAction } from "@/features/moderation/types";
import {
  useIsModerator,
  useModerate,
  useModerationReview,
} from "@/features/moderation/useModeration";
import { copy } from "@/lib/copy/en";

export default function ModerationReviewScreen() {
  const { reviewId } = useLocalSearchParams<{ reviewId: string }>();
  const isModerator = useIsModerator();
  const detail = useModerationReview(isModerator.data === true ? reviewId : undefined);
  const moderate = useModerate();
  const [action, setAction] = useState<ModerationAction | null>(null);

  if (isModerator.data === false) return <Redirect href="/profile" />;

  const author = detail.data?.author;

  const confirm = (note: string) => {
    if (!action || !detail.data || !author) return;
    const args =
      action === "ban" || action === "unban"
        ? { action, userId: author.user_id, note }
        : { action, reviewId: detail.data.review.review_id, note };
    moderate.mutate(args, {
      onSuccess: () => {
        setAction(null);
        // Dismissing, hiding or banning settles the report, so go back to the queue. Restoring and
        // unbanning stay here, so the moderator can see the result.
        if (action === "dismiss" || action === "hide" || action === "ban") router.back();
      },
      onError: () => Alert.alert(copy.moderation.failed),
    });
  };

  return (
    <Screen>
      <ModerationReviewView
        detail={detail.data}
        failed={isModerator.isError || detail.isError}
        now={new Date()}
        onBack={() => router.back()}
        onRetry={() => {
          void isModerator.refetch();
          void detail.refetch();
        }}
        onAction={setAction}
      />
      <ActionSheet
        action={action}
        authorName={author?.display_name ?? ""}
        reviewCount={author?.review_count ?? 0}
        busy={moderate.isPending}
        onCancel={() => setAction(null)}
        onConfirm={confirm}
      />
    </Screen>
  );
}
