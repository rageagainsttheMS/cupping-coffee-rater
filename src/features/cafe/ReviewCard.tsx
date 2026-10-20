import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import { MetricIcon } from "@/components/MetricIcon";
import { Text } from "@/components/Text";
import { METRIC_ICONS, METRICS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { SignedImage } from "./Photos";
import { formatPrice, formatVisitDate, otherRatings, reviewMetricRating } from "./format";
import type { CafeReview, ReviewDrink } from "./types";

type Props = {
  review: CafeReview;
  /** The metric chosen with the score tiles. Its rating is the big badge. */
  metric: Metric;
  drinkId: number | null;
  onOpenPhoto: (path: string) => void;
  /** Opens the report and block menu. Left out for the person's own reviews. */
  onMenu?: () => void;
};

function drinkLine(drink: ReviewDrink): string {
  return [
    drink.name,
    drink.milk ? copy.milks[drink.milk] : null,
    drink.price_aud !== null ? formatPrice(drink.price_aud) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** One review: who, what they drank, the selected metric's rating, the others, and their words. */
export function ReviewCard({ review, metric, drinkId, onOpenPhoto, onMenu }: Props) {
  const { colors, metrics } = useTheme();
  const main = reviewMetricRating(review, metric, drinkId);
  const others = otherRatings(review, metric, METRICS);
  const m = metrics[metric];

  return (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.sm,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">
            {copy.cafe.reviews.by(review.author_name, formatVisitDate(review.visit_date))}
          </Text>
          {review.edited_at ? (
            <Text variant="caption" muted>
              {copy.cafe.reviews.edited}
            </Text>
          ) : null}
          {review.drinks.map((drink, index) => (
            <Text key={`${drink.drink_id}-${index}`} variant="caption" muted>
              {drinkLine(drink)}
            </Text>
          ))}
        </View>
        {main !== null ? (
          <View
            accessibilityLabel={copy.cafe.reviews.ratingLabel(
              copy.metrics[metric].label,
              main.toFixed(1),
            )}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: radius.pill,
              backgroundColor: m.strong,
            }}
          >
            <Text variant="label" color={m.onStrong}>
              {main.toFixed(1)}
            </Text>
          </View>
        ) : null}
        {onMenu ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.safety.menu(review.author_name)}
            onPress={onMenu}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              marginVertical: -spacing.sm,
              marginRight: -spacing.sm,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <View
        style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md }}
      >
        {others.map(({ metric: other, rating }) => (
          <View
            key={other}
            accessibilityLabel={copy.cafe.reviews.ratingLabel(
              copy.metrics[other].label,
              rating.toFixed(1),
            )}
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
          >
            <MetricIcon icon={METRIC_ICONS[other]} size={14} color={metrics[other].onTint} />
            <Text variant="caption" color={metrics[other].onTint}>
              {rating.toFixed(1)}
            </Text>
          </View>
        ))}
        {review.verified ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <MaterialCommunityIcons name="check-decagram" size={14} color={colors.primary} />
            <Text variant="caption" color={colors.primary}>
              {copy.cafe.reviews.verified}
            </Text>
          </View>
        ) : null}
      </View>

      <Text>{review.comment}</Text>

      {review.photo_path ? (
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={copy.cafe.photoLabel(1, 1)}
          onPress={() => onOpenPhoto(review.photo_path as string)}
        >
          <SignedImage path={review.photo_path} style={{ height: 180, borderRadius: radius.md }} />
        </Pressable>
      ) : null}
    </View>
  );
}
