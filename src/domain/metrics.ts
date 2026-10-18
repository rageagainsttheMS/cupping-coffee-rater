/**
 * The four rating metrics are a closed set: the schema, scoring and palette are built around them.
 * Their labels and prompts live in the copy file.
 */
export const METRICS = ["coffee", "food", "vibe", "work"] as const;
export type Metric = (typeof METRICS)[number];

/** Icon names are semantic. The UI layer maps them to a symbol set. */
export type MetricIcon = "cup" | "fork-knife" | "sparkle" | "laptop";

export const METRIC_ICONS: Record<Metric, MetricIcon> = {
  coffee: "cup",
  food: "fork-knife",
  vibe: "sparkle",
  work: "laptop",
};

/** Food, Vibe and Work offer "Didn't try". Coffee is the only required rating. */
export const OPTIONAL_METRICS = ["food", "vibe", "work"] as const;
export type OptionalMetric = (typeof OPTIONAL_METRICS)[number];

export function isMetric(value: unknown): value is Metric {
  return typeof value === "string" && (METRICS as readonly string[]).includes(value);
}
