import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { loadOnboardingFlags, saveOnboardingFlag } from "./onboardingFlags";
import type { OnboardingFlags } from "./onboardingFlags";

type OnboardingContextValue = OnboardingFlags & {
  flagsLoaded: boolean;
  markOnboardingSeen: () => void;
  markLocationStepDone: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

/** Saved-on-the-device progress through onboarding. Survives sign-out. */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<OnboardingFlags>({
    onboardingSeen: false,
    locationStepDone: false,
  });
  const [flagsLoaded, setFlagsLoaded] = useState(false);

  useEffect(() => {
    loadOnboardingFlags(AsyncStorage).then((loaded) => {
      setFlags(loaded);
      setFlagsLoaded(true);
    });
  }, []);

  const mark = useCallback((flag: keyof OnboardingFlags) => {
    setFlags((current) => ({ ...current, [flag]: true }));
    void saveOnboardingFlag(AsyncStorage, flag);
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      ...flags,
      flagsLoaded,
      markOnboardingSeen: () => mark("onboardingSeen"),
      markLocationStepDone: () => mark("locationStepDone"),
    }),
    [flags, flagsLoaded, mark],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return value;
}
