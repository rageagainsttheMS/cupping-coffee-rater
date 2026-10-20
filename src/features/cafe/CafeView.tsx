import { useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import type { Metric } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import type { PlaceDetails } from "@/lib/places";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { CafeScoreRow } from "./CafeScoreRow";
import { MetricSummary } from "./MetricSummary";
import { PhotoGrid, PhotoViewer } from "./Photos";
import { ReviewCard } from "./ReviewCard";
import { WhatToOrder } from "./WhatToOrder";
import { openStatus } from "./format";
import type { CafeDetail, CafePhoto, CafeReview, ReviewsResult } from "./types";

type Props = {
  detail: CafeDetail;
  /** Live from Google. Undefined while loading or when it failed, and the page works without it. */
  google: PlaceDetails | undefined;
  photos: readonly CafePhoto[];
  /** Already formatted, e.g. "350 m". Empty when the person's position is not known. */
  distance: string;
  /** The metric selected when the page opens. */
  initialMetric: Metric;
  /** Reviews for the selected metric and drink. Called on every render, so it must be a hook. */
  useReviews: (cafeId: string, metric: Metric, drinkId: number | null) => ReviewsResult;
  onBack: () => void;
  onToggleSave: () => void;
  onDirections: () => void;
  onRate: () => void;
  /** The signed-in person, so their own reviews get no report or block menu. */
  currentUserId?: string;
  /** Opens the report and block menu for someone else's review. */
  onReviewMenu?: (review: CafeReview) => void;
};

/** The cafe page: everything from the header to the sticky footer, once the data is in hand. */
export function CafeView({
  detail,
  google,
  photos,
  distance,
  initialMetric,
  useReviews,
  onBack,
  onToggleSave,
  onDirections,
  onRate,
  currentUserId,
  onReviewMenu,
}: Props) {
  const { colors } = useTheme();
  const [metric, setMetric] = useState<Metric>(initialMetric);
  const [chosenDrinkId, setDrinkId] = useState<number | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  // Drinks only matter for Coffee. In other modes What to order is hidden and its filter not applied.
  const drinkId = metric === "coffee" ? chosenDrinkId : null;
  const reviews = useReviews(detail.cafe.id, metric, drinkId);

  const { cafe, scores } = detail;
  const status = openStatus(google);
  const statusText =
    status === null
      ? null
      : status.kind === "closed"
        ? copy.cafe.closed
        : status.until
          ? copy.cafe.openTill(status.until)
          : copy.cafe.openNow;
  const where = copy.map.suburbAndDistance(cafe.suburb ?? "", distance);

  const header = (
    <View style={{ gap: spacing.xl, paddingBottom: spacing.lg }}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <CircleButton icon="arrow-left" accessibilityLabel={copy.cafe.back} onPress={onBack} />
          <CircleButton
            icon={detail.saved ? "heart" : "heart-outline"}
            accessibilityLabel={detail.saved ? copy.cafe.unsave : copy.cafe.save}
            onPress={onToggleSave}
          />
        </View>
        <PhotoGrid photos={photos} onOpen={setViewing} />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text variant="title">{cafe.name}</Text>
        {where ? <Text muted>{where}</Text> : null}
        {statusText ? <Text variant="label">{statusText}</Text> : null}
      </View>

      <CafeScoreRow
        scores={scores}
        selected={metric}
        onSelect={setMetric}
        googleRating={google?.rating}
      />
      <MetricSummary metric={metric} reviewCount={scores[metric].count} tags={detail.tags} />
      {metric === "coffee" ? (
        <WhatToOrder
          drinks={detail.drinks}
          topBean={detail.beans[0]}
          selectedDrinkId={drinkId}
          onSelectDrink={setDrinkId}
        />
      ) : null}

      <Text variant="heading">{copy.cafe.reviews.forMetric(copy.metrics[metric].label)}</Text>
    </View>
  );

  const empty = reviews.isLoading ? (
    <ActivityIndicator accessibilityLabel={copy.common.loading} />
  ) : reviews.isError ? (
    <View style={{ gap: spacing.md }}>
      <Text muted>{copy.cafe.reviews.loadError}</Text>
      <Button label={copy.cafe.reviews.retry} variant="secondary" onPress={reviews.refetch} />
    </View>
  ) : (
    <View style={{ gap: spacing.xs }}>
      <Text variant="heading">{copy.cafe.reviews.empty(copy.metrics[metric].label)}</Text>
      <Text muted>{copy.cafe.reviews.emptyBody}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={reviews.reviews}
        keyExtractor={(review) => review.review_id}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={
          reviews.isFetchingNextPage ? (
            <ActivityIndicator style={{ padding: spacing.lg }} />
          ) : undefined
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <ReviewCard
            review={item}
            metric={metric}
            drinkId={drinkId}
            onOpenPhoto={setViewing}
            onMenu={
              onReviewMenu && item.user_id !== currentUserId ? () => onReviewMenu(item) : undefined
            }
          />
        )}
        onEndReached={() => {
          if (reviews.hasNextPage && !reviews.isFetchingNextPage) reviews.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
      />

      <View
        style={{
          flexDirection: "row",
          gap: spacing.md,
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ flex: 1 }}>
          <Button label={copy.cafe.directions} variant="secondary" onPress={onDirections} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button label={copy.cafe.rate} onPress={onRate} />
        </View>
      </View>

      <PhotoViewer path={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}
