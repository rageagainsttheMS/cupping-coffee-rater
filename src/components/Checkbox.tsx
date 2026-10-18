import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The text beside the box. It can hold links. */
  children: ReactNode;
  /** Read out in place of the children, since those can be a mix of text and links. */
  accessibilityLabel: string;
  invalid?: boolean;
};

export function Checkbox({ checked, onChange, children, accessibilityLabel, invalid }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked }}
        accessibilityValue={{
          text: checked ? copy.auth.checkbox.checked : copy.auth.checkbox.unchecked,
        }}
        hitSlop={12}
        onPress={() => onChange(!checked)}
        style={{
          width: 24,
          height: 24,
          borderRadius: radius.sm / 2,
          borderWidth: 1.5,
          borderColor: invalid ? colors.danger : checked ? colors.primary : colors.textMuted,
          backgroundColor: checked ? colors.primary : colors.surface,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? (
          <MaterialCommunityIcons name="check" size={16} color={colors.onPrimary} />
        ) : null}
      </Pressable>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
