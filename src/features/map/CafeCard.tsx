import { Pressable, View } from "react-native";
import { MetricIcon } from "@/components/MetricIcon";
import { ScoreTile } from "@/components/ScoreTile";
import { Text } from "@/components/Text";
import { METRICS } from "@/domain/metrics";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { MapCafe } from "./types";

type Props = {
  cafe: MapCafe;
  selected: boolean;
  width: number;
  /** Already formatted, e.g. "350 m". Empty when the person's position is not known. */
  distance: string;
  onPress: () => void;
};

/** A cafe in the swipeable row at the bottom of the map: name, where, best drink, four scores. */
export function CafeCard({ cafe, selected, width, distance, onPress }: Props) {
  const { colors, metrics } = useTheme();
  const showBest = cafe.best_drink !== null && cafe.best_drink_score !== null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.map.cardLabel(cafe.name)}
      onPress={onPress}
      style={{
        width,
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: metrics.coffee.tint,
          }}
        >
          <MetricIcon icon="cup" size={28} color={metrics.coffee.onTint} />
        </View>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text variant="heading" numberOfLines={1}>
            {cafe.name}
          </Text>
          {cafe.suburb || distance ? (
            <Text variant="caption" muted numberOfLines={1}>
              {copy.map.suburbAndDistance(cafe.suburb ?? "", distance)}
            </Text>
          ) : null}
          {showBest ? (
            <Text variant="label" color={metrics.coffee.onTint} numberOfLines={1}>
              {copy.map.bestHere(
                cafe.best_drink as string,
                (cafe.best_drink_score as number).toFixed(1),
              )}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {METRICS.map((metric) => (
          <ScoreTile
            key={metric}
            compact
            metric={metric}
            score={cafe[`${metric}_score`]}
            count={cafe[`${metric}_count`]}
          />
        ))}
      </View>
    </Pressable>
  );
}
