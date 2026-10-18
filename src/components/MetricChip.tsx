import { Pressable } from "react-native";
import { METRIC_ICONS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { MetricIcon } from "./MetricIcon";
import { Text } from "./Text";

type Props = {
  metric: Metric;
  selected?: boolean;
  onPress?: () => void;
};

/** Metric filter chip for the map and cafe page. */
export function MetricChip({ metric, selected, onPress }: Props) {
  const { metrics, colors } = useTheme();
  const label = copy.metrics[metric].label;
  const m = metrics[metric];
  const fg = selected ? m.onStrong : m.onTint;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        minHeight: 44,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.pill,
        backgroundColor: selected ? m.strong : m.tint,
        borderWidth: 1,
        borderColor: selected ? m.strong : colors.border,
      }}
    >
      <MetricIcon icon={METRIC_ICONS[metric]} color={fg} />
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </Pressable>
  );
}
