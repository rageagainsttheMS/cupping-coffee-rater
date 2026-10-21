import { Redirect } from "expo-router";

/**
 * The target of the confirmation email link (`coffeerater://auth-callback`). `AuthLinkHandler`
 * turns the link into a session; this route only stops Expo Router showing "Unmatched route" and
 * hands over to the entry point, which sends the person to the screen their stage starts on.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
