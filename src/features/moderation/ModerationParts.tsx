import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { View } from "react-native";
import type { ComponentProps, ReactNode } from "react";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { mix } from "@/lib/theme/contrast";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/**
 * A pale red background for warnings, worked out from the theme so it suits light and dark. The
 * Profile row's badge uses the same mix.
 */
export function useDangerTint(): string {
  const { colors } = useTheme();
  return mix(colors.danger, colors.surface, 0.88);
}

/** A small rounded label. `danger` is for report counts and anything past the 24-hour target. */
export function Pill({
  label,
  icon,
  tone = "plain",
}: {
  label: string;
  icon?: IconName;
  tone?: "plain" | "danger";
}) {
  const { colors } = useTheme();
  const dangerTint = useDangerTint();
  const color = tone === "danger" ? colors.danger : colors.textMuted;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: tone === "danger" ? dangerTint : colors.border,
      }}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={14} color={color} /> : null}
      <Text variant="label" color={color}>
        {label}
      </Text>
    </View>
  );
}

/** The back button and screen title, as on Blocked users. */
export function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg }}
    >
      <CircleButton icon="arrow-left" accessibilityLabel={copy.common.back} onPress={onBack} />
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

/** A centred title and line for empty and error states, with an optional button under it. */
export function Message({
  title,
  text,
  children,
}: {
  title?: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <View style={{ padding: spacing.xl, gap: spacing.md, alignItems: "center" }}>
      {title ? (
        <Text variant="heading" style={{ textAlign: "center" }}>
          {title}
        </Text>
      ) : null}
      <Text muted style={{ textAlign: "center" }}>
        {text}
      </Text>
      {children}
    </View>
  );
}

/** The author's initial in a filled circle. */
export function Avatar({ name }: { name: string }) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.primary,
      }}
    >
      <Text variant="heading" color={colors.onPrimary}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
