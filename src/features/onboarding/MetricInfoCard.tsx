import { View } from "react-native";
import { MetricIcon } from "@/components/MetricIcon";
import { Text } from "@/components/Text";
import { METRIC_ICONS } from "@/domain/metrics";
import type { Metric } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** One metric on the "four scores" screen: its icon, name and what it measures. */
export function MetricInfoCard({ metric, detail }: { metric: Metric; detail: string }) {
  const { metrics } = useTheme();
  const m = metrics[metric];
  return (
    <View
      accessible
      accessibilityLabel={`${copy.metrics[metric].label}. ${detail}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.lg,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: m.tint,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: m.strong,
        }}
      >
        <MetricIcon icon={METRIC_ICONS[metric]} size={24} color={m.onStrong} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading" color={m.onTint}>
          {copy.metrics[metric].label}
        </Text>
        <Text variant="label" color={m.onTint}>
          {detail}
        </Text>
      </View>
    </View>
  );
}
