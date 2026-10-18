import type { DrinkGroup, Milk } from "@/domain/drinks";
import type { Metric } from "@/domain/metrics";

/**
 * Every piece of user-facing text in the app, in one place. Components import `copy` and never
 * contain readable string literals (ESLint enforces this in `src/app` and `src/components`).
 *
 * Text that depends on a value is a function so the wording stays here and stays typed.
 * Drink names and tag labels are not here: they come from the database.
 */
export const copy = {
  common: {
    close: "Close",
  },

  tabs: {
    map: "Map",
    saved: "Saved",
    rate: "Rate",
    profile: "Profile",
  },

  screens: {
    map: "Near you",
    saved: "Saved",
    profile: "Profile",
    welcome: "Welcome",
    signIn: "Sign in",
    review: "Rate a cafe",
    cafe: (id: string) => `Cafe ${id}`,
  },

  /** Stand-in screens, until the real ones are built. */
  placeholder: {
    builtIn: (milestone: string) => `Placeholder, built in ${milestone}.`,
  },

  metrics: {
    coffee: { label: "Coffee", prompt: "How was your coffee?" },
    food: { label: "Food", prompt: "How was the food?" },
    vibe: { label: "Vibe", prompt: "How did it feel?" },
    work: { label: "Work", prompt: "Could you work here?" },
  } satisfies Record<Metric, { label: string; prompt: string }>,

  review: {
    coffeePrompt: (drinkName: string) => `How was your ${drinkName.toLowerCase()}?`,
  },

  score: {
    /** Shown instead of a score until a metric has enough ratings. */
    new: "New",
  },

  drinkGroups: {
    espresso: "Espresso",
    brewed: "Brewed",
    iced: "Iced",
    other: "Other",
  } satisfies Record<DrinkGroup, string>,

  milks: {
    full_cream: "Full cream",
    skim: "Skim",
    oat: "Oat",
    soy: "Soy",
    almond: "Almond",
    lactose_free: "Lactose free",
  } satisfies Record<Milk, string>,

  a11y: {
    rateCafe: "Rate a cafe",
    scoreNew: (metricLabel: string) => `${metricLabel}, new`,
    scoreRated: (metricLabel: string, score: number, count: number) =>
      `${metricLabel} ${score.toFixed(1)} from ${count} ratings`,
  },
} as const;
