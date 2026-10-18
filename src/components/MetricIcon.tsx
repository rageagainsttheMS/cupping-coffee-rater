import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";
import type { MetricIcon as MetricIconName } from "@/domain/metrics";

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const GLYPHS: Record<MetricIconName, GlyphName> = {
  cup: "coffee",
  "fork-knife": "silverware-fork-knife",
  sparkle: "shimmer",
  laptop: "laptop",
};

export function MetricIcon({
  icon,
  size = 18,
  color,
}: {
  icon: MetricIconName;
  size?: number;
  color: string;
}) {
  return <MaterialCommunityIcons name={GLYPHS[icon]} size={size} color={color} />;
}
