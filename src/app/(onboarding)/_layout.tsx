import { Stack } from "expo-router";
import { useStage } from "@/features/auth/useStage";

/** Each step is only reachable at its own stage, so the layout decides what shows. */
export default function OnboardingLayout() {
  const stage = useStage();
  return (
    <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
      <Stack.Protected guard={stage === "welcome"}>
        <Stack.Screen name="welcome" />
      </Stack.Protected>
      <Stack.Protected guard={stage === "terms"}>
        <Stack.Screen name="accept-terms" />
      </Stack.Protected>
      <Stack.Protected guard={stage === "location"}>
        <Stack.Screen name="location" />
      </Stack.Protected>
    </Stack>
  );
}
