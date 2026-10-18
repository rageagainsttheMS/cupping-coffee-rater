import { classifyGoogleError } from "../googleHelpers";

const codes = {
  cancelled: "CANCELLED",
  inProgress: "IN_PROGRESS",
  playServices: "NO_PLAY_SERVICES",
};

describe("classifyGoogleError", () => {
  it("recognises the person closing the Google sheet", () => {
    expect(classifyGoogleError({ code: "CANCELLED" }, codes)).toBe("cancelled");
  });

  it("recognises a sign-in that is already running", () => {
    expect(classifyGoogleError({ code: "IN_PROGRESS" }, codes)).toBe("in_progress");
  });

  it("recognises missing or outdated Google Play services", () => {
    expect(classifyGoogleError({ code: "NO_PLAY_SERVICES" }, codes)).toBe("play_services");
  });

  it("treats anything else as an ordinary error", () => {
    expect(classifyGoogleError({ code: "OTHER" }, codes)).toBe("other");
    expect(classifyGoogleError(new Error("boom"), codes)).toBe("other");
    expect(classifyGoogleError(null, codes)).toBe("other");
    expect(classifyGoogleError("CANCELLED", codes)).toBe("other");
  });

  it("does not mistake a missing code for a missing constant", () => {
    expect(
      classifyGoogleError(
        {},
        { cancelled: undefined, inProgress: undefined, playServices: undefined },
      ),
    ).toBe("other");
  });
});
