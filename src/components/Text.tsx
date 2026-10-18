import { Text as RNText } from "react-native";
import type { TextProps } from "react-native";
import { typeScale } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Props = TextProps & {
  variant?: keyof typeof typeScale;
  muted?: boolean;
  color?: string;
};

export function Text({ variant = "body", muted, color, style, ...rest }: Props) {
  const theme = useTheme();
  const textColor = color ?? (muted ? theme.colors.textMuted : theme.colors.text);
  return <RNText {...rest} style={[typeScale[variant], { color: textColor }, style]} />;
}
