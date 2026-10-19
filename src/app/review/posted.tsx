import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { describeMovements } from "@/features/review-wizard/outcome";
import type { Movement } from "@/features/review-wizard/outcome";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";

/** Work first: it is the score that is hardest to get, then Food, then Vibe. */
const FOLLOW_UP_ORDER = ["work", "food", "vibe"] as const;

function movementText(movement: Movement): string {
  const label = copy.metrics[movement.metric].label;
  const strings = copy.review.posted;
  switch (movement.state) {
    case "unlocked":
      return strings.unlocked(label, movement.to);
    case "moved":
      return strings.moved(label, movement.from, movement.to);
    case "unchanged":
      return strings.unchanged(label, movement.to);
    case "pending":
      return strings.pending(label, movement.remaining);
  }
}

/** Shown after posting: how the review moved the scores, and one thing to add. */
export default function PostedStep() {
  const { colors, metrics } = useTheme();
  const wizard = useWizard();
  const { posted, cafeLocked } = wizard;
  const strings = copy.review.posted;

  if (!posted) {
    // Reached without posting, e.g. by a stale link. There is nothing to show.
    return (
      <Screen style={{ justifyContent: "center", padding: spacing.xl }}>
        <Button label={copy.common.close} onPress={wizard.close} />
      </Screen>
    );
  }

  const movements = describeMovements(posted.before, posted.after, copy.score.new);
  const skipped = FOLLOW_UP_ORDER.find((metric) => !posted.after[metric]);

  const seeCafe = () => {
    if (cafeLocked) {
      // The cafe page is still underneath, so closing the wizard shows it.
      router.back();
      return;
    }
    router.back();
    router.push({ pathname: "/cafe/[id]", params: { id: posted.cafe.id } });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ alignItems: "center", gap: spacing.md, paddingTop: spacing.xl }}>
          <MaterialCommunityIcons name="check-circle" size={64} color={metrics.food.strong} />
          <Text variant="title" style={{ textAlign: "center" }}>
            {strings.title}
          </Text>
          {posted.verified ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <MaterialCommunityIcons name="check-decagram" size={18} color={colors.primary} />
              <Text variant="label" color={colors.primary}>
                {strings.verified}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {movements.map((movement) => (
            <Text key={movement.metric} color={metrics[movement.metric].onTint}>
              {movementText(movement)}
            </Text>
          ))}
        </View>

        {skipped && !posted.followedUp ? (
          <View
            style={{
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: metrics[skipped].tint,
            }}
          >
            <Text variant="heading" color={metrics[skipped].onTint}>
              {strings.followUp(copy.metrics[skipped].label)}
            </Text>
            <Text color={metrics[skipped].onTint}>{strings.followUpBody}</Text>
            <Button
              label={strings.followUpAction}
              onPress={() => {
                wizard.setEditingPosted(true);
                wizard.goTo("extras");
              }}
            />
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Button label={strings.seeCafe(posted.cafe.name)} onPress={seeCafe} />
          <Button
            label={strings.backToMap}
            variant="secondary"
            onPress={() => router.dismissTo("/map")}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
