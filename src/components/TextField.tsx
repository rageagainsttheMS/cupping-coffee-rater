import { TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { fonts, radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="label" muted>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...rest}
        style={[
          {
            minHeight: 48,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: error ? colors.danger : colors.border,
            backgroundColor: colors.surface,
            color: colors.text,
            fontFamily: fonts.body,
            fontSize: 16,
          },
          style,
        ]}
      />
      {error ? (
        <Text variant="caption" color={colors.danger}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
