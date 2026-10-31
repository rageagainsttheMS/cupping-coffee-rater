import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Screen } from "@/components/Screen";
import { ActionSheet } from "@/features/moderation/ActionSheet";
import { QueueView } from "@/features/moderation/QueueView";
import type { BannedUser, QueueTab } from "@/features/moderation/types";
import {
  useBannedUsers,
  useIsModerator,
  useModerate,
  useModerationOpenCount,
  useModerationQueue,
} from "@/features/moderation/useModeration";
import { copy } from "@/lib/copy/en";

export default function ModerationQueueScreen() {
  const isModerator = useIsModerator();
  const allowed = isModerator.data === true;
  const [tab, setTab] = useState<QueueTab>("open");
  const openCount = useModerationOpenCount(allowed);
  const open = useModerationQueue("open", allowed && tab === "open");
  const hidden = useModerationQueue("hidden", allowed && tab === "hidden");
  const banned = useBannedUsers(allowed && tab === "banned");
  const moderate = useModerate();
  const [unbanning, setUnbanning] = useState<BannedUser | null>(null);

  // The server refuses non-moderators anyway; this keeps them off an empty screen.
  if (isModerator.data === false) return <Redirect href="/profile" />;

  const current = tab === "open" ? open : tab === "hidden" ? hidden : banned;

  return (
    <Screen>
      <QueueView
        tab={tab}
        onChangeTab={setTab}
        openCount={openCount.data ?? null}
        items={tab === "open" ? open.data : tab === "hidden" ? hidden.data : undefined}
        banned={tab === "banned" ? banned.data : undefined}
        failed={isModerator.isError || current.isError}
        now={new Date()}
        onBack={() => router.back()}
        onRetry={() => {
          void isModerator.refetch();
          void current.refetch();
        }}
        onOpenReview={(item) =>
          router.push({ pathname: "/moderation/[reviewId]", params: { reviewId: item.review_id } })
        }
        onUnban={setUnbanning}
      />
      <ActionSheet
        action={unbanning ? "unban" : null}
        authorName={unbanning?.display_name ?? ""}
        reviewCount={unbanning?.hidden_count ?? 0}
        busy={moderate.isPending}
        onCancel={() => setUnbanning(null)}
        onConfirm={(note) => {
          if (!unbanning) return;
          moderate.mutate(
            { action: "unban", userId: unbanning.user_id, note },
            {
              onSuccess: () => setUnbanning(null),
              onError: () => Alert.alert(copy.moderation.failed),
            },
          );
        }}
      />
    </Screen>
  );
}
