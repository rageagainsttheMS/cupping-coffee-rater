import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import type { ComponentProps } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Button } from "./Button";
import { Text } from "./Text";

export type MenuItem = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  /** Red, for an action that removes something. It should still ask before doing it. */
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  items: MenuItem[];
  onClose: () => void;
};

/**
 * The "⋮" menu: a sheet from the bottom with one row per action and Cancel. A chosen action runs
 * once the sheet has gone, because iOS cannot show an alert or another sheet over a closing one.
 */
export function MenuSheet({ visible, title, subtitle, items, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pending = useRef<(() => void) | null>(null);

  // Screens clear what the menu is for as it closes; keep showing the last contents while it slides away.
  const [shown, setShown] = useState({ title, subtitle, items });
  if (visible && (shown.title !== title || shown.subtitle !== subtitle || shown.items !== items)) {
    setShown({ title, subtitle, items });
  }

  const runPending = () => {
    const action = pending.current;
    pending.current = null;
    action?.();
  };

  // iOS calls onDismiss when the sheet has finished closing. Android has no onDismiss, but it can
  // open the next thing straight away.
  useEffect(() => {
    if (visible || Platform.OS === "ios") return;
    const action = pending.current;
    pending.current = null;
    action?.();
  }, [visible]);

  const choose = (item: MenuItem) => {
    pending.current = item.onPress;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={runPending}
      statusBarTranslucent
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityLabel={copy.common.cancel}
          onPress={onClose}
          style={{ ...fill, backgroundColor: "rgba(0,0,0,0.4)" }}
        />
        <View
          style={{
            gap: spacing.md,
            padding: spacing.lg,
            paddingBottom: spacing.lg + insets.bottom,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            backgroundColor: colors.background,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 5,
              borderRadius: 3,
              backgroundColor: colors.border,
            }}
          />
          <View>
            <Text variant="heading" accessibilityRole="header" numberOfLines={1}>
              {shown.title}
            </Text>
            {shown.subtitle ? (
              <Text muted numberOfLines={1}>
                {shown.subtitle}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingHorizontal: spacing.lg,
            }}
          >
            {shown.items.map((item, index) => {
              const color = item.destructive ? colors.danger : colors.text;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  onPress={() => choose(item)}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.md,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={item.destructive ? colors.danger : colors.textMuted}
                  />
                  <Text variant="bodyStrong" color={color}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Button label={copy.common.cancel} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;
