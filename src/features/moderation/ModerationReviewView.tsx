import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { Text } from "@/components/Text";
import { SignedImage } from "@/features/cafe/Photos";
import { DrinkChips, RatingTiles } from "@/features/cafe/ReviewParts";
import { relativeAge } from "@/features/profile/myReviews";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { shortAge } from "./moderation";
import { Avatar, Header, Message, Pill, useDangerTint } from "./ModerationParts";
import type { ModerationAction, ModerationDetail } from "./types";

type Props = {
  /** Undefined while loading. */
  detail: ModerationDetail | undefined;
  failed: boolean;
  now: Date;
  onBack: () => void;
  onRetry: () => void;
  onAction: (action: ModerationAction) => void;
};

/** One reported review: the review, its author and its reports, with the actions at the bottom. */
export function ModerationReviewView({ detail, failed, now, onBack, onRetry, onAction }: Props) {
  const { colors } = useTheme();
  const text = copy.moderation.review;

  if (!detail) {
    return (
      <View style={{ flex: 1 }}>
        <Header title={text.title} onBack={onBack} />
        {failed ? (
          <Message text={text.loadError}>
            <Button label={text.retry} onPress={onRetry} />
          </Message>
        ) : (
          <View style={{ paddingTop: spacing.xxl }}>
            <ActivityIndicator accessibilityLabel={copy.common.loading} color={colors.primary} />
          </View>
        )}
      </View>
    );
  }

  const { review, reports, author } = detail;
  const hidden = review.hidden_at !== null;

  return (
    <View style={{ flex: 1 }}>
      <Header title={text.title} onBack={onBack} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md }}>
        {hidden ? <HiddenNotice /> : null}

        <View style={card(colors)}>
          <View>
            <Text variant="heading" numberOfLines={1}>
              {review.cafe_name}
            </Text>
            <Text muted numberOfLines={1}>
              {text.visited(review.suburb, relativeAge(`${review.visit_date}T00:00:00`, now))}
            </Text>
          </View>
          <RatingTiles review={review} />
          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <DrinkChips drinks={review.drinks} />
              <Text>{review.comment}</Text>
              {review.tags.length > 0 ? (
                <Text variant="caption" muted>
                  {review.tags.map((tag) => tag.label).join(" · ")}
                </Text>
              ) : null}
            </View>
            {review.photos.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                {review.photos.map((photo) => (
                  <SignedImage
                    key={photo.path}
                    path={photo.thumb_path ?? photo.path}
                    style={{ width: 64, height: 64, borderRadius: radius.md }}
                  />
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={[card(colors), { flexDirection: "row", alignItems: "center" }]}>
          <Avatar name={author.display_name} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Text variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                {author.display_name}
              </Text>
              {author.banned ? <Pill label={text.banned} tone="danger" /> : null}
            </View>
            <Text variant="caption" muted>
              {text.author(
                relativeAge(author.joined_at, now),
                author.review_count,
                author.hidden_count,
              )}
            </Text>
          </View>
        </View>

        {reports.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            <Text
              variant="label"
              muted
              accessibilityRole="header"
              style={{
                paddingHorizontal: spacing.sm,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {text.reportsHeading(reports.length)}
            </Text>
            <View style={[card(colors), { gap: 0, paddingVertical: spacing.xs }]}>
              {reports.map((report, index) => (
                <View
                  key={index}
                  style={{
                    paddingVertical: spacing.md,
                    gap: spacing.xs,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Text variant="label" style={{ flex: 1 }}>
                      {text.reporter(index + 1, copy.safety.reasons[report.reason])}
                    </Text>
                    <Text variant="caption" muted>
                      {report.resolved_at
                        ? text.closed
                        : text.reportAge(shortAge(report.created_at, now))}
                    </Text>
                  </View>
                  {report.details ? <Text>{`“${report.details}”`}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View
        style={{
          gap: spacing.sm,
          padding: spacing.lg,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {!hidden ? (
            <View style={{ flex: 1 }}>
              <Button
                label={text.dismiss}
                variant="secondary"
                onPress={() => onAction("dismiss")}
              />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {hidden ? (
              <Button label={text.restore} onPress={() => onAction("restore")} />
            ) : (
              <Button label={text.hide} onPress={() => onAction("hide")} />
            )}
          </View>
        </View>
        {author.banned ? (
          <Button
            label={text.unban(author.display_name)}
            variant="secondary"
            onPress={() => onAction("unban")}
          />
        ) : (
          <Button
            label={text.ban(author.display_name)}
            variant="dangerOutline"
            onPress={() => onAction("ban")}
          />
        )}
      </View>
    </View>
  );
}

function HiddenNotice() {
  const { colors } = useTheme();
  const dangerTint = useDangerTint();
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: dangerTint,
      }}
    >
      <MaterialCommunityIcons name="eye-off-outline" size={20} color={colors.danger} />
      <Text variant="label" color={colors.danger} style={{ flex: 1 }}>
        {copy.moderation.review.hiddenNotice}
      </Text>
    </View>
  );
}

function card(colors: { border: string; surface: string }) {
  return {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  };
}
