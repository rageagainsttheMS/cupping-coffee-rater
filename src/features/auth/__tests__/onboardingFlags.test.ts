import { loadOnboardingFlags, saveOnboardingFlag } from "../onboardingFlags";
import type { KeyValueStorage } from "../onboardingFlags";

function memoryStorage(
  initial: Record<string, string> = {},
): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: async (key) => data[key] ?? null,
    setItem: async (key, value) => {
      data[key] = value;
    },
  };
}

describe("onboarding flags", () => {
  it("start false on a fresh install", async () => {
    expect(await loadOnboardingFlags(memoryStorage())).toEqual({
      onboardingSeen: false,
      locationStepDone: false,
    });
  });

  it("are saved and loaded again", async () => {
    const storage = memoryStorage();
    await saveOnboardingFlag(storage, "onboardingSeen");
    expect(await loadOnboardingFlags(storage)).toEqual({
      onboardingSeen: true,
      locationStepDone: false,
    });
    await saveOnboardingFlag(storage, "locationStepDone");
    expect(await loadOnboardingFlags(storage)).toEqual({
      onboardingSeen: true,
      locationStepDone: true,
    });
  });

  it("fall back to false when storage fails", async () => {
    const broken: KeyValueStorage = {
      getItem: async () => {
        throw new Error("storage unavailable");
      },
      setItem: async () => {
        throw new Error("storage unavailable");
      },
    };
    expect(await loadOnboardingFlags(broken)).toEqual({
      onboardingSeen: false,
      locationStepDone: false,
    });
    await expect(saveOnboardingFlag(broken, "onboardingSeen")).resolves.toBeUndefined();
  });
});
