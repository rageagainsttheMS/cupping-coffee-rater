import { router } from "expo-router";
import * as Linking from "expo-linking";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/Button";
import { CircleButton } from "@/components/CircleButton";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authErrors";
import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

export default function AccountScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const text = copy.profile.accountScreen;
  const email = session?.user.email ?? "";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  const sendLink = async () => {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: Linking.createURL("reset-password"),
    });
    setBusy(false);
    setMessage(
      error
        ? { text: authErrorMessage(error) || text.failed, failed: true }
        : { text: text.sent(email), failed: false },
    );
  };

  return (
    <Screen>
      <View style={{ padding: spacing.lg, gap: spacing.xl }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <CircleButton
            icon="arrow-left"
            accessibilityLabel={copy.common.back}
            onPress={router.back}
          />
          <Text variant="title" accessibilityRole="header">
            {text.title}
          </Text>
        </View>

        <View style={{ gap: spacing.xs }}>
          <Text variant="label" muted>
            {text.email}
          </Text>
          <Text>{email}</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Text variant="heading">{text.changePassword}</Text>
          <Text muted>{text.changePasswordBody}</Text>
          <Button label={text.sendLink} busy={busy} onPress={() => void sendLink()} />
          {message ? (
            <Text
              color={message.failed ? colors.danger : colors.text}
              accessibilityLiveRegion="polite"
            >
              {message.text}
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
