import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useMemo, useState } from "react";
import { PanResponder, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import type { Metric } from "@/domain/metrics";
import { ratingFromPosition, stepRating } from "@/domain/starRating";
import { copy } from "@/lib/copy/en";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = {
  value: number | null;
  metric?: Metric;
  size?: number;
  /** Makes the stars touchable. Without it they only display a rating. */
  onChange?: (rating: number) => void;
  /** A big number under the stars, for the rating screens. */
  showReadout?: boolean;
  accessibilityLabel?: string;
};

/**
 * Five stars in half steps. Tap the left half of a star for a half step, the right half for a whole
 * one, or drag across. Screen readers get an adjustable control with increment and decrement.
 */
export function StarInput({
  value,
  metric = "coffee",
  size = 32,
  onChange,
  showReadout,
  accessibilityLabel,
}: Props) {
  const { metrics, colors } = useTheme();
  const color = metrics[metric].strong;
  const [width, setWidth] = useState(0);

  // Rebuilt when the value or width changes, so the handlers always see the latest props.
  const responder = useMemo(() => {
    const update = (x: number) => {
      const rating = ratingFromPosition(x, width);
      if (onChange && rating !== value) onChange(rating);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !!onChange,
      onMoveShouldSetPanResponder: () => !!onChange,
      // Stay in control of a horizontal drag even inside a scroll view.
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event) => update(event.nativeEvent.locationX),
      onPanResponderMove: (event) => update(event.nativeEvent.locationX),
    });
  }, [onChange, width, value]);

  const interactive = !!onChange;
  const spoken = value === null ? copy.a11y.starsNotRated : copy.a11y.starsValue(value.toFixed(1));

  return (
    <View style={{ gap: 4, alignItems: "center" }}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 1, max: 5, now: value ?? undefined, text: spoken }}
        accessibilityActions={
          interactive ? [{ name: "increment" }, { name: "decrement" }] : undefined
        }
        onAccessibilityAction={(event) => {
          if (!onChange) return;
          if (event.nativeEvent.actionName === "increment") onChange(stepRating(value, 1));
          if (event.nativeEvent.actionName === "decrement") onChange(stepRating(value, -1));
        }}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={{ flexDirection: "row", alignSelf: "stretch" }}
        {...(interactive ? responder.panHandlers : {})}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = value !== null && value >= star;
          const half = value !== null && !filled && value >= star - 0.5;
          const name = filled ? "star" : half ? "star-half-full" : "star-outline";
          return (
            // Children ignore touches so the row reports the finger position, not the icon's.
            <View key={star} pointerEvents="none" style={{ flex: 1, alignItems: "center" }}>
              <MaterialCommunityIcons name={name} size={size} color={color} />
            </View>
          );
        })}
      </View>
      {showReadout ? (
        <Text variant="display" color={value === null ? colors.textMuted : color}>
          {value === null ? copy.score.empty : value.toFixed(1)}
        </Text>
      ) : null}
    </View>
  );
}
