import { Pressable } from "react-native";
import type { PressableProps } from "react-native";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  variant?: "primary" | "secondary";
};

export function Button({ label, variant = "primary", disabled, style, ...rest }: Props) {
  const { colors } = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={(state) => [
        {
          minHeight: 48,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: primary ? colors.primary : "transparent",
          borderWidth: primary ? 0 : 1,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : state.pressed ? 0.85 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text variant="bodyStrong" color={primary ? colors.onPrimary : colors.text}>
        {label}
      </Text>
    </Pressable>
  );
}
