import { Stack } from "expo-router";
import { useStage } from "@/features/auth/useStage";

/** Sign in, create account and forgot password. A reset link swaps these for the reset screen. */
export default function AuthLayout() {
  const stage = useStage();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={stage !== "reset"}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
      </Stack.Protected>
      <Stack.Protected guard={stage === "reset"}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
    </Stack>
  );
}
