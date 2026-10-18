import { stageHref } from "../stageHref";
import type { Stage } from "../stage";

describe("stageHref", () => {
  it.each<[Stage, string]>([
    ["welcome", "/welcome"],
    ["auth", "/sign-in"],
    ["reset", "/reset-password"],
    ["terms", "/accept-terms"],
    ["location", "/location"],
    ["app", "/map"],
  ])("sends the %s stage to %s", (stage, href) => {
    expect(stageHref(stage)).toBe(href);
  });

  it("has nowhere to send a person while loading", () => {
    expect(stageHref("loading")).toBeNull();
  });
});
