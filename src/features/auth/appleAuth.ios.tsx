import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { authErrorMessage } from "./authErrors";
import { formatAppleName, isAppleCancel } from "./appleHelpers";

/** True when this iPhone can offer Sign in with Apple. */
export function useAppleAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);
  return available;
}

async function signInWithApple(): Promise<void> {
  // Apple gets a hash of the nonce, Supabase gets the original, so it can check the token is fresh.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) throw new Error("apple_no_identity_token");

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;

  // Apple's token has no name, and the name is only sent on the first sign-in, so save it now.
  const name = formatAppleName(credential.fullName);
  if (name && data.user) {
    await supabase.from("profiles").update({ display_name: name }).eq("id", data.user.id);
  }
}

/** The official "Continue with Apple" button. Renders nothing where Apple sign-in is not available. */
export function AppleContinueButton({ onError }: { onError: (message: string) => void }) {
  const { scheme } = useTheme();
  const available = useAppleAvailable();
  if (!available) return null;

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={
        scheme === "dark"
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={26}
      style={{ width: "100%", height: 52 }}
      onPress={async () => {
        try {
          await signInWithApple();
          // The session listener moves the app on from here.
        } catch (error) {
          if (!isAppleCancel(error)) onError(authErrorMessage(error));
        }
      }}
    />
  );
}
