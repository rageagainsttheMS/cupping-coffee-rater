import { View } from "react-native";
import type { ReactNode } from "react";
import { Text } from "@/components/Text";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

type Props = { title: string; children: ReactNode };

/** A titled block on the cafe page. */
export function Section({ title, children }: Props) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

/** A bordered card, for sections that read as one unit. */
export function Card({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: spacing.md,
        gap: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {children}
    </View>
  );
}
