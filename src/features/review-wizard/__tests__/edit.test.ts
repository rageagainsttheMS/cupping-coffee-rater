import type { ReferenceTag } from "@/domain/reference";
import type { MyReview } from "@/features/profile/types";
import {
  buildEditInput,
  editBack,
  editNext,
  editStepNumber,
  hasChanges,
  reviewToValues,
  toUpdateArgs,
} from "../edit";

const REVIEW_ID = "20000000-0000-4000-8000-000000000001";

const review: MyReview = {
  review_id: REVIEW_ID,
  cafe_id: "10000000-0000-4000-8000-000000000001",
  cafe_name: "Corner Roast",
  suburb: "Carlton",
  visit_date: "2026-10-18",
  created_at: "2026-10-18T02:00:00Z",
  edited_at: null,
  comment: "Silky, sweet, properly hot.",
  beans: "Market Lane",
  verified: true,
  drinks: [
    { drink_id: 9, name: "Flat white", rating: 4.5, milk: "oat", price_aud: 5.5 },
    { drink_id: 10, name: "Latte", rating: 3.5, milk: null, price_aud: null },
  ],
  ratings: { food: 4, work: 5 },
  tags: [
    { tag_id: 2, metric: "coffee", label: "Smooth" },
    { tag_id: 31, metric: "work", label: "Wifi" },
  ],
  photo_path: "u/r.jpg",
  photo_width: 10,
  photo_height: 10,
};

const tag = (id: number, metric: ReferenceTag["metric"], active = true): ReferenceTag => ({
  id,
  metric,
  label: `Tag ${id}`,
  sortOrder: id,
  active,
});
const TAGS = [tag(2, "coffee"), tag(3, "coffee"), tag(31, "work"), tag(20, "vibe", false)];

describe("reviewToValues", () => {
  it("loads drinks, ratings, tags and comment from the review", () => {
    const values = reviewToValues(review);
    expect(values.reviewId).toBe(REVIEW_ID);
    expect(values.drinks.map((d) => [d.drinkId, d.rating])).toEqual([
      [9, 4.5],
      [10, 3.5],
    ]);
    expect(values.food).toBe(4);
    expect(values.vibe).toBeNull();
    expect(values.work).toBe(5);
    expect(values.tagIds).toEqual([2, 31]);
    expect(values.comment).toBe("Silky, sweet, properly hot.");
    expect(values.cafe?.name).toBe("Corner Roast");
  });
});

describe("buildEditInput and toUpdateArgs", () => {
  it("sends only the editable fields", () => {
    const parsed = buildEditInput(reviewToValues(review), TAGS);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(toUpdateArgs(parsed.data)).toEqual({
      p_review_id: REVIEW_ID,
      p_drinks: [
        { drink_id: 9, rating: 4.5 },
        { drink_id: 10, rating: 3.5 },
      ],
      p_food: 4,
      p_vibe: undefined,
      p_work: 5,
      p_tags: [2, 31],
      p_comment: "Silky, sweet, properly hot.",
    });
  });

  it("drops the tags of a metric that is now Didn't try", () => {
    const values = { ...reviewToValues(review), work: null };
    const parsed = buildEditInput(values, TAGS);
    expect(parsed.success && parsed.data.tagIds).toEqual([2]);
  });

  it("drops retired tags", () => {
    const values = { ...reviewToValues(review), vibe: 4, tagIds: [2, 20] };
    const parsed = buildEditInput(values, TAGS);
    expect(parsed.success && parsed.data.tagIds).toEqual([2]);
  });

  it("rejects a comment under 10 characters", () => {
    const values = { ...reviewToValues(review), comment: "Short" };
    expect(buildEditInput(values, TAGS).success).toBe(false);
  });
});

describe("hasChanges", () => {
  const initial = reviewToValues(review);

  it("is false for the same form, whatever the tag order or comment padding", () => {
    expect(
      hasChanges(initial, { ...initial, tagIds: [31, 2], comment: ` ${initial.comment} ` }),
    ).toBe(false);
  });

  it("is true when a rating, tag or the comment changes", () => {
    const drinks = initial.drinks.map((d, i) => (i === 0 ? { ...d, rating: 3 } : d));
    expect(hasChanges(initial, { ...initial, drinks })).toBe(true);
    expect(hasChanges(initial, { ...initial, vibe: 3 })).toBe(true);
    expect(hasChanges(initial, { ...initial, tagIds: [2] })).toBe(true);
    expect(hasChanges(initial, { ...initial, comment: "Weaker than I remembered." })).toBe(true);
  });

  it("ignores things an edit cannot change", () => {
    expect(hasChanges(initial, { ...initial, beans: "Other", photo: null })).toBe(false);
  });
});

describe("edit navigation", () => {
  it("steps through each drink, then extras, then comment, then save", () => {
    expect(editNext("rate", 0, 2)).toEqual({ to: "rate", drinkIndex: 1 });
    expect(editNext("rate", 1, 2)).toEqual({ to: "extras", drinkIndex: 1 });
    expect(editNext("extras", 1, 2)).toEqual({ to: "comment", drinkIndex: 1 });
    expect(editNext("comment", 1, 2)).toEqual({ to: "save", drinkIndex: 1 });
  });

  it("goes back the same way, and leaves from the first drink", () => {
    expect(editBack("comment", 1, 2)).toEqual({ to: "extras", drinkIndex: 1 });
    expect(editBack("extras", 1, 2)).toEqual({ to: "rate", drinkIndex: 1 });
    expect(editBack("rate", 1, 2)).toEqual({ to: "rate", drinkIndex: 0 });
    expect(editBack("rate", 0, 2)).toEqual({ to: "close", drinkIndex: 0 });
  });

  it("counts three steps", () => {
    expect([editStepNumber("rate"), editStepNumber("extras"), editStepNumber("comment")]).toEqual([
      1, 2, 3,
    ]);
  });
});
