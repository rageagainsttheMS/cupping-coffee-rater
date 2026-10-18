import { activeTagsByMetric, dropInactiveTagIds, wizardDrinks } from "../reference";
import type { ReferenceDrink, ReferenceTag } from "../reference";

const tag = (
  id: number,
  metric: ReferenceTag["metric"],
  label: string,
  over = {},
): ReferenceTag => ({
  id,
  metric,
  label,
  sortOrder: id,
  active: true,
  ...over,
});

const drink = (id: number, name: string, over: Partial<ReferenceDrink> = {}): ReferenceDrink => ({
  id,
  slug: name.toLowerCase(),
  name,
  group: "espresso",
  countsTowardCoffee: true,
  sortOrder: id,
  active: true,
  ...over,
});

describe("activeTagsByMetric", () => {
  it("groups active tags by metric in sort order and leaves out retired tags", () => {
    const tags = [
      tag(3, "work", "Wifi", { sortOrder: 2 }),
      tag(1, "coffee", "Smooth"),
      tag(2, "work", "Power outlets", { sortOrder: 1 }),
      tag(4, "work", "Old tag", { active: false }),
    ];
    const grouped = activeTagsByMetric(tags);
    expect(grouped.work.map((t) => t.label)).toEqual(["Power outlets", "Wifi"]);
    expect(grouped.coffee.map((t) => t.label)).toEqual(["Smooth"]);
    expect(grouped.food).toEqual([]);
    expect(grouped.vibe).toEqual([]);
  });
});

describe("wizardDrinks", () => {
  it("lists active drinks that count towards coffee, in sort order", () => {
    const drinks = [
      drink(2, "Long black"),
      drink(1, "Espresso"),
      drink(3, "Chai", { countsTowardCoffee: false }),
      drink(4, "Retired", { active: false }),
    ];
    expect(wizardDrinks(drinks).map((d) => d.name)).toEqual(["Espresso", "Long black"]);
  });
});

describe("dropInactiveTagIds", () => {
  const tags = [tag(1, "coffee", "Smooth"), tag(2, "coffee", "Bitter", { active: false })];

  it("keeps active tags and drops retired and unknown ids", () => {
    expect(dropInactiveTagIds([1, 2, 99], tags)).toEqual([1]);
  });

  it("returns an empty list for an empty draft", () => {
    expect(dropInactiveTagIds([], tags)).toEqual([]);
  });
});
