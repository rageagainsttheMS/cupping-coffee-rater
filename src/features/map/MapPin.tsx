import { useEffect, useState } from "react";
import { View } from "react-native";
import { Marker } from "react-native-maps";
import { Text } from "@/components/Text";
import type { Metric } from "@/domain/metrics";
import { scoreBand } from "@/domain/rating";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { isFaded, pinKind } from "./clusters";
import type { MapItem } from "./clusters";

type Props = {
  item: MapItem;
  metric: Metric;
  selected: boolean;
  onPressCafe: (id: string) => void;
  onPressCluster: (item: Extract<MapItem, { kind: "cluster" }>) => void;
};

/**
 * A marker on the map. Views are kept simple, and the marker stops re-drawing a moment after it
 * first appears (`tracksViewChanges`), which keeps hundreds of them smooth. The parent gives each
 * marker a key that changes when its look changes, so it draws again then.
 */
export function MapPin({ item, metric, selected, onPressCafe, onPressCluster }: Props) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const coordinate =
    item.kind === "cluster"
      ? { latitude: item.lat, longitude: item.lng }
      : { latitude: item.cafe.lat, longitude: item.cafe.lng };

  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracking}
      zIndex={selected ? 10 : item.kind === "cluster" ? 5 : 1}
      onPress={() => (item.kind === "cluster" ? onPressCluster(item) : onPressCafe(item.cafe.id))}
    >
      <PinFace item={item} metric={metric} selected={selected} />
    </Marker>
  );
}

function PinFace({ item, metric, selected }: { item: MapItem; metric: Metric; selected: boolean }) {
  const { colors, metrics, neutralBand } = useTheme();

  if (item.kind === "cluster") {
    const strong = metrics[metric];
    const best = item.best;
    const hasBest = best !== null;
    return (
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: hasBest ? strong.strong : neutralBand.bg,
          borderWidth: 3,
          borderColor: colors.surface,
        }}
      >
        <Text variant="label" color={hasBest ? strong.onStrong : neutralBand.fg}>
          {best !== null ? best.toFixed(1) : String(item.count)}
        </Text>
        {hasBest ? (
          <View
            style={{
              position: "absolute",
              top: -8,
              right: -8,
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              paddingHorizontal: 4,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text variant="caption">{String(item.count)}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  const { cafe } = item;
  const kind = pinKind(cafe);

  if (kind === "rate_first") {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          opacity: 0.92,
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: neutralBand.fg }} />
        <Text variant="caption" muted numberOfLines={1} style={{ maxWidth: 130 }}>
          {cafe.name}
        </Text>
      </View>
    );
  }

  const size = selected ? 56 : 38;
  const band = scoreBand(cafe.score);
  const colorsFor = kind === "rated" && band !== "none" ? metrics[metric].bands[band] : neutralBand;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colorsFor.bg,
        borderWidth: selected ? 4 : 2,
        borderColor: colors.surface,
        opacity: isFaded(cafe) && !selected ? 0.55 : 1,
      }}
    >
      <Text variant={selected ? "heading" : "label"} color={colorsFor.fg}>
        {kind === "rated" ? (cafe.score as number).toFixed(1) : copy.map.newPin}
      </Text>
    </View>
  );
}
