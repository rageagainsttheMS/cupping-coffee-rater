import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type Props = {
  message: string;
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
  /** How long it stays before dismissing itself. */
  durationMs?: number;
};

/** A short message with one action (e.g. Undo) that goes away by itself. */
export function Snackbar({ message, actionLabel, onAction, onDismiss, durationMs = 5000 }: Props) {
  const { colors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        position: "absolute",
        left: spacing.lg,
        right: spacing.lg,
        bottom: spacing.lg,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingLeft: spacing.lg,
        borderRadius: radius.md,
        backgroundColor: colors.text,
      }}
    >
      <Text variant="body" color={colors.background} numberOfLines={2} style={{ flex: 1 }}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onAction}
        style={{ minHeight: 44, minWidth: 44, justifyContent: "center", padding: spacing.md }}
      >
        <Text variant="label" color={colors.background}>
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}
