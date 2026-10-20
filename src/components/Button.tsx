import { ActivityIndicator, Pressable } from "react-native";
import type { PressableProps } from "react-native";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  /** `dark` is the near-black button used for the main action on onboarding screens. */
  variant?: "primary" | "dark" | "secondary" | "danger";
  /** Shows a spinner and ignores presses, e.g. while a request is running. */
  busy?: boolean;
};

export function Button({ label, variant = "primary", busy, disabled, style, ...rest }: Props) {
  const { colors } = useTheme();
  const inactive = disabled || busy;
  const background =
    variant === "primary"
      ? colors.primary
      : variant === "dark"
        ? colors.text
        : variant === "danger"
          ? colors.danger
          : "transparent";
  const foreground =
    variant === "primary" || variant === "danger"
      ? colors.onPrimary
      : variant === "dark"
        ? colors.background
        : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!busy }}
      disabled={inactive}
      {...rest}
      style={(state) => [
        {
          minHeight: 52,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.pill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: background,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : state.pressed ? 0.85 : 1,
        },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <Text variant="bodyStrong" color={foreground}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
