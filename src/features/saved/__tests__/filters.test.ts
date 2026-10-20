import { distanceTo, insertAt } from "../filters";
import type { SavedCafe } from "../types";

const cafe = (over: Partial<SavedCafe> = {}): SavedCafe => ({
  id: "c1",
  google_place_id: "g1",
  name: "Corner Roast",
  suburb: "Carlton",
  lat: -37.8,
  lng: 144.97,
  saved_at: "2026-10-01T00:00:00Z",
  coffee_score: 4.6,
  coffee_count: 10,
  food_score: null,
  food_count: 1,
  vibe_score: 4.0,
  vibe_count: 4,
  work_score: 3.9,
  work_count: 5,
  last_drink_name: null,
  last_rating: null,
  ...over,
});

describe("distanceTo", () => {
  it("is null without a position", () => {
    expect(distanceTo(cafe(), null)).toBeNull();
  });

  it("measures metres from the person", () => {
    const metres = distanceTo(cafe(), { lat: -37.801, lng: 144.97 });
    expect(metres).toBeGreaterThan(100);
    expect(metres).toBeLessThan(120);
  });
});

describe("insertAt", () => {
  const list = [cafe({ id: "a" }), cafe({ id: "b" })];

  it("puts the cafe back at its place", () => {
    expect(insertAt(list, cafe({ id: "x" }), 1).map((c) => c.id)).toEqual(["a", "x", "b"]);
  });

  it("clamps an index past the end", () => {
    expect(insertAt(list, cafe({ id: "x" }), 9).map((c) => c.id)).toEqual(["a", "b", "x"]);
  });

  it("does not add a cafe that is already there", () => {
    expect(insertAt(list, cafe({ id: "a" }), 0)).toHaveLength(2);
  });
});
