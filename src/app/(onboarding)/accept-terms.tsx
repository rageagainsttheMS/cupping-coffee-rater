import { useState } from "react";
import { View } from "react-native";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/Button";
import { LinkText } from "@/components/LinkText";
import { Screen } from "@/components/Screen";
import { TermsCheckbox } from "@/components/TermsCheckbox";
import { Text } from "@/components/Text";
import { useAuth } from "@/features/auth/AuthProvider";
import { authErrorMessage } from "@/features/auth/authErrors";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { useTheme } from "@/lib/theme/ThemeProvider";

/** Shown once to people who signed in with Google or Apple, since they skipped the sign-up form. */
export default function AcceptTermsScreen() {
  const { acceptTerms, signOut } = useAuth();
  const { colors } = useTheme();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const text = copy.auth.terms;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await acceptTerms();
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, padding: spacing.xl, gap: spacing.lg }}>
        <AppLogo />
        <Text variant="display">{text.title}</Text>
        <Text muted>{text.body}</Text>
        <TermsCheckbox checked={agreed} onChange={setAgreed} />
        {error ? (
          <Text variant="label" color={colors.danger}>
            {error}
          </Text>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button label={text.submit} disabled={!agreed} busy={busy} onPress={() => void submit()} />
        <View style={{ alignItems: "center" }}>
          <LinkText onPress={() => void signOut()}>{text.signOut}</LinkText>
        </View>
      </View>
    </Screen>
  );
}
