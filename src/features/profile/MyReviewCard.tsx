import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { METRICS } from "@/domain/metrics";
import { SignedImage } from "@/features/cafe/Photos";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { detailsLine, metricRating, relativeAge } from "./myReviews";
import type { MyReview } from "./types";

type Props = {
  review: MyReview;
  now: Date;
  onOpenCafe: () => void;
  onOpenMenu: () => void;
};

/** One of the person's reviews: the cafe, its four ratings, what they drank and what they said. */
export function MyReviewCard({ review, now, onOpenCafe, onOpenMenu }: Props) {
  const { colors, metrics } = useTheme();
  const where = [
    review.suburb,
    relativeAge(review.created_at, now),
    review.edited_at ? copy.profile.myReviews.edited : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const details = detailsLine(review);

  return (
    <View
      style={{
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.profile.myReviews.openCafe(review.cafe_name)}
          onPress={onOpenCafe}
          style={{ flex: 1 }}
        >
          <Text variant="heading" numberOfLines={1}>
            {review.cafe_name}
          </Text>
          <Text muted numberOfLines={1}>
            {where}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.profile.myReviews.menu(review.cafe_name)}
          onPress={onOpenMenu}
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {METRICS.map((metric) => {
          const rating = metricRating(review, metric);
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

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {review.drinks.map((drink) => (
              <View
                key={drink.drink_id}
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
          <Text>{review.comment}</Text>
        </View>
        {review.photo_path ? (
          <SignedImage
            path={review.photo_path}
            style={{ width: 80, height: 80, borderRadius: radius.md }}
          />
        ) : null}
      </View>

      {details ? (
        <Text muted numberOfLines={2}>
          {details}
        </Text>
      ) : null}
    </View>
  );
}
