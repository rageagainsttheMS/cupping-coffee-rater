import { reviewSchema } from "../review.schema";

const valid = {
  reviewId: "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b",
  cafeId: "7a1d9e2c-0b3f-4c5d-8e6a-2f1b3c4d5e6f",
  drinks: [{ drinkId: 9, rating: 4.5 }],
  tagIds: [],
  comment: "Smooth and well made.",
};

describe("reviewSchema", () => {
  it("accepts a minimal review", () => {
    expect(reviewSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a full review", () => {
    const result = reviewSchema.safeParse({
      ...valid,
      drinks: [
        { drinkId: 9, rating: 4.5, milk: "oat", priceAud: 5.5 },
        { drinkId: 3, rating: 4 },
      ],
      food: 3.5,
      vibe: null,
      work: 5,
      tagIds: [3, 12],
      beans: "Market Lane seasonal blend",
      photo: { path: "user/review.jpg", width: 1200, height: 1600 },
      location: { lat: -37.8, lng: 144.97 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a draft with no coffee rating", () => {
    expect(reviewSchema.safeParse({ ...valid, drinks: [] }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, drinks: [{ drinkId: 9 }] }).success).toBe(false);
  });

  it("accepts half stars and rejects 3.3 and 0", () => {
    const withRating = (rating: number) => ({ ...valid, drinks: [{ drinkId: 9, rating }] });
    expect(reviewSchema.safeParse(withRating(3.5)).success).toBe(true);
    expect(reviewSchema.safeParse(withRating(3.3)).success).toBe(false);
    expect(reviewSchema.safeParse(withRating(0)).success).toBe(false);
  });

  it("applies the same rule to food, vibe and work, where null means didn't try", () => {
    expect(reviewSchema.safeParse({ ...valid, food: null }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...valid, work: 3.3 }).success).toBe(false);
  });

  it("requires a comment of 10 to 280 characters", () => {
    expect(reviewSchema.safeParse({ ...valid, comment: "too short" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, comment: "x".repeat(10) }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...valid, comment: "x".repeat(280) }).success).toBe(true);
    expect(reviewSchema.safeParse({ ...valid, comment: "x".repeat(281) }).success).toBe(false);
  });

  it("counts the comment after trimming", () => {
    expect(reviewSchema.safeParse({ ...valid, comment: "   short   " }).success).toBe(false);
  });

  it("rejects bad milk, price and location", () => {
    const drink = (extra: object) => ({ ...valid, drinks: [{ drinkId: 9, rating: 4, ...extra }] });
    expect(reviewSchema.safeParse(drink({ milk: "goat" })).success).toBe(false);
    expect(reviewSchema.safeParse(drink({ priceAud: -1 })).success).toBe(false);
    expect(reviewSchema.safeParse(drink({ priceAud: 5.555 })).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, location: { lat: 91, lng: 0 } }).success).toBe(false);
  });

  it("rejects non-integer tag ids", () => {
    expect(reviewSchema.safeParse({ ...valid, tagIds: ["Wifi"] }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, tagIds: [1.5] }).success).toBe(false);
  });

  it("rejects an invalid review or cafe id", () => {
    expect(reviewSchema.safeParse({ ...valid, reviewId: "nope" }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, cafeId: "nope" }).success).toBe(false);
  });
});
