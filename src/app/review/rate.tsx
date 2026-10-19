import { View } from "react-native";
import { Button } from "@/components/Button";
import { StarInput } from "@/components/StarInput";
import { TagChip } from "@/components/TagChip";
import { Text } from "@/components/Text";
import { activeTagsByMetric } from "@/domain/reference";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";
import { WizardScreen } from "@/features/review-wizard/WizardScreen";

/** Step 3. The Coffee rating for the current drink, then its quick tags. Coffee is required. */
export default function RateStep() {
  const { metrics } = useTheme();
  const { values, drinks, tags, activeDrink, setCoffeeRating, toggleTag, addDrink, goNext } =
    useWizard();
  const drinkName = drinks.find((d) => d.id === activeDrink.drinkId)?.name ?? "";
  const rated = activeDrink.rating !== null;
  const coffeeTags = activeTagsByMetric(tags).coffee;

  return (
    <WizardScreen
      step="rate"
      title={copy.review.coffeePrompt(drinkName)}
      canContinue={rated}
      onContinue={() => goNext("rate")}
    >
      <View
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          borderRadius: radius.pill,
          backgroundColor: metrics.coffee.tint,
        }}
      >
        <Text variant="label" color={metrics.coffee.onTint}>
          {copy.review.rate.pill(
            drinkName,
            activeDrink.milk ? copy.milks[activeDrink.milk] : null,
            values.cafe?.name ?? "",
          )}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        <StarInput
          value={activeDrink.rating}
          metric="coffee"
          size={52}
          showReadout
          accessibilityLabel={copy.review.coffeePrompt(drinkName)}
          onChange={setCoffeeRating}
        />
        {!rated ? (
          <Text variant="caption" muted style={{ textAlign: "center" }}>
            {copy.review.rate.hint}
          </Text>
        ) : null}
      </View>

      {rated ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="label">{copy.review.rate.tags}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {coffeeTags.map((tag) => (
              <TagChip
                key={tag.id}
                label={tag.label}
                metric="coffee"
                selected={values.tagIds.includes(tag.id)}
                onPress={() => toggleTag(tag.id)}
              />
            ))}
          </View>
          <Button label={copy.review.rate.another} variant="secondary" onPress={addDrink} />
        </View>
      ) : null}
    </WizardScreen>
  );
}
