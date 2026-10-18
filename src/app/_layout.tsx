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
import { AuthProvider } from "@/features/auth/AuthProvider";
import { queryClient, subscribeQueryManagers } from "@/lib/query";
import { ThemeProvider, useTheme } from "@/lib/theme/ThemeProvider";

// Hold the splash screen until the fonts are ready.
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

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hide();
  }, [fontsLoaded, fontError]);

  useEffect(() => subscribeQueryManagers(), []);

  // On a font error the app still opens, using the system font.
  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <BottomSheetModalProvider>
                <ThemedStack />
              </BottomSheetModalProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedStack() {
  const { colors, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      >
        <Stack.Screen name="review" options={{ presentation: "fullScreenModal" }} />
      </Stack>
    </>
  );
}
