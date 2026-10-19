import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Section } from "./Section";
import { DRINK_PREVIEW_COUNT, drinkScore, formatPrice } from "./format";
import type { CafeBean, CafeDrink } from "./types";

type Props = {
  drinks: readonly CafeDrink[];
  /** The most reported beans, shown as one line under the drinks. */
  topBean: CafeBean | undefined;
  selectedDrinkId: number | null;
  /** Tapping a drink filters the reviews to it. Tapping the selected one clears the filter. */
  onSelectDrink: (drinkId: number | null) => void;
};

/**
 * Top drinks by score, which also filter the reviews below. A drink with fewer than 3 ratings is
 * listed without a score. Only shown for Coffee.
 */
export function WhatToOrder({ drinks, topBean, selectedDrinkId, onSelectDrink }: Props) {
  const { colors, metrics } = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (drinks.length === 0) return null;
  const shown = expanded ? drinks : drinks.slice(0, DRINK_PREVIEW_COUNT);

  return (
    <Section title={copy.cafe.order.title}>
      <View style={{ gap: spacing.xs }}>
        {shown.map((drink) => {
          const score = drinkScore(drink);
          const selected = drink.drink_id === selectedDrinkId;
          const price =
            drink.median_price !== null
              ? copy.cafe.order.price(formatPrice(drink.median_price))
              : null;
          const detail = [copy.cafe.order.people(drink.rating_count), price]
            .filter(Boolean)
            .join(" · ");
          return (
            <Pressable
              key={drink.drink_id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelectDrink(selected ? null : drink.drink_id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                backgroundColor: selected ? metrics.coffee.tint : "transparent",
                borderWidth: 1,
                borderColor: selected ? metrics.coffee.strong : colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{drink.name}</Text>
                <Text variant="caption" muted>
                  {detail}
                </Text>
              </View>
              {score !== null ? (
                <Text variant="heading" color={metrics.coffee.onTint}>
                  {score.toFixed(1)}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {drinks.length > DRINK_PREVIEW_COUNT ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((open) => !open)}
          style={{ alignSelf: "flex-start", paddingVertical: spacing.xs }}
        >
          <Text variant="label" color={metrics.coffee.onTint}>
            {expanded ? copy.cafe.showFewer : copy.cafe.showAll}
          </Text>
        </Pressable>
      ) : null}
      {topBean ? (
        <Text variant="caption" muted>
          {copy.cafe.beans.line(topBean.beans, topBean.count)}
        </Text>
      ) : null}
    </Section>
  );
}
