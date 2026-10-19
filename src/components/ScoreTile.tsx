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
  /**
   * A Google rating shown greyed out, with "Google" under it, in place of "New". Only for a tile
   * with no community score. It is never mixed into one.
   */
  googleRating?: number | null;
  onPress?: () => void;
};

/** One metric's score and rating count, e.g. "Coffee 4.2 (18)", or "New" under 3 ratings. */
export function ScoreTile({
  metric,
  score,
  count,
  selected,
  compact,
  googleRating,
  onPress,
}: Props) {
  const { metrics, colors, neutralBand } = useTheme();
  const label = copy.metrics[metric].label;
  const m = metrics[metric];
  const fg = selected ? m.onStrong : m.onTint;
  const notRatedEnough = score === null || count < MIN_RATINGS_FOR_SCORE;
  const google = notRatedEnough && googleRating != null ? googleRating : null;
  const valueColor = google !== null && !selected ? neutralBand.fg : fg;
  const value =
    google !== null
      ? google.toFixed(1)
      : notRatedEnough
        ? copy.score.new
        : compact
          ? score.toFixed(1)
          : formatScore(score, count);
  const spoken =
    google !== null
      ? copy.a11y.scoreGoogle(label, google.toFixed(1))
      : notRatedEnough
        ? copy.a11y.scoreNew(label)
        : copy.a11y.scoreRated(label, score, count);

  // A Google rating is greyed out, so it can't be mistaken for a community score.
  const frame = {
    flex: 1,
    borderRadius: radius.md,
    backgroundColor: selected ? m.strong : google !== null ? neutralBand.bg : m.tint,
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
          <Text variant="heading" color={valueColor}>
            {value}
          </Text>
          <Text variant="caption" color={fg}>
            {label}
          </Text>
          {google !== null ? (
            <Text variant="caption" color={valueColor}>
              {copy.cafe.google}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <MetricIcon icon={METRIC_ICONS[metric]} size={14} color={fg} />
            <Text variant="caption" color={fg}>
              {label}
            </Text>
          </View>
          <Text variant="heading" color={valueColor}>
            {value}
          </Text>
          {google !== null ? (
            <Text variant="caption" color={valueColor}>
              {copy.cafe.google}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}
