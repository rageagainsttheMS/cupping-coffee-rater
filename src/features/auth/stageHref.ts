import type { Stage } from "./stage";

/** The screen each stage starts on. `null` while still loading. */
export function stageHref(stage: Stage) {
  switch (stage) {
    case "welcome":
      return "/welcome";
    case "auth":
      return "/sign-in";
    case "reset":
      return "/reset-password";
    case "terms":
      return "/accept-terms";
    case "location":
      return "/location";
    case "app":
      return "/map";
    case "loading":
      return null;
  }
}
