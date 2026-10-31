import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import type { ComponentProps, ReactNode } from "react";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { mix } from "@/lib/theme/contrast";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

/** A small caps heading and a rounded card holding its rows, with a divider between rows. */
export function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  const { colors } = useTheme();
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text
          variant="label"
          muted
          accessibilityRole="header"
          style={{ paddingHorizontal: spacing.sm, letterSpacing: 1, textTransform: "uppercase" }}
        >
          {title}
        </Text>
      ) : null}
      <View
        style={{
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
        }}
      >
        {rows.map((row, index) => (
          <View
            key={index}
            style={{ borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border }}
          >
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  label: string;
  /** Shown on the right, before the chevron, e.g. a count or "While using". */
  value?: string;
  /** `danger` colours the row for an action that can't be undone. */
  tone?: "danger";
  /** A red pill in place of the value, for something waiting on you, e.g. "4 open". */
  badge?: string;
  onPress: () => void;
};

export function SettingsRow({ icon, label, value, tone, badge, onPress }: RowProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.profile.rowLabel(label, badge ?? value ?? "")}
      onPress={onPress}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingVertical: spacing.md,
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={tone === "danger" ? colors.danger : colors.textMuted}
      />
      <Text
        variant="bodyStrong"
        color={tone === "danger" ? colors.danger : undefined}
        style={{ flex: 1 }}
      >
        {label}
      </Text>
      {badge ? (
        <View
          style={{
            paddingHorizontal: spacing.md,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: mix(colors.danger, colors.surface, 0.88),
          }}
        >
          <Text variant="label" color={colors.danger}>
            {badge}
          </Text>
        </View>
      ) : value ? (
        <Text muted numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
    </Pressable>
  );
}
