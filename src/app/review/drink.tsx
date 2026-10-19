import { useMemo, useState } from "react";
import { View } from "react-native";
import { TagChip } from "@/components/TagChip";
import { Text } from "@/components/Text";
import { MILKS } from "@/domain/drinks";
import { useCafeDetail } from "@/features/cafe/useCafeDetail";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { orderDrinks } from "@/features/review-wizard/drinkOrder";
import { useWizard } from "@/features/review-wizard/ReviewWizardProvider";
import { useUsualDrinks } from "@/features/review-wizard/useWizardData";
import { WizardScreen } from "@/features/review-wizard/WizardScreen";

/**
 * Step 2. A grid of drink chips, led by what this cafe is rated for and what the person usually
 * has, and an optional milk. Shown again for a second drink in the same visit.
 */
export default function DrinkStep() {
  const { values, drinks, drinkIndex, activeDrink, patchDrink, goNext } = useWizard();
  const detail = useCafeDetail(values.cafe?.id);
  const usual = useUsualDrinks();
  const [showMore, setShowMore] = useState(false);

  const cafeCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const drink of detail.data?.drinks ?? []) counts[drink.drink_id] = drink.rating_count;
    return counts;
  }, [detail.data]);

  // A drink already added for this visit is not offered again.
  const taken = new Set(
    values.drinks.flatMap((d, i) => (i !== drinkIndex && d.drinkId !== null ? [d.drinkId] : [])),
  );
  const available = drinks.filter((d) => !taken.has(d.id));
  const { primary, more } = orderDrinks(available, cafeCounts, usual.data ?? {});

  const chip = (id: number, name: string) => (
    <TagChip
      key={id}
      label={name}
      metric="coffee"
      selected={activeDrink.drinkId === id}
      onPress={() => patchDrink(drinkIndex, { drinkId: id })}
    />
  );

  return (
    <WizardScreen
      step="drink"
      title={copy.review.drink.title}
      canContinue={activeDrink.drinkId !== null}
      onContinue={() => goNext("drink")}
    >
      {drinkIndex > 0 ? (
        <Text variant="label" muted>
          {copy.review.drink.another(drinkIndex + 1)}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {primary.map((d) => chip(d.id, d.name))}
        {showMore ? more.map((d) => chip(d.id, d.name)) : null}
        {more.length > 0 ? (
          <TagChip
            label={showMore ? copy.review.drink.fewer : copy.review.drink.more}
            metric="coffee"
            onPress={() => setShowMore((open) => !open)}
          />
        ) : null}
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="label">{copy.review.drink.milkOptional}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {MILKS.map((milk) => (
            <TagChip
              key={milk}
              label={copy.milks[milk]}
              metric="coffee"
              selected={activeDrink.milk === milk}
              onPress={() =>
                patchDrink(drinkIndex, { milk: activeDrink.milk === milk ? null : milk })
              }
            />
          ))}
        </View>
      </View>
    </WizardScreen>
  );
}
