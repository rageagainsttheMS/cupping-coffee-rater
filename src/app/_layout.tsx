import { Fraunces_600SemiBold, Fraunces_700Bold } from "@expo-google-fonts/fraunces";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorFallback } from "@/components/ErrorFallback";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AuthLinkHandler } from "@/features/auth/AuthLinkHandler";
import { AuthProvider, useAuth } from "@/features/auth/AuthProvider";
import { OnboardingProvider } from "@/features/auth/OnboardingProvider";
import { ProfileError } from "@/features/auth/ProfileError";
import { MapFiltersProvider } from "@/features/map/MapFiltersContext";
import { useStage } from "@/features/auth/useStage";
import { queryClient, subscribeQueryManagers } from "@/lib/query";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  // `development` / `preview` / `production`; EAS builds can set EXPO_PUBLIC_APP_ENV.
  environment: process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "production"),
  // The app collects user content and location, so keep IP addresses and other PII out of events.
  sendDefaultPii: false,
  // Lower this in production once there is real traffic.
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  // Don't report from local development unless a DSN is set.
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
});

// Hold the splash screen until the fonts and the saved session are ready.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
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
          <Sentry.ErrorBoundary
            fallback={({ resetError }) => <ErrorFallback onRetry={resetError} />}
          >
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
          </Sentry.ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

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
      <OfflineBanner />
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
            <Stack.Screen name="my-reviews" />
            <Stack.Screen name="appearance" />
            <Stack.Screen name="account" />
            <Stack.Screen name="blocked-users" />
            <Stack.Screen name="delete-account" />
            <Stack.Screen name="help" />
            <Stack.Screen name="moderation/index" />
            <Stack.Screen name="moderation/[reviewId]" />
            <Stack.Screen name="review" options={{ presentation: "fullScreenModal" }} />
          </Stack.Protected>
          <Stack.Screen name="index" />
        </Stack>
      </MapFiltersProvider>
    </>
  );
}
