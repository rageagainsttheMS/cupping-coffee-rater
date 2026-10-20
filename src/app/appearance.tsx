import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppearanceView } from "@/features/profile/AppearanceView";
import { useThemePreference } from "@/lib/theme/ThemeProvider";

export default function AppearanceScreen() {
  const { preference, setPreference } = useThemePreference();
  return (
    <Screen>
      <AppearanceView selected={preference} onSelect={setPreference} onBack={() => router.back()} />
    </Screen>
  );
}
