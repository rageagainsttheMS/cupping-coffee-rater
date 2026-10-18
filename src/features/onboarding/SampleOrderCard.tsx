import { View } from "react-native";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** A made-up "What to order" card, to show why we ask which drink people had. */
export function SampleOrderCard() {
  const { colors, metrics } = useTheme();
  const coffee = metrics.coffee;
  const text = copy.onboarding;
  return (
    <View
      style={{
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Text variant="heading">{text.drink.cardTitle}</Text>
        <Text variant="caption" muted>
          {text.drink.cardCafe}
        </Text>
      </View>
      {text.sampleDrinks.map((drink, index) => (
        <View
          key={drink.name}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: spacing.md,
            borderTopWidth: index === 0 ? 0 : 1,
            borderTopColor: colors.border,
          }}
        >
          <View>
            <Text variant="bodyStrong">{drink.name}</Text>
            <Text variant="caption" muted>
              {drink.detail}
            </Text>
          </View>
          <View
            style={{
              minWidth: 52,
              alignItems: "center",
              paddingVertical: spacing.xs + 2,
              borderRadius: radius.pill,
              backgroundColor: index === 0 ? coffee.strong : coffee.tint,
            }}
          >
            <Text variant="label" color={index === 0 ? coffee.onStrong : coffee.onTint}>
              {drink.score}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
