/**
 * Which part of the app a person belongs in right now. The root layout shows only the screens that
 * match the current stage, and Expo Router redirects anything else.
 *
 * - `loading`: saved flags, session or profile are still being read.
 * - `welcome`: signed out and has not seen the pitch.
 * - `auth`: signed out (sign in, create account, forgot password).
 * - `reset`: arrived from a password reset link, choosing a new password.
 * - `terms`: signed in but has not agreed to the terms (social sign-in).
 * - `location`: signed in, terms agreed, location step still to do.
 * - `app`: everything done.
 */
export type Stage = "loading" | "welcome" | "auth" | "reset" | "terms" | "location" | "app";

export type StageInput = {
  flagsLoaded: boolean;
  sessionLoaded: boolean;
  hasSession: boolean;
  profileLoaded: boolean;
  termsAccepted: boolean;
  passwordRecovery: boolean;
  onboardingSeen: boolean;
  locationStepDone: boolean;
};

export function resolveStage(input: StageInput): Stage {
  if (!input.flagsLoaded || !input.sessionLoaded) return "loading";
  if (!input.hasSession) return input.onboardingSeen ? "auth" : "welcome";
  if (input.passwordRecovery) return "reset";
  if (!input.profileLoaded) return "loading";
  if (!input.termsAccepted) return "terms";
  if (!input.locationStepDone) return "location";
  return "app";
}
