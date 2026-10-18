import { METRICS } from "./metrics";
import type { Metric } from "./metrics";
import type { DrinkGroup } from "./drinks";

/** Reference data comes from the `tags` and `drinks` tables. The lists change without an app release. */
export type ReferenceTag = {
  id: number;
  metric: Metric;
  label: string;
  sortOrder: number;
  active: boolean;
};

export type ReferenceDrink = {
  id: number;
  slug: string;
  name: string;
  group: DrinkGroup;
  countsTowardCoffee: boolean;
  sortOrder: number;
  active: boolean;
};

export type ReferenceData = {
  tags: ReferenceTag[];
  drinks: ReferenceDrink[];
};

/** Active tags for each metric, in display order. Retired tags are left out. */
export function activeTagsByMetric(tags: readonly ReferenceTag[]): Record<Metric, ReferenceTag[]> {
  const grouped = Object.fromEntries(METRICS.map((m) => [m, [] as ReferenceTag[]])) as Record<
    Metric,
    ReferenceTag[]
  >;
  for (const tag of tags) {
    if (tag.active) grouped[tag.metric].push(tag);
  }
  for (const metric of METRICS) {
    grouped[metric].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return grouped;
}

/** Drinks offered in the review wizard: active, and counting towards Coffee (no chai or matcha in Phase 1). */
export function wizardDrinks(drinks: readonly ReferenceDrink[]): ReferenceDrink[] {
  return drinks
    .filter((d) => d.active && d.countsTowardCoffee)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** For restoring a draft: keep only tag ids that still exist and are active. */
export function dropInactiveTagIds(
  ids: readonly number[],
  tags: readonly ReferenceTag[],
): number[] {
  const active = new Set(tags.filter((t) => t.active).map((t) => t.id));
  return ids.filter((id) => active.has(id));
}
