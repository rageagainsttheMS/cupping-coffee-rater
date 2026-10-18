import { View } from "react-native";
import type { ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Props = ViewProps & {
  /** Skip the bottom inset when a tab bar already handles it. */
  noBottomInset?: boolean;
};

/** Screen background plus safe-area padding. */
export function Screen({ noBottomInset, style, ...rest }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingBottom: noBottomInset ? 0 : insets.bottom,
        },
        style,
      ]}
    />
  );
}
