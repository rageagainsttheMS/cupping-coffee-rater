import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { CONTACT_EMAIL } from "@/lib/links";
import { mix } from "@/lib/theme/contrast";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** Shown on sign-in, in place of the usual error, when a moderator has banned the account. */
export function SuspendedNotice() {
  const { colors } = useTheme();
  const errors = copy.auth.errors;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: mix(colors.danger, colors.surface, 0.88),
      }}
    >
      <MaterialCommunityIcons name="alert-outline" size={22} color={colors.danger} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="bodyStrong" color={colors.danger}>
          {errors.bannedTitle}
        </Text>
        <Text color={colors.danger}>{errors.bannedBody(CONTACT_EMAIL)}</Text>
      </View>
    </View>
  );
}
