import type { ReferenceDrink, ReferenceTag } from "@/domain/reference";
import { loadDraft, saveDraft, clearDraft, DRAFT_KEY, DRAFT_MAX_AGE_MS } from "../draft";
import type { DraftStorage } from "../draft";
import { orderDrinks } from "../drinkOrder";
import { classifySubmitError, PhotoUploadError } from "../errors";
import { describeMovements } from "../outcome";
import {
  backTarget,
  canContinue,
  nextStep,
  previousStep,
  stepFromPath,
  stepNumber,
  TOTAL_STEPS,
} from "../steps";
import { buildReviewInput, toSubmitArgs } from "../submission";
import { blankValues } from "../types";
import type { WizardValues } from "../types";

const REVIEW_ID = "3f0c2b8e-5a6d-4a52-9c54-0d6a8e3a1b11";
const CAFE_ID = "7d6b1e26-3c2f-4d75-8a3e-9f1c2b7d4e55";
const cafe = { id: CAFE_ID, name: "Corner Roast", suburb: "Fitzroy", lat: -37.8, lng: 144.97 };

const tag = (id: number, metric: ReferenceTag["metric"], active = true): ReferenceTag => ({
  id,
  metric,
  label: `Tag ${id}`,
  sortOrder: id,
  active,
});
const TAGS = [
  tag(1, "coffee"),
  tag(2, "food"),
  tag(3, "work"),
  tag(4, "vibe"),
  tag(5, "work", false),
];

function memoryStorage(initial: Record<string, string> = {}): DraftStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: async (k) => data[k] ?? null,
    setItem: async (k, v) => {
      data[k] = v;
    },
    removeItem: async (k) => {
      delete data[k];
    },
  };
}

const filled = (over: Partial<WizardValues> = {}): WizardValues => ({
  ...blankValues(REVIEW_ID, cafe),
  drinks: [{ drinkId: 9, milk: "oat", rating: 4.5, priceAud: null }],
  comment: "Smooth and well made, good table.",
  ...over,
});

describe("draft save and restore", () => {
  const NOW = 1_800_000_000_000;

  it("restores what was saved", async () => {
    const storage = memoryStorage();
    const values = filled({ work: 4, tagIds: [1, 3], beans: "Market Lane", food: null });
    await saveDraft(storage, { values, step: "comment", drinkIndex: 0 }, NOW);

    const draft = await loadDraft(storage, TAGS, NOW + 60_000);
    expect(draft).toEqual({ values, step: "comment", drinkIndex: 0, savedAt: NOW });
  });

  it("discards a draft older than 24 hours", async () => {
    const storage = memoryStorage();
    await saveDraft(storage, { values: filled(), step: "rate", drinkIndex: 0 }, NOW);

    expect(await loadDraft(storage, TAGS, NOW + DRAFT_MAX_AGE_MS - 1)).not.toBeNull();
    expect(await loadDraft(storage, TAGS, NOW + DRAFT_MAX_AGE_MS)).toBeNull();
  });

  it("drops tag ids that are no longer active", async () => {
    const storage = memoryStorage();
    // Tag 5 was retired, and tag 99 no longer exists at all.
    await saveDraft(
      storage,
      { values: filled({ work: 4, tagIds: [1, 3, 5, 99] }), step: "extras", drinkIndex: 0 },
      NOW,
    );
    const draft = await loadDraft(storage, TAGS, NOW);
    expect(draft?.values.tagIds).toEqual([1, 3]);
  });

  it("ignores unreadable or foreign data instead of crashing", async () => {
    expect(await loadDraft(memoryStorage({ [DRAFT_KEY]: "{not json" }), TAGS, NOW)).toBeNull();
    expect(await loadDraft(memoryStorage({ [DRAFT_KEY]: '{"version":2}' }), TAGS, NOW)).toBeNull();
    expect(await loadDraft(memoryStorage(), TAGS, NOW)).toBeNull();
  });

  it("keeps the second drink and the position within the visit", async () => {
    const storage = memoryStorage();
    const values = filled({
      drinks: [
        { drinkId: 9, milk: null, rating: 4, priceAud: 5.5 },
        { drinkId: 3, milk: "soy", rating: null, priceAud: null },
      ],
    });
    await saveDraft(storage, { values, step: "rate", drinkIndex: 1 }, NOW);
    const draft = await loadDraft(storage, TAGS, NOW);
    expect(draft?.drinkIndex).toBe(1);
    expect(draft?.values.drinks).toHaveLength(2);
  });

  it("can be cleared after posting", async () => {
    const storage = memoryStorage();
    await saveDraft(storage, { values: filled(), step: "rate", drinkIndex: 0 }, NOW);
    await clearDraft(storage);
    expect(await loadDraft(storage, TAGS, NOW)).toBeNull();
  });

  it("does not throw when storage fails", async () => {
    const broken: DraftStorage = {
      getItem: async () => {
        throw new Error("disk");
      },
      setItem: async () => {
        throw new Error("disk");
      },
      removeItem: async () => {
        throw new Error("disk");
      },
    };
    await expect(
      saveDraft(broken, { values: filled(), step: "rate", drinkIndex: 0 }),
    ).resolves.toBeUndefined();
    await expect(clearDraft(broken)).resolves.toBeUndefined();
    expect(await loadDraft(broken, TAGS)).toBeNull();
  });
});

describe("building the review to post", () => {
  it("rejects a review with no Coffee rating", () => {
    const values = filled({ drinks: [{ drinkId: 9, milk: null, rating: null, priceAud: null }] });
    expect(buildReviewInput(values, TAGS).success).toBe(false);
  });

  it("rejects a comment that is too short", () => {
    expect(buildReviewInput(filled({ comment: "Nice." }), TAGS).success).toBe(false);
  });

  it('sends "Didn\'t try" as null and leaves it out of the function arguments', () => {
    const result = buildReviewInput(filled({ food: null, vibe: 4, work: null }), TAGS);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.food).toBeNull();
    expect(result.data.vibe).toBe(4);
    const args = toSubmitArgs(result.data);
    expect(args.p_food).toBeUndefined();
    expect(args.p_work).toBeUndefined();
    expect(args.p_vibe).toBe(4);
  });

  it('"+ Another drink" puts two drinks in the payload', () => {
    const values = filled({
      drinks: [
        { drinkId: 9, milk: "oat", rating: 4.5, priceAud: 5.5 },
        { drinkId: 3, milk: null, rating: 3.5, priceAud: null },
      ],
    });
    const result = buildReviewInput(values, TAGS);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(toSubmitArgs(result.data).p_drinks).toEqual([
      { drink_id: 9, rating: 4.5, milk: "oat", price_aud: 5.5 },
      { drink_id: 3, rating: 3.5, milk: undefined, price_aud: undefined },
    ]);
  });

  it("leaves out a half-filled extra drink", () => {
    const values = filled({
      drinks: [
        { drinkId: 9, milk: null, rating: 4, priceAud: null },
        { drinkId: 3, milk: null, rating: null, priceAud: null },
      ],
    });
    const result = buildReviewInput(values, TAGS);
    expect(result.success && result.data.drinks).toHaveLength(1);
  });

  it("drops tags for metrics that were not rated, and retired tags", () => {
    // Food (2) and Vibe (4) tags with neither rated; Work (3) rated; 5 is retired; 1 is Coffee.
    const values = filled({ work: 4, tagIds: [1, 2, 3, 4, 5] });
    const result = buildReviewInput(values, TAGS);
    expect(result.success && result.data.tagIds).toEqual([1, 3]);
  });

  it("adds the location, photo and beans only when present", () => {
    const bare = buildReviewInput(filled({ beans: "  " }), TAGS);
    expect(bare.success && bare.data.beans).toBeUndefined();
    expect(bare.success && bare.data.location).toBeUndefined();

    const full = buildReviewInput(filled({ beans: " Market Lane " }), TAGS, {
      location: { lat: -37.8, lng: 144.97 },
      photo: { path: "u/r.jpg", width: 1200, height: 900 },
    });
    expect(full.success).toBe(true);
    if (!full.success) return;
    const args = toSubmitArgs(full.data);
    expect(args).toMatchObject({
      p_beans: "Market Lane",
      p_photo_path: "u/r.jpg",
      p_lat: -37.8,
      p_lng: 144.97,
    });
  });
});

describe("steps", () => {
  it("numbers six steps", () => {
    expect(TOTAL_STEPS).toBe(6);
    expect(stepNumber("cafe")).toBe(1);
    expect(stepNumber("details")).toBe(6);
    expect(nextStep("details")).toBeNull();
    expect(previousStep("cafe")).toBeNull();
    expect(nextStep("rate")).toBe("extras");
  });

  it("requires a cafe, a drink and a Coffee rating to continue", () => {
    const blank = blankValues(REVIEW_ID);
    expect(canContinue("cafe", blank, 0)).toBe(false);
    expect(canContinue("cafe", { ...blank, cafe }, 0)).toBe(true);
    expect(canContinue("drink", blank, 0)).toBe(false);
    expect(canContinue("drink", filled(), 0)).toBe(true);
    expect(canContinue("rate", filled({ drinks: [{ ...blank.drinks[0], drinkId: 9 }] }), 0)).toBe(
      false,
    );
    expect(canContinue("rate", filled(), 0)).toBe(true);
  });

  it("makes Food, Vibe, Work and the details optional", () => {
    expect(canContinue("extras", blankValues(REVIEW_ID), 0)).toBe(true);
    expect(canContinue("details", blankValues(REVIEW_ID), 0)).toBe(true);
  });

  it("blocks the comment under 10 characters and over 280", () => {
    expect(canContinue("comment", filled({ comment: "too short" }), 0)).toBe(false);
    expect(canContinue("comment", filled({ comment: "   short    " }), 0)).toBe(false);
    expect(canContinue("comment", filled({ comment: "exactly 10" }), 0)).toBe(true);
    expect(canContinue("comment", filled({ comment: "x".repeat(280) }), 0)).toBe(true);
    expect(canContinue("comment", filled({ comment: "x".repeat(281) }), 0)).toBe(false);
  });
});

describe("backTarget", () => {
  it("walks back through the steps", () => {
    expect(backTarget("rate", 0, 1, false)).toEqual({ to: "drink", drinkIndex: 0 });
    expect(backTarget("comment", 0, 1, false)).toEqual({ to: "extras", drinkIndex: 0 });
    expect(backTarget("details", 0, 1, false)).toEqual({ to: "comment", drinkIndex: 0 });
    expect(backTarget("drink", 0, 1, false)).toEqual({ to: "cafe", drinkIndex: 0 });
  });

  it("returns from a second drink to the first drink's rating", () => {
    expect(backTarget("drink", 1, 2, false)).toEqual({ to: "rate", drinkIndex: 0 });
  });

  it("returns from the extras to the last drink's rating", () => {
    expect(backTarget("extras", 1, 2, false)).toEqual({ to: "rate", drinkIndex: 1 });
  });

  it("closes from step 1, and from step 2 when the cafe was chosen on the cafe page", () => {
    expect(backTarget("cafe", 0, 1, false).to).toBe("close");
    expect(backTarget("drink", 0, 1, true).to).toBe("close");
  });
});

describe("stepFromPath", () => {
  it("maps routes to steps and ignores other screens", () => {
    expect(stepFromPath("/review")).toBe("cafe");
    expect(stepFromPath("/review/rate")).toBe("rate");
    expect(stepFromPath("/review/posted")).toBeNull();
    expect(stepFromPath("/cafe/abc")).toBeNull();
  });
});

describe("classifySubmitError", () => {
  it("recognises the same-day duplicate", () => {
    expect(classifySubmitError({ code: "23505", message: "duplicate key value" })).toBe(
      "duplicate_today",
    );
  });

  it("recognises the rate limit", () => {
    expect(classifySubmitError({ code: "P0001", message: "rate_limit_exceeded" })).toBe(
      "rate_limit",
    );
  });

  it("treats a request that never reached the server as a network problem", () => {
    expect(classifySubmitError(new TypeError("Network request failed"))).toBe("network");
    expect(classifySubmitError({ message: "TypeError: Network request failed", code: "" })).toBe(
      "network",
    );
  });

  it("separates photo failures from everything else", () => {
    expect(classifySubmitError(new PhotoUploadError())).toBe("photo");
  });

  it("falls back to a generic message", () => {
    expect(classifySubmitError({ code: "22023", message: "invalid_drinks" })).toBe("generic");
    expect(classifySubmitError("boom")).toBe("generic");
    expect(classifySubmitError(null)).toBe("generic");
  });
});

describe("orderDrinks", () => {
  const SLUGS = ["a", "b", "c", "d"];
  const drink = (id: number, slug = `d${id}`, sortOrder = id): ReferenceDrink => ({
    id,
    slug,
    name: `Drink ${id}`,
    group: "espresso",
    countsTowardCoffee: true,
    sortOrder,
    active: true,
  });
  // Drinks 1 to 12, where the popular four are 7, 3, 9 and 5 (slugs a, b, c, d in that order).
  const popularSlug: Record<number, string> = { 7: "a", 3: "b", 9: "c", 5: "d" };
  const all = Array.from({ length: 12 }, (_, i) => drink(i + 1, popularSlug[i + 1]));

  it("leads with the popular drinks in the order they are listed", () => {
    const { primary } = orderDrinks(all, {}, {}, SLUGS);
    expect(primary.map((d) => d.id)).toEqual([7, 3, 9, 5]);
  });

  it("follows with this cafe's most-rated other drinks, then the person's usual ones", () => {
    const { primary, more } = orderDrinks(
      all,
      { 1: 30, 2: 10, 3: 99 },
      { 11: 9, 2: 3, 8: 1 },
      SLUGS,
    );
    // Popular first (3 stays where it is listed), then the cafe's 1 and 2, then usual 11 and 8.
    expect(primary.map((d) => d.id)).toEqual([7, 3, 9, 5, 1, 2, 11, 8]);
    expect(more.map((d) => d.id)).toEqual([4, 6, 10, 12]);
  });

  it("does not repeat a drink that is popular, popular here and usual", () => {
    const { primary } = orderDrinks(all, { 7: 5 }, { 7: 9 }, SLUGS);
    expect(primary.filter((d) => d.id === 7)).toHaveLength(1);
  });

  it("uses the real popular list by default: latte, flat white, cappuccino, long black", () => {
    const real = [
      drink(3, "long_black"),
      drink(9, "flat_white"),
      drink(10, "latte"),
      drink(11, "cappuccino"),
      drink(1, "espresso"),
    ];
    expect(orderDrinks(real, {}, {}).primary.map((d) => d.slug)).toEqual([
      "latte",
      "flat_white",
      "cappuccino",
      "long_black",
    ]);
  });

  it("skips a popular drink that is not offered, such as one already added", () => {
    const without = all.filter((d) => d.id !== 7);
    expect(orderDrinks(without, {}, {}, SLUGS).primary.map((d) => d.id)).toEqual([3, 9, 5]);
  });

  it("falls back to the standard order when no popular drink is offered", () => {
    const plain = Array.from({ length: 12 }, (_, i) => drink(i + 1));
    const { primary, more } = orderDrinks(plain, {}, {}, SLUGS);
    expect(primary.map((d) => d.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(more.map((d) => d.id)).toEqual([9, 10, 11, 12]);
  });

  it("keeps every drink exactly once", () => {
    const { primary, more } = orderDrinks(all, { 3: 1 }, { 9: 1 }, SLUGS);
    expect([...primary, ...more].map((d) => d.id).sort((a, b) => a - b)).toEqual(
      all.map((d) => d.id),
    );
  });
});

describe("describeMovements", () => {
  it("says a metric was unlocked", () => {
    const [work] = describeMovements(
      { work: { score: null, count: 2 } },
      { work: { score: 4.8, count: 3 } },
      "New",
    );
    expect(work).toMatchObject({ metric: "work", from: "New", to: "4.8", state: "unlocked" });
  });

  it("shows a score that moved", () => {
    const [coffee] = describeMovements(
      { coffee: { score: 4.2, count: 18 } },
      { coffee: { score: 4.3, count: 19 } },
      "New",
    );
    expect(coffee).toMatchObject({ from: "4.2", to: "4.3", state: "moved" });
  });

  it("reports how many ratings are still needed", () => {
    const [food] = describeMovements(
      { food: { score: null, count: 0 } },
      { food: { score: null, count: 1 } },
      "New",
    );
    expect(food).toMatchObject({ from: "New", to: "New", state: "pending", remaining: 2 });
  });

  it("only covers metrics the review rated, in the standard order", () => {
    const moves = describeMovements(
      {},
      { work: { score: 4, count: 5 }, coffee: { score: 4, count: 9 } },
      "New",
    );
    expect(moves.map((m) => m.metric)).toEqual(["coffee", "work"]);
  });

  it("treats a score with under 3 ratings as New even if the server sends one", () => {
    const [vibe] = describeMovements({}, { vibe: { score: 4.5, count: 2 } }, "New");
    expect(vibe).toMatchObject({ to: "New", state: "pending" });
  });
});
