import { onlineManager } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** Whether the phone has a connection, as the query client sees it (see `subscribeQueryManagers`). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (notify) => onlineManager.subscribe(notify),
    () => onlineManager.isOnline(),
    () => true,
  );
}

/** A thin strip under the status bar while the phone is offline. Draws nothing when online. */
export function OfflineBanner() {
  const online = useIsOnline();
  const { colors } = useTheme();
  if (online) return null;
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text variant="caption" muted>
        {copy.offline.banner}
      </Text>
    </View>
  );
}
