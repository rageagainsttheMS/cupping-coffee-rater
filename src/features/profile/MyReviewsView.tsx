import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { MyReviewCard } from "./MyReviewCard";
import { arrangeReviews, reviewStats } from "./myReviews";
import type { MyReview, MyReviewsMode } from "./types";

type Props = {
  /** Undefined while the first load is running. */
  reviews: MyReview[] | undefined;
  failed: boolean;
  now: Date;
  onBack: () => void;
  onRetry: () => void;
  onOpenCafe: (review: MyReview) => void;
  onOpenMenu: (review: MyReview) => void;
  onRateCafe: () => void;
};

const MODES: MyReviewsMode[] = ["newest", "highest", "cafe", "photo"];

/** The My reviews screen: a count line, the sort and filter chips, and the person's reviews. */
export function MyReviewsView({
  reviews,
  failed,
  now,
  onBack,
  onRetry,
  onOpenCafe,
  onOpenMenu,
  onRateCafe,
}: Props) {
  const { colors } = useTheme();
  const text = copy.profile.myReviews;
  const [mode, setMode] = useState<MyReviewsMode>("newest");
  const visible = useMemo(() => (reviews ? arrangeReviews(reviews, mode) : []), [reviews, mode]);
  const stats = reviews ? reviewStats(reviews) : null;

  let body;
  if (!reviews) {
    body = failed ? (
      <Message text={text.loadError}>
        <Button label={text.retry} onPress={onRetry} />
      </Message>
    ) : (
      <View style={{ paddingTop: spacing.xxl }}>
        <ActivityIndicator accessibilityLabel={copy.common.loading} color={colors.primary} />
      </View>
    );
  } else if (reviews.length === 0) {
    body = (
      <Message title={text.emptyTitle} text={text.emptyBody}>
        <Button label={text.emptyAction} onPress={onRateCafe} />
      </Message>
    );
  } else {
    body = (
      <FlatList
        data={visible}
        keyExtractor={(review) => review.review_id}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
          gap: spacing.md,
        }}
        ListEmptyComponent={<Message text={text.noPhotos} />}
        renderItem={({ item }) => (
          <MyReviewCard
            review={item}
            now={now}
            onOpenCafe={() => onOpenCafe(item)}
            onOpenMenu={() => onOpenMenu(item)}
          />
        )}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <CircleButton icon="arrow-left" accessibilityLabel={copy.common.back} onPress={onBack} />
          <Text variant="title" accessibilityRole="header">
            {text.title}
          </Text>
        </View>
        {stats ? <Text muted>{text.summary(stats.reviews, stats.cafes)}</Text> : null}
      </View>
      {reviews && reviews.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="tablist"
          accessibilityLabel={text.chipsLabel}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            gap: spacing.sm,
          }}
        >
          {MODES.map((option) => {
            const selected = option === mode;
            return (
              <Pressable
                key={option}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setMode(option)}
                style={{
                  minHeight: 44,
                  justifyContent: "center",
                  paddingHorizontal: spacing.lg,
                  borderRadius: radius.pill,
                  backgroundColor: selected ? colors.text : colors.border,
                }}
              >
                <Text variant="label" color={selected ? colors.background : colors.text}>
                  {text.chips[option]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {body}
    </View>
  );
}

function Message({
  title,
  text,
  children,
}: {
  title?: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ padding: spacing.xl, gap: spacing.md, alignItems: "center" }}>
      {title ? (
        <Text variant="heading" style={{ textAlign: "center" }}>
          {title}
        </Text>
      ) : null}
      <Text muted style={{ textAlign: "center" }}>
        {text}
      </Text>
      {children}
    </View>
  );
}
