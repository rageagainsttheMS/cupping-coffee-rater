import type { TextProps } from "react-native";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = Omit<TextProps, "onPress"> & {
  onPress?: () => void;
  variant?: "body" | "bodyStrong" | "label" | "caption";
};

/** Underlined brown text that can sit inside a sentence. */
export function LinkText({ onPress, variant = "bodyStrong", style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="link"
      variant={variant}
      color={colors.primary}
      onPress={onPress}
      style={[{ textDecorationLine: "underline" }, style]}
      {...rest}
    />
  );
}
