import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable } from "react-native";
import type { ComponentProps } from "react";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Props = {
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  accessibilityLabel: string;
};

/** A round icon button, e.g. the back arrow at the top left of a screen. */
export function CircleButton({ icon, onPress, accessibilityLabel }: Props) {
  const { colors, metrics } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: metrics.coffee.tint,
      }}
    >
      <MaterialCommunityIcons name={icon} size={24} color={colors.text} />
    </Pressable>
  );
}
