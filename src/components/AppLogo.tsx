import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";
import { radius } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** The cup mark on a rounded espresso square. A placeholder until the real logo exists. */
export function AppLogo({ size = 56 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3 + radius.sm / 4,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
      }}
    >
      <MaterialCommunityIcons name="coffee-outline" size={size * 0.5} color={colors.onPrimary} />
    </View>
  );
}
