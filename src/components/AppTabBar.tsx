import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router } from "expo-router";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { Text } from "./Text";

type GlyphName = ComponentProps<typeof MaterialCommunityIcons>["name"];

const TABS: Record<string, { label: string; icon: GlyphName; iconActive: GlyphName }> = {
  map: { label: copy.tabs.map, icon: "map-outline", iconActive: "map" },
  saved: { label: copy.tabs.saved, icon: "heart-outline", iconActive: "heart" },
  rate: { label: copy.tabs.rate, icon: "plus", iconActive: "plus" },
  profile: { label: copy.tabs.profile, icon: "account-outline", iconActive: "account" },
};

const RATE_BUTTON = 56;

/** Map · Saved · raised "+ Rate" · Profile. "+ Rate" opens the review modal instead of a tab. */
export function AppTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, spacing.sm),
        paddingTop: spacing.sm,
      }}
    >
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;

        if (route.name === "rate") {
          return (
            <View key={route.key} style={{ flex: 1, alignItems: "center" }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={copy.a11y.rateCafe}
                onPress={() => router.push("/review")}
                style={{
                  width: RATE_BUTTON,
                  height: RATE_BUTTON,
                  marginTop: -RATE_BUTTON / 2,
                  borderRadius: radius.pill,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.primary,
                  borderWidth: 4,
                  borderColor: colors.background,
                }}
              >
                <MaterialCommunityIcons name="plus" size={28} color={colors.onPrimary} />
              </Pressable>
              <Text variant="caption" muted style={{ marginTop: 2 }}>
                {tab.label}
              </Text>
            </View>
          );
        }

        const focused = state.index === index;
        const color = focused ? colors.primary : colors.textMuted;
        const onPress = () => {
          const event = emitter.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={{ flex: 1, minHeight: 44, alignItems: "center", gap: 2 }}
          >
            <MaterialCommunityIcons
              name={focused ? tab.iconActive : tab.icon}
              size={24}
              color={color}
            />
            <Text variant="caption" color={color}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
