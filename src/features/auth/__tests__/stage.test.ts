import { resolveStage } from "../stage";
import type { StageInput } from "../stage";

const ready: StageInput = {
  flagsLoaded: true,
  sessionLoaded: true,
  hasSession: true,
  profileLoaded: true,
  termsAccepted: true,
  passwordRecovery: false,
  onboardingSeen: true,
  locationStepDone: true,
};

describe("resolveStage", () => {
  it("waits while the saved flags or the session are still loading", () => {
    expect(resolveStage({ ...ready, flagsLoaded: false })).toBe("loading");
    expect(resolveStage({ ...ready, sessionLoaded: false })).toBe("loading");
  });

  it("shows the welcome pitch to a signed-out person who has not seen it", () => {
    expect(
      resolveStage({ ...ready, hasSession: false, profileLoaded: false, onboardingSeen: false }),
    ).toBe("welcome");
  });

  it("shows sign in once the pitch has been seen", () => {
    expect(resolveStage({ ...ready, hasSession: false, profileLoaded: false })).toBe("auth");
  });

  it("waits for the profile after sign-in", () => {
    expect(resolveStage({ ...ready, profileLoaded: false })).toBe("loading");
  });

  it("asks for the terms when the profile has none recorded", () => {
    expect(resolveStage({ ...ready, termsAccepted: false })).toBe("terms");
  });

  it("asks for location after the terms", () => {
    expect(resolveStage({ ...ready, locationStepDone: false })).toBe("location");
  });

  it("goes to the app when everything is done", () => {
    expect(resolveStage(ready)).toBe("app");
  });

  it("signing out and in again skips onboarding", () => {
    expect(resolveStage({ ...ready, hasSession: false, profileLoaded: false })).toBe("auth");
    expect(resolveStage(ready)).toBe("app");
  });

  it("puts a password-recovery session on the reset screen, whatever else is pending", () => {
    expect(resolveStage({ ...ready, passwordRecovery: true })).toBe("reset");
    expect(
      resolveStage({
        ...ready,
        passwordRecovery: true,
        termsAccepted: false,
        locationStepDone: false,
      }),
    ).toBe("reset");
  });

  it("ignores the recovery flag when there is no session", () => {
    expect(
      resolveStage({ ...ready, hasSession: false, profileLoaded: false, passwordRecovery: true }),
    ).toBe("auth");
  });
});
