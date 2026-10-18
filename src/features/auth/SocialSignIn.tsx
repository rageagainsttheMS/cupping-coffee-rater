import { View } from "react-native";
import { LabelledDivider } from "@/components/LabelledDivider";
import { copy } from "@/lib/copy/en";
import { spacing } from "@/lib/theme/tokens";
import { AppleContinueButton, useAppleAvailable } from "./appleAuth";
import { GoogleContinueButton } from "./GoogleContinueButton";
import { googleSignInConfigured } from "./googleAuth";

/**
 * The social sign-in buttons, with the "or with email" divider under them. Each button appears only
 * where it can work: Google once it is configured, Apple on iPhone. With neither, nothing shows.
 */
export function SocialSignIn({ onError }: { onError: (message: string) => void }) {
  const appleAvailable = useAppleAvailable();
  if (!googleSignInConfigured && !appleAvailable) return null;

  return (
    <View style={{ gap: spacing.md }}>
      {googleSignInConfigured ? <GoogleContinueButton onError={onError} /> : null}
      {appleAvailable ? <AppleContinueButton onError={onError} /> : null}
      <View style={{ marginTop: spacing.xs }}>
        <LabelledDivider label={copy.auth.signIn.orEmail} />
      </View>
    </View>
  );
}
