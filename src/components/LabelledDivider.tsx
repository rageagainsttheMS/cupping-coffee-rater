import { View } from "react-native";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

/** A line with a word in the middle, e.g. "or with email". */
export function LabelledDivider({ label }: { label: string }) {
  const { colors } = useTheme();
  const line = { flex: 1, height: 1, backgroundColor: colors.border };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View style={line} />
      <Text variant="label" muted>
        {label}
      </Text>
      <View style={line} />
    </View>
  );
}
