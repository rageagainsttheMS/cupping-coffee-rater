import { useAuth } from "./AuthProvider";
import { useOnboarding } from "./OnboardingProvider";
import { resolveStage } from "./stage";
import type { Stage } from "./stage";

/** Where this person belongs right now. See `resolveStage`. */
export function useStage(): Stage {
  const auth = useAuth();
  const onboarding = useOnboarding();
  return resolveStage({
    flagsLoaded: onboarding.flagsLoaded,
    sessionLoaded: auth.sessionLoaded,
    hasSession: !!auth.session,
    profileLoaded: auth.profileLoaded,
    termsAccepted: !!auth.profile?.accepted_terms_at,
    passwordRecovery: auth.passwordRecovery,
    onboardingSeen: onboarding.onboardingSeen,
    locationStepDone: onboarding.locationStepDone,
  });
}
