import { Pressable, View } from "react-native";
import { METRIC_ICONS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { MIN_RATINGS_FOR_SCORE } from "@/domain/limits";
import { formatScore } from "@/domain/rating";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { MetricIcon } from "./MetricIcon";
import { Text } from "./Text";

type Props = {
  metric: Metric;
  score: number | null;
  count: number;
  selected?: boolean;
  /** A small tile for cards: just the score over the label, without the rating count. */
  compact?: boolean;
  onPress?: () => void;
};

/** One metric's score and rating count, e.g. "Coffee 4.2 (18)", or "New" under 3 ratings. */
export function ScoreTile({ metric, score, count, selected, compact, onPress }: Props) {
  const { metrics, colors } = useTheme();
  const label = copy.metrics[metric].label;
  const m = metrics[metric];
  const fg = selected ? m.onStrong : m.onTint;
  const notRatedEnough = score === null || count < MIN_RATINGS_FOR_SCORE;
  const value = notRatedEnough
    ? copy.score.new
    : compact
      ? score.toFixed(1)
      : formatScore(score, count);
  const spoken = notRatedEnough
    ? copy.a11y.scoreNew(label)
    : copy.a11y.scoreRated(label, score, count);

  const frame = {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: selected ? m.strong : m.tint,
    borderWidth: 1,
    borderColor: selected ? m.strong : colors.border,
  } as const;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={spoken}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={
        compact
          ? { ...frame, alignItems: "center", paddingVertical: spacing.sm }
          : { ...frame, gap: spacing.xs, padding: spacing.md }
      }
    >
      {compact ? (
        <>
          <Text variant="heading" color={fg}>
            {value}
          </Text>
          <Text variant="caption" color={fg}>
            {label}
          </Text>
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <MetricIcon icon={METRIC_ICONS[metric]} size={14} color={fg} />
            <Text variant="caption" color={fg}>
              {label}
            </Text>
          </View>
          <Text variant="heading" color={fg}>
            {value}
          </Text>
        </>
      )}
    </Pressable>
  );
}
