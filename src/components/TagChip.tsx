import { Pressable } from "react-native";
import type { Metric } from "@/domain/metrics";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = {
  label: string;
  /** Colours the chip in this metric's palette. */
  metric: Metric;
  selected?: boolean;
  /** Shown after the label, e.g. "Wifi · 11". */
  count?: number;
  onPress?: () => void;
};

export function TagChip({ label, metric, selected, count, onPress }: Props) {
  const { metrics, colors } = useTheme();
  const m = metrics[metric];
  const text = count === undefined ? label : `${label} · ${count}`;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected: !!selected } : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: radius.pill,
        backgroundColor: selected ? m.strong : m.tint,
        borderWidth: 1,
        borderColor: selected ? m.strong : colors.border,
      }}
    >
      <Text variant="label" color={selected ? m.onStrong : m.onTint}>
        {text}
      </Text>
    </Pressable>
  );
}
