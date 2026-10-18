import type { Metric } from "./metrics";

/** Quick tags per metric. The tag text is what the database stores in `review_tags.tag`. */
export const TAGS: Record<Metric, readonly string[]> = {
  coffee: ["Strong", "Smooth", "Bitter", "Too hot", "Great milk"],
  food: ["Brunch", "Pastries", "Vegan options", "Good value"],
  vibe: ["Quiet", "Lively", "Cozy", "Bright", "Friendly staff", "Slow service"],
  work: ["Wifi", "Power outlets", "Laptop-friendly", "No laptops at lunch", "Big tables"],
};
