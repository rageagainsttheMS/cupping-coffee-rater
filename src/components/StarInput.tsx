import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";
import type { Metric } from "@/domain/metrics";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Props = {
  value: number | null;
  metric?: Metric;
  size?: number;
};

/** Display-only stub. Touch input with half steps arrives in M7.4. */
export function StarInput({ value, metric = "coffee", size = 32 }: Props) {
  const { metrics } = useTheme();
  const color = metrics[metric].strong;
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 1, max: 5, now: value ?? undefined }}
      style={{ flexDirection: "row", gap: 4 }}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value !== null && value >= star;
        const half = value !== null && !filled && value >= star - 0.5;
        const name = filled ? "star" : half ? "star-half-full" : "star-outline";
        return <MaterialCommunityIcons key={star} name={name} size={size} color={color} />;
      })}
    </View>
  );
}
