import { View } from "react-native";
import { Text } from "@/components/Text";
import { useTheme } from "@/lib/theme/ThemeProvider";

const USER_BLUE = "#2F6FE4";
const OUTER = 290;
const INNER = 190;

/** Offsets from the centre, an example score and how to colour it. Not real data. */
const PINS = [
  { x: -68, y: -78, score: "4.3", good: true },
  { x: 92, y: -42, score: "4.4", good: true },
  { x: -52, y: 66, score: "4.6", good: true },
  { x: 76, y: 74, score: "3.8", good: false },
] as const;

/** Rings and example pins around the user's position, for the location step. */
export function RadiusIllustration({ height }: { height: number }) {
  const { colors, metrics } = useTheme();
  const coffee = metrics.coffee;
  const centre = (size: number) => ({
    position: "absolute" as const,
    left: "50%" as const,
    top: "50%" as const,
    width: size,
    height: size,
    marginLeft: -size / 2,
    marginTop: -size / 2,
    borderRadius: size / 2,
  });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height, overflow: "hidden", backgroundColor: coffee.tint }}
    >
      <View
        style={{
          position: "absolute",
          left: "-10%",
          top: "30%",
          width: "130%",
          height: 16,
          backgroundColor: colors.surface,
          opacity: 0.8,
          transform: [{ rotate: "-8deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: "55%",
          top: "-10%",
          width: 16,
          height: "130%",
          backgroundColor: colors.surface,
          opacity: 0.8,
          transform: [{ rotate: "12deg" }],
        }}
      />
      <View
        style={[centre(OUTER), { borderWidth: 1, borderColor: colors.textMuted, opacity: 0.5 }]}
      />
      <View
        style={[
          centre(INNER),
          { borderWidth: 1, borderStyle: "dashed", borderColor: colors.textMuted, opacity: 0.6 },
        ]}
      />

      {PINS.map((pin) => (
        <View
          key={pin.score}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            marginLeft: pin.x - 17,
            marginTop: pin.y - 17,
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pin.good ? coffee.strong : coffee.bands.low.bg,
            borderWidth: 2,
            borderColor: colors.surface,
          }}
        >
          <Text variant="caption" color={pin.good ? coffee.onStrong : coffee.bands.low.fg}>
            {pin.score}
          </Text>
        </View>
      ))}

      <View
        style={[
          centre(26),
          { backgroundColor: USER_BLUE, borderWidth: 4, borderColor: colors.surface },
        ]}
      />
    </View>
  );
}
