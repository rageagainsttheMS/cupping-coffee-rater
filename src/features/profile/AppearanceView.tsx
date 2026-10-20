import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Pressable, View } from "react-native";
import { CircleButton } from "@/components/CircleButton";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import type { ThemePreference } from "@/lib/theme/ThemeProvider";
import { SettingsGroup } from "./SettingsList";

type Props = {
  selected: ThemePreference;
  onSelect: (preference: ThemePreference) => void;
  onBack: () => void;
};

const OPTIONS: ThemePreference[] = ["system", "light", "dark"];

/** Choose System, Light or Dark. The current choice has a tick. */
export function AppearanceView({ selected, onSelect, onBack }: Props) {
  const { colors } = useTheme();
  const text = copy.profile.appearanceScreen;

  return (
    <View style={{ padding: spacing.lg, gap: spacing.xl }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <CircleButton icon="arrow-left" accessibilityLabel={copy.common.back} onPress={onBack} />
        <Text variant="title" accessibilityRole="header">
          {copy.profile.appearance}
        </Text>
      </View>

      <SettingsGroup>
        {OPTIONS.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected: option === selected }}
            accessibilityLabel={copy.profile.appearanceOptions[option]}
            onPress={() => onSelect(option)}
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              paddingVertical: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{copy.profile.appearanceOptions[option]}</Text>
              <Text variant="caption" muted>
                {text.hints[option]}
              </Text>
            </View>
            {option === selected ? (
              <MaterialCommunityIcons name="check" size={22} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </SettingsGroup>
    </View>
  );
}
