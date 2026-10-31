import { View } from "react-native";
import { Text } from "@/components/Text";
import { METRICS } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { reviewMetricRating } from "./format";
import type { CafeReview, ReviewDrink } from "./types";

/** A review's four ratings as tinted tiles. A skipped metric shows a dash, greyed out. */
export function RatingTiles({ review }: { review: Pick<CafeReview, "drinks" | "ratings"> }) {
  const { colors, metrics } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {METRICS.map((metric) => {
        const rating = reviewMetricRating(review, metric, null);
        const label = copy.metrics[metric].label;
        const m = metrics[metric];
        return (
          <View
            key={metric}
            accessible
            accessibilityLabel={
              rating === null
                ? `${label}, ${copy.profile.myReviews.notRated}`
                : copy.cafe.reviews.ratingLabel(label, rating.toFixed(1))
            }
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: rating === null ? colors.border : m.tint,
              opacity: rating === null ? 0.6 : 1,
            }}
          >
            <Text variant="bodyStrong" color={m.onTint}>
              {rating === null ? copy.score.empty : rating.toFixed(1)}
            </Text>
            <Text variant="caption" color={m.onTint}>
              {label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The drinks on a review as Coffee-tinted chips. */
export function DrinkChips({ drinks }: { drinks: readonly ReviewDrink[] }) {
  const { metrics } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
      {drinks.map((drink, index) => (
        <View
          key={`${drink.drink_id}-${index}`}
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            borderRadius: radius.pill,
            backgroundColor: metrics.coffee.tint,
          }}
        >
          <Text variant="label" color={metrics.coffee.onTint}>
            {drink.name}
          </Text>
        </View>
      ))}
    </View>
  );
}
