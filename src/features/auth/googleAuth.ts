import { copy } from "@/lib/copy/en";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "./authErrors";
import { classifyGoogleError } from "./googleHelpers";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/**
 * Google sign-in is on only once a web client ID is set (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`), and
 * only in a build that includes the native module. Until then the button is hidden.
 */
export const googleSignInConfigured = !!webClientId;

// The native module is loaded on first use, never at startup. A build made before the module was
// added would otherwise fail on launch, and only people with Google set up pay for loading it.
let configured = false;
async function loadGoogle() {
  const google = await import("@react-native-google-signin/google-signin");
  if (!configured) {
    google.GoogleSignin.configure({ webClientId, iosClientId });
    configured = true;
  }
  return google;
}

/** Shows the Google account sheet, then signs in to Supabase. Resolves without error if cancelled. */
export async function signInWithGoogle(): Promise<void> {
  const { GoogleSignin, isSuccessResponse } = await loadGoogle();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return; // the person closed the sheet

  const token = response.data.idToken;
  if (!token) throw new Error("google_no_id_token");

  // Google's token carries the person's name, which the profile trigger reads as `full_name`.
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token });
  if (error) throw error;
}

/** Turns an error from `signInWithGoogle` into text to show, or `null` when nothing should be shown. */
export async function googleErrorMessage(error: unknown): Promise<string | null> {
  const { statusCodes } = await import("@react-native-google-signin/google-signin");
  const kind = classifyGoogleError(error, {
    cancelled: statusCodes.SIGN_IN_CANCELLED,
    inProgress: statusCodes.IN_PROGRESS,
    playServices: statusCodes.PLAY_SERVICES_NOT_AVAILABLE,
  });
  if (kind === "cancelled" || kind === "in_progress") return null;
  if (kind === "play_services") return copy.auth.errors.playServices;
  return authErrorMessage(error);
}

/** Clears Google's own remembered account, so the next sign-in offers the account chooser again. */
export async function signOutOfGoogle(): Promise<void> {
  if (!googleSignInConfigured) return;
  try {
    const { GoogleSignin } = await loadGoogle();
    await GoogleSignin.signOut();
  } catch {
    // Not signed in with Google, or the module is missing. Nothing to clear.
  }
}
