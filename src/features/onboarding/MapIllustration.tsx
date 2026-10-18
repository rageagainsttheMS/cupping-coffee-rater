import { View } from "react-native";
import type { ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import type { Metric } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

const USER_BLUE = "#2F6FE4";

/** Where each example pin sits on the picture, as a share of its width and height. */
const PINS: { metric: Metric; left: `${number}%`; top: `${number}%` }[] = [
  { metric: "coffee", left: "10%", top: "14%" },
  { metric: "work", left: "46%", top: "32%" },
  { metric: "vibe", left: "14%", top: "52%" },
  { metric: "food", left: "44%", top: "78%" },
];

/** A made-up map with four score pins, for the welcome screen. Not a live map. */
export function MapIllustration({ height = 260 }: { height?: number }) {
  const { colors, metrics } = useTheme();
  const road = (style: ViewStyle) => (
    <View
      style={[{ position: "absolute", backgroundColor: colors.surface, opacity: 0.8 }, style]}
    />
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        height,
        borderRadius: radius.lg,
        overflow: "hidden",
        backgroundColor: metrics.coffee.tint,
      }}
    >
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "32%",
          height: "34%",
          backgroundColor: metrics.food.tint,
        }}
      />
      {road({
        left: "-10%",
        top: "32%",
        width: "130%",
        height: 14,
        transform: [{ rotate: "-8deg" }],
      })}
      {road({
        left: "-10%",
        top: "66%",
        width: "130%",
        height: 12,
        transform: [{ rotate: "6deg" }],
      })}
      {road({
        left: "30%",
        top: "-10%",
        width: 14,
        height: "130%",
        transform: [{ rotate: "14deg" }],
      })}
      {road({
        left: "62%",
        top: "-10%",
        width: 12,
        height: "130%",
        transform: [{ rotate: "10deg" }],
      })}

      {PINS.map(({ metric, left, top }) => (
        <View
          key={metric}
          style={{
            position: "absolute",
            left,
            top,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs + 2,
            borderRadius: radius.pill,
            backgroundColor: metrics[metric].strong,
          }}
        >
          <Text variant="label" color={metrics[metric].onStrong}>
            {copy.onboarding.welcome.samplePins[metric]}
          </Text>
        </View>
      ))}

      <View
        style={{
          position: "absolute",
          left: "44%",
          top: "47%",
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: USER_BLUE,
          borderWidth: 3,
          borderColor: colors.surface,
        }}
      />
    </View>
  );
}
