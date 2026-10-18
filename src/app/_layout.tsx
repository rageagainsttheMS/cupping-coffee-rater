import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthLinkHandler } from "@/features/auth/AuthLinkHandler";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { OnboardingProvider } from "@/features/auth/OnboardingProvider";
import { ProfileError } from "@/features/auth/ProfileError";
import { MapFiltersProvider } from "@/features/map/MapFiltersContext";
import { useStage } from "@/features/auth/useStage";
import { queryClient, subscribeQueryManagers } from "@/lib/query";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";

// Hold the splash screen until the fonts and the saved session are ready.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  useEffect(() => subscribeQueryManagers(), []);

  // On a font error the app still opens, using the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <OnboardingProvider>
              <AuthProvider>
                <AuthLinkHandler />
                <BottomSheetModalProvider>
                  <AppShell />
                </BottomSheetModalProvider>
              </AuthProvider>
            </OnboardingProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Chooses which screens exist for the person's current stage (see `resolveStage`). A screen outside
 * the current stage is protected, so Expo Router redirects away from it.
 */
function AppShell() {
  const stage = useStage();
  const { profileError } = useAuth();
  const { colors, scheme } = useTheme();

  useEffect(() => {
    if (stage !== "loading" || profileError) SplashScreen.hide();
  }, [stage, profileError]);

  if (profileError) return <ProfileError />;
  if (stage === "loading") return null;

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <MapFiltersProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Protected guard={stage === "welcome" || stage === "terms" || stage === "location"}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={stage === "welcome" || stage === "auth" || stage === "reset"}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          <Stack.Protected guard={stage === "app"}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="search" />
            <Stack.Screen name="cafe/[id]" />
            <Stack.Screen name="review" options={{ presentation: "fullScreenModal" }} />
          </Stack.Protected>
          <Stack.Screen name="index" />
        </Stack>
      </MapFiltersProvider>
    </>
  );
}
