import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import { MetricIcon } from "@/components/MetricIcon";
import { Text } from "@/components/Text";
import { MIN_RATINGS_FOR_SCORE } from "@/domain/limits";
import { METRICS } from "@/domain/metrics";
import { formatDistance } from "@/features/map/cards";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { SavedCafe } from "./types";

type Props = {
  cafe: SavedCafe;
  /** Metres from the person, or null when their position is not known. */
  distance: number | null;
  onPress: () => void;
  onUnsave: () => void;
};

/** A saved cafe: where it is, its four scores, and the person's own last rating there. */
export function SavedRow({ cafe, distance, onPress, onUnsave }: Props) {
  const { colors, metrics } = useTheme();
  const where = copy.map.suburbAndDistance(cafe.suburb ?? "", formatDistance(distance));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.saved.rowLabel(cafe.name)}
        onPress={onPress}
        style={{ flex: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md }}
      >
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
        <View style={{ flex: 1, justifyContent: "center", gap: 2 }}>
          <Text variant="heading" numberOfLines={1}>
            {cafe.name}
          </Text>
          {where ? (
            <Text variant="caption" muted numberOfLines={1}>
              {where}
            </Text>
          ) : null}
          {cafe.last_drink_name !== null && cafe.last_rating !== null ? (
            <Text variant="caption" muted numberOfLines={1}>
              {copy.saved.lastRating(cafe.last_drink_name, cafe.last_rating.toFixed(1))}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md }}>
            {METRICS.map((metric) => {
              const score = cafe[`${metric}_score`];
              const count = cafe[`${metric}_count`];
              const rated = score !== null && count >= MIN_RATINGS_FOR_SCORE;
              return (
                <View
                  key={metric}
                  accessible
                  accessibilityLabel={
                    rated
                      ? copy.a11y.scoreRated(copy.metrics[metric].label, score, count)
                      : copy.a11y.scoreNew(copy.metrics[metric].label)
                  }
                  style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: metrics[metric].strong,
                    }}
                  />
                  <Text variant="label" color={metrics[metric].onTint}>
                    {rated ? score.toFixed(1) : copy.score.new}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={copy.cafe.unsave}
        onPress={onUnsave}
        hitSlop={8}
        style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
      >
        <MaterialCommunityIcons name="heart" size={24} color={metrics.vibe.strong} />
      </Pressable>
    </View>
  );
}
