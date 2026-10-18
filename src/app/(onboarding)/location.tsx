import * as Location from "expo-location";
import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import { Button } from "@/components/Button";
import { LinkText } from "@/components/LinkText";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useOnboarding } from "@/features/auth/OnboardingProvider";
import { RadiusIllustration } from "@/features/onboarding/RadiusIllustration";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/**
 * The last onboarding step. Allowing location is the point of the screen, but "Not now" is always
 * there so nobody is stuck: the map then opens on the default centre (Melbourne CBD).
 */
export default function LocationScreen() {
  const { markLocationStepDone } = useOnboarding();
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const text = copy.location;

  const allow = async () => {
    setBusy(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } finally {
      // Whatever the answer, this step is done. Without permission the map uses the default centre.
      setBusy(false);
      markLocationStepDone();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <RadiusIllustration height={Math.round(height * 0.42)} />
      <Screen style={{ paddingTop: 0 }}>
        <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
          <Text variant="display">{text.title}</Text>
          <Text muted>{text.body}</Text>
          <View style={{ flex: 1 }} />
          <Button label={text.allow} busy={busy} onPress={() => void allow()} />
          <View style={{ alignItems: "center" }}>
            <LinkText onPress={markLocationStepDone}>{text.notNow}</LinkText>
          </View>
          <Text variant="caption" muted style={{ textAlign: "center" }}>
            {text.changeLater}
          </Text>
        </View>
      </Screen>
    </View>
  );
}
