import { formatScore, isValidRating, scoreBand } from "../rating";

describe("isValidRating", () => {
  it.each([1, 1.5, 3.5, 4.5, 5])("accepts %p", (r) => {
    expect(isValidRating(r)).toBe(true);
  });

  it.each([0, 0.5, 3.3, 5.5, 6, -1, NaN, Infinity])("rejects %p", (r) => {
    expect(isValidRating(r)).toBe(false);
  });
});

describe("formatScore", () => {
  it("shows score and count from 3 ratings", () => {
    expect(formatScore(4.2, 18)).toBe("4.2 (18)");
    expect(formatScore(3.94, 3)).toBe("3.9 (3)");
  });

  it('shows "New" under 3 ratings', () => {
    expect(formatScore(4.2, 2)).toBe("New");
    expect(formatScore(null, 0)).toBe("New");
  });

  it('shows "New" when the server sends no score', () => {
    expect(formatScore(null, 10)).toBe("New");
  });
});

describe("scoreBand", () => {
  it("bands scores", () => {
    expect(scoreBand(3.4)).toBe("low");
    expect(scoreBand(3.5)).toBe("mid");
    expect(scoreBand(4.2)).toBe("mid");
    expect(scoreBand(4.3)).toBe("high");
    expect(scoreBand(5)).toBe("high");
  });

  it("is neutral without a score", () => {
    expect(scoreBand(null)).toBe("none");
  });
});
