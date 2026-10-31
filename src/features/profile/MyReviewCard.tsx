import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { SignedImage } from "@/features/cafe/Photos";
import { DrinkChips, RatingTiles } from "@/features/cafe/ReviewParts";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { detailsLine, relativeAge } from "./myReviews";
import type { MyReview } from "./types";

type Props = {
  review: MyReview;
  now: Date;
  onOpenCafe: () => void;
  onOpenMenu: () => void;
};

/** One of the person's reviews: the cafe, its four ratings, what they drank and what they said. */
export function MyReviewCard({ review, now, onOpenCafe, onOpenMenu }: Props) {
  const { colors } = useTheme();
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

      <RatingTiles review={review} />

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1, gap: spacing.sm }}>
          <DrinkChips drinks={review.drinks} />
          <Text>{review.comment}</Text>
        </View>
        {review.photos.length > 0 ? (
          <View>
            <SignedImage
              path={review.photos[0].thumb_path ?? review.photos[0].path}
              style={{ width: 80, height: 80, borderRadius: radius.md }}
            />
            {review.photos.length > 1 ? (
              <View
                style={{
                  position: "absolute",
                  right: spacing.xs,
                  bottom: spacing.xs,
                  paddingHorizontal: spacing.xs,
                  borderRadius: radius.pill,
                  backgroundColor: "rgba(0,0,0,0.6)",
                }}
              >
                <Text variant="caption" color="#fff">
                  {"+" + (review.photos.length - 1)}
                </Text>
              </View>
            ) : null}
          </View>
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
