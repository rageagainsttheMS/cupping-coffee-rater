import { COMMENT_MAX, COMMENT_MIN } from "@/domain/limits";
import { WIZARD_STEPS } from "./types";
import type { WizardStep, WizardValues } from "./types";

export const TOTAL_STEPS = WIZARD_STEPS.length;

/** The route each step lives at, in `app/review/`. */
export const STEP_ROUTES = {
  cafe: "/review",
  drink: "/review/drink",
  rate: "/review/rate",
  extras: "/review/extras",
  comment: "/review/comment",
  details: "/review/details",
} as const satisfies Record<WizardStep, string>;

/** "Step 3 of 6" counts from 1. */
export function stepNumber(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step) + 1;
}

export function nextStep(step: WizardStep): WizardStep | null {
  return WIZARD_STEPS[WIZARD_STEPS.indexOf(step) + 1] ?? null;
}

export function previousStep(step: WizardStep): WizardStep | null {
  return WIZARD_STEPS[WIZARD_STEPS.indexOf(step) - 1] ?? null;
}

export function commentLength(comment: string): number {
  return comment.trim().length;
}

/** Whether "Continue" is allowed. Coffee is the only required rating; extras are always optional. */
export function canContinue(step: WizardStep, values: WizardValues, drinkIndex: number): boolean {
  const drink = values.drinks[drinkIndex];
  switch (step) {
    case "cafe":
      return values.cafe !== null;
    case "drink":
      return drink?.drinkId != null;
    case "rate":
      return drink?.rating != null;
    case "comment": {
      const length = commentLength(values.comment);
      return length >= COMMENT_MIN && length <= COMMENT_MAX;
    }
    case "extras":
    case "details":
      return true;
  }
}

export type BackTarget = { to: WizardStep | "close"; drinkIndex: number };

/**
 * Where the back button goes. Steps 2 and 3 repeat for each drink, so back from a second drink's
 * "What did you have?" returns to the first drink's rating. From the cafe step, or from the drink
 * step when the cafe was chosen on the cafe page, back closes the wizard.
 */
export function backTarget(
  step: WizardStep,
  drinkIndex: number,
  drinkCount: number,
  cafeLocked: boolean,
): BackTarget {
  switch (step) {
    case "cafe":
      return { to: "close", drinkIndex };
    case "drink":
      if (drinkIndex > 0) return { to: "rate", drinkIndex: drinkIndex - 1 };
      return { to: cafeLocked ? "close" : "cafe", drinkIndex };
    case "rate":
      return { to: "drink", drinkIndex };
    case "extras":
      return { to: "rate", drinkIndex: Math.max(0, drinkCount - 1) };
    case "comment":
      return { to: "extras", drinkIndex };
    case "details":
      return { to: "comment", drinkIndex };
  }
}

/** Which step a route belongs to, for saving the draft. Null for screens that are not steps. */
export function stepFromPath(pathname: string): WizardStep | null {
  const entry = (Object.entries(STEP_ROUTES) as [WizardStep, string][]).find(
    ([, route]) => route === pathname,
  );
  return entry ? entry[0] : null;
}
