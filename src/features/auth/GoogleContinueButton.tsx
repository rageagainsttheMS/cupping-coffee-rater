import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { copy } from "@/lib/copy/en";
import { radius, spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { googleErrorMessage, signInWithGoogle } from "./googleAuth";

/** "Continue with Google": a white button with an outline, as in the designs. */
export function GoogleContinueButton({ onError }: { onError: (message: string) => void }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);

  const press = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      // The session listener moves the app on from here.
    } catch (error) {
      const message = await googleErrorMessage(error);
      if (message) onError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy }}
      disabled={busy}
      onPress={() => void press()}
      style={({ pressed }) => ({
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {busy ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <MaterialCommunityIcons name="google" size={20} color={colors.text} />
          <Text variant="bodyStrong">{copy.auth.signIn.google}</Text>
        </View>
      )}
    </Pressable>
  );
}
