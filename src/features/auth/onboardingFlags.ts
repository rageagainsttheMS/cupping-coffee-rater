export type KeyValueStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
};

export type OnboardingFlags = {
  /** The welcome pitch has been seen (or skipped). Never shown again, even after sign-out. */
  onboardingSeen: boolean;
  /** The location step is done: they allowed location or chose "Not now". */
  locationStepDone: boolean;
};

const KEYS: Record<keyof OnboardingFlags, string> = {
  onboardingSeen: "onboarding-seen:v1",
  locationStepDone: "location-step-done:v1",
};

export async function loadOnboardingFlags(storage: KeyValueStorage): Promise<OnboardingFlags> {
  const read = async (key: string) => {
    try {
      return (await storage.getItem(key)) === "1";
    } catch {
      return false;
    }
  };
  return {
    onboardingSeen: await read(KEYS.onboardingSeen),
    locationStepDone: await read(KEYS.locationStepDone),
  };
}

export async function saveOnboardingFlag(
  storage: KeyValueStorage,
  flag: keyof OnboardingFlags,
): Promise<void> {
  try {
    await storage.setItem(KEYS[flag], "1");
  } catch {
    // The flag still holds in memory for this session. It is asked again next launch.
  }
}
