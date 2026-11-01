import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { MenuSheet } from "@/components/MenuSheet";
import type { CafeReview } from "@/features/cafe/types";
import { copy } from "@/lib/copy/en";
import { classifyReportError } from "./reports";
import { ReportSheet } from "./ReportSheet";
import { useBlockUser, useReportReview } from "./useSafety";

/**
 * The "…" menu on someone else's review: Report review and Block. `openMenu` shows the menu, and
 * `sheet` holds the menu and the report sheet, which the screen renders once.
 */
export function useReviewSafety() {
  const report = useReportReview();
  const block = useBlockUser();
  const [menuFor, setMenuFor] = useState<CafeReview | null>(null);
  const [reporting, setReporting] = useState<CafeReview | null>(null);

  const confirmBlock = useCallback(
    (review: CafeReview) =>
      Alert.alert(copy.safety.blockTitle(review.author_name), copy.safety.blockBody, [
        { text: copy.safety.cancel, style: "cancel" },
        {
          text: copy.safety.blockConfirm,
          style: "destructive",
          onPress: () =>
            block.mutate(review.user_id, { onError: () => Alert.alert(copy.safety.blockFailed) }),
        },
      ]),
    [block],
  );

  const openMenu = useCallback((review: CafeReview) => setMenuFor(review), []);

  const submit = (reason: Parameters<typeof report.mutate>[0]["reason"], details: string) => {
    if (!reporting) return;
    report.mutate(
      { reviewId: reporting.review_id, reason, details },
      {
        onSuccess: () => {
          setReporting(null);
          Alert.alert(copy.safety.reportedTitle, copy.safety.reportedBody);
        },
        onError: (error) => {
          const kind = classifyReportError(error);
          if (kind === "already_reported") setReporting(null);
          Alert.alert(
            kind === "already_reported" ? copy.safety.alreadyReported : copy.safety.reportFailed,
          );
        },
      },
    );
  };

  const sheet = (
    <>
      <MenuSheet
        visible={menuFor !== null}
        title={menuFor ? copy.safety.menuTitle(menuFor.author_name) : ""}
        items={
          menuFor
            ? [
                {
                  label: copy.safety.report,
                  icon: "flag-outline",
                  onPress: () => setReporting(menuFor),
                },
                {
                  label: copy.safety.block(menuFor.author_name),
                  icon: "account-cancel-outline",
                  destructive: true,
                  onPress: () => confirmBlock(menuFor),
                },
              ]
            : []
        }
        onClose={() => setMenuFor(null)}
      />
      <ReportSheet
        visible={reporting !== null}
        busy={report.isPending}
        onSubmit={submit}
        onCancel={() => setReporting(null)}
      />
    </>
  );

  return { openMenu, sheet };
}
