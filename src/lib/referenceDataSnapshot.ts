import type { ReferenceData, ReferenceDrink, ReferenceTag } from "@/domain/reference";

/**
 * A copy of the seeded tags and drinks (migrations `core_tables` and `tags_by_id`). It is only the
 * last-resort fallback for a first launch with no network, so it may be out of date. The ids match
 * the seed order. The database stays the source of truth.
 */
const tag = (
  id: number,
  metric: ReferenceTag["metric"],
  label: string,
  sortOrder: number,
): ReferenceTag => ({ id, metric, label, sortOrder, active: true });

const drink = (
  id: number,
  slug: string,
  name: string,
  group: ReferenceDrink["group"],
  countsTowardCoffee = true,
): ReferenceDrink => ({ id, slug, name, group, countsTowardCoffee, sortOrder: id, active: true });

export const referenceDataSnapshot: ReferenceData = {
  tags: [
    tag(1, "coffee", "Strong", 1),
    tag(2, "coffee", "Smooth", 2),
    tag(3, "coffee", "Bitter", 3),
    tag(4, "coffee", "Too hot", 4),
    tag(5, "coffee", "Great milk", 5),
    tag(6, "food", "Brunch", 1),
    tag(7, "food", "Pastries", 2),
    tag(8, "food", "Vegan options", 3),
    tag(9, "food", "Good value", 4),
    tag(10, "vibe", "Quiet", 1),
    tag(11, "vibe", "Lively", 2),
    tag(12, "vibe", "Cozy", 3),
    tag(13, "vibe", "Bright", 4),
    tag(14, "vibe", "Friendly staff", 5),
    tag(15, "vibe", "Slow service", 6),
    tag(16, "work", "Wifi", 1),
    tag(17, "work", "Power outlets", 2),
    tag(18, "work", "Laptop-friendly", 3),
    tag(19, "work", "No laptops at lunch", 4),
    tag(20, "work", "Big tables", 5),
  ],
  drinks: [
    drink(1, "espresso", "Espresso", "espresso"),
    drink(2, "ristretto", "Ristretto", "espresso"),
    drink(3, "long_black", "Long black", "espresso"),
    drink(4, "americano", "Americano", "espresso"),
    drink(5, "piccolo", "Piccolo", "espresso"),
    drink(6, "macchiato", "Macchiato", "espresso"),
    drink(7, "cortado", "Cortado", "espresso"),
    drink(8, "magic", "Magic", "espresso"),
    drink(9, "flat_white", "Flat white", "espresso"),
    drink(10, "latte", "Latte", "espresso"),
    drink(11, "cappuccino", "Cappuccino", "espresso"),
    drink(12, "mocha", "Mocha", "espresso"),
    drink(13, "batch_brew", "Batch brew", "brewed"),
    drink(14, "pour_over", "Pour over", "brewed"),
    drink(15, "cold_brew", "Cold brew", "brewed"),
    drink(16, "iced_latte", "Iced latte", "iced"),
    drink(17, "iced_long_black", "Iced long black", "iced"),
    drink(18, "espresso_tonic", "Espresso tonic", "iced"),
    drink(19, "chai", "Chai", "other", false),
    drink(20, "matcha", "Matcha", "other", false),
    drink(21, "hot_chocolate", "Hot chocolate", "other", false),
  ],
};
