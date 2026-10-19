import { ratingFromPosition, stepRating } from "../starRating";

describe("ratingFromPosition", () => {
  // Five stars across 500 px: each star is 100 px, each half 50 px.
  const W = 500;

  it("gives a half step for the left half of a star and a whole star for the right half", () => {
    expect(ratingFromPosition(120, W)).toBe(1.5); // left half of star 2 (100..150)
    expect(ratingFromPosition(170, W)).toBe(2); // right half of star 2 (150..200)
    expect(ratingFromPosition(320, W)).toBe(3.5); // left half of star 4 (300..350)
    expect(ratingFromPosition(380, W)).toBe(4); // right half of star 4 (350..400)
  });

  it("never goes below 1, because the first half star is not a valid rating", () => {
    expect(ratingFromPosition(0, W)).toBe(1);
    expect(ratingFromPosition(20, W)).toBe(1);
    expect(ratingFromPosition(-40, W)).toBe(1);
  });

  it("never goes above 5, however far a drag runs past the end", () => {
    expect(ratingFromPosition(500, W)).toBe(5);
    expect(ratingFromPosition(900, W)).toBe(5);
  });

  it("moves in half steps along a drag", () => {
    const seen = new Set<number>();
    for (let x = 0; x <= W; x += 5) seen.add(ratingFromPosition(x, W));
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]);
  });

  it("returns the minimum for a width that is not measured yet", () => {
    expect(ratingFromPosition(100, 0)).toBe(1);
    expect(ratingFromPosition(NaN, W)).toBe(1);
  });
});

describe("stepRating", () => {
  it("moves by half a star and stops at the ends", () => {
    expect(stepRating(3, 1)).toBe(3.5);
    expect(stepRating(3, -1)).toBe(2.5);
    expect(stepRating(5, 1)).toBe(5);
    expect(stepRating(1, -1)).toBe(1);
  });

  it("starts in the middle when there is no rating yet", () => {
    expect(stepRating(null, 1)).toBe(3);
    expect(stepRating(null, -1)).toBe(3);
  });
});
