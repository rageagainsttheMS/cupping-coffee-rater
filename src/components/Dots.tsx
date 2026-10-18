import { View } from "react-native";
import { copy } from "@/lib/copy/en";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** Page indicator: the current page is a longer pill. */
export function Dots({ count, active }: { count: number; active: number }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityLabel={copy.onboarding.pageDots(active + 1, count)}
      style={{ flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center" }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            width: i === active ? 24 : 6,
            borderRadius: 3,
            backgroundColor: i === active ? colors.primary : colors.border,
          }}
        />
      ))}
    </View>
  );
}
