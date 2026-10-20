import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { MetricIcon } from "@/components/MetricIcon";
import { StarInput } from "@/components/StarInput";
import { TagChip } from "@/components/TagChip";
import { Text } from "@/components/Text";
import { METRIC_ICONS, OPTIONAL_METRICS } from "@/domain/metrics";
import type { OptionalMetric } from "@/domain/metrics";
import { activeTagsByMetric } from "@/domain/reference";
import { CAFE_DETAIL_KEY } from "@/features/cafe/useCafeDetail";
import { CAFE_REVIEWS_KEY } from "@/features/cafe/useCafeReviews";
import { CAFES_IN_VIEW_KEY } from "@/features/map/useCafesInView";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { updateRatings } from "@/features/review-wizard/postReview";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";
import { WizardScreen } from "@/features/review-wizard/WizardScreen";

type CardProps = { metric: OptionalMetric };

/** One of Food, Vibe or Work. Starts on "Didn't try"; tapping it opens the stars and quick tags. */
function MetricCard({ metric }: CardProps) {
  const { colors, metrics } = useTheme();
  const { values, tags, setMetricRating, toggleTag } = useWizard();
  const rating = values[metric];
  const [open, setOpen] = useState(rating !== null);
  const m = metrics[metric];
  const label = copy.metrics[metric].label;
  const metricTags = activeTagsByMetric(tags)[metric];

  return (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: open ? m.tint : colors.surface,
        borderWidth: 1,
        borderColor: open ? m.strong : colors.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? label : `${label}. ${copy.review.extras.tapToRate}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        disabled={open}
        style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
      >
        <MetricIcon
          icon={METRIC_ICONS[metric]}
          size={20}
          color={open ? m.onTint : colors.textMuted}
        />
        <Text variant="heading" color={open ? m.onTint : colors.text} style={{ flex: 1 }}>
          {label}
        </Text>
        {!open ? (
          <Text variant="label" muted>
            {copy.review.extras.didntTry}
          </Text>
        ) : null}
      </Pressable>

      {open ? (
        <>
          <StarInput
            value={rating}
            metric={metric}
            size={44}
            showReadout
            accessibilityLabel={copy.metrics[metric].prompt}
            onChange={(next) => setMetricRating(metric, next)}
          />
          {rating !== null ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              {metricTags.map((tag) => (
                <TagChip
                  key={tag.id}
                  label={tag.label}
                  metric={metric}
                  selected={values.tagIds.includes(tag.id)}
                  onPress={() => toggleTag(tag.id)}
                />
              ))}
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMetricRating(metric, null);
              setOpen(false);
            }}
            style={{ alignSelf: "flex-start", paddingVertical: spacing.xs }}
          >
            <Text variant="label" color={m.onTint}>
              {copy.review.extras.didntTry}
            </Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

/**
 * Step 4. Food, Vibe and Work, each optional. Also used from the Posted screen to add what was
 * skipped to a review that is already live, which saves straight to that review.
 */
export default function ExtrasStep() {
  const wizard = useWizard();
  const queryClient = useQueryClient();
  const { values, tags, posted, editingPosted } = wizard;

  // When adding to a posted review, only the metrics skipped the first time are offered.
  const offered = editingPosted
    ? OPTIONAL_METRICS.filter((metric) => !posted?.after[metric])
    : OPTIONAL_METRICS;
  const anyRated = offered.some((metric) => values[metric] !== null);

  const save = useMutation({
    mutationFn: () => updateRatings({ values, tags }),
    onSuccess: (result) => {
      wizard.setPosted((previous) =>
        previous
          ? {
              ...previous,
              before: { ...previous.before, ...result.before },
              after: { ...previous.after, ...result.after },
              followedUp: true,
            }
          : previous,
      );
      for (const key of [CAFES_IN_VIEW_KEY, CAFE_DETAIL_KEY, CAFE_REVIEWS_KEY]) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      wizard.setEditingPosted(false);
      router.replace("/review/posted");
    },
    onError: () => Alert.alert(copy.review.posted.saveFailed),
  });

  const backToPosted = () => {
    wizard.setEditingPosted(false);
    router.replace("/review/posted");
  };

  if (editingPosted) {
    return (
      <WizardScreen
        step="extras"
        title={copy.review.extras.followUpTitle}
        continueLabel={copy.review.extras.save}
        canContinue={anyRated}
        busy={save.isPending}
        onContinue={() => save.mutate()}
        onBack={backToPosted}
      >
        {offered.map((metric) => (
          <MetricCard key={metric} metric={metric} />
        ))}
      </WizardScreen>
    );
  }

  return (
    <WizardScreen
      step="extras"
      title={copy.review.extras.title}
      continueLabel={anyRated || wizard.editing ? copy.review.continue : copy.common.skip}
      onContinue={() => wizard.goNext("extras")}
    >
      <Text muted>{copy.review.extras.body}</Text>
      {offered.map((metric) => (
        <MetricCard key={metric} metric={metric} />
      ))}
    </WizardScreen>
  );
}
