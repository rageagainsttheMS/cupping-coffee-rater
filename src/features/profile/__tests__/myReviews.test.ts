import { locationStatus } from "../locationStatus";
import { arrangeReviews, detailsLine, overallRating, relativeAge, reviewStats } from "../myReviews";
import type { MyReview } from "../types";

const review = (over: Partial<MyReview> = {}): MyReview => ({
  review_id: "r1",
  cafe_id: "c1",
  cafe_name: "Corner Roast",
  suburb: "Carlton",
  visit_date: "2026-10-18",
  created_at: "2026-10-18T02:00:00Z",
  edited_at: null,
  comment: "Silky, sweet, properly hot.",
  beans: null,
  verified: false,
  drinks: [{ drink_id: 1, name: "Magic", rating: 4.5, milk: null, price_aud: null }],
  ratings: {},
  tags: [],
  photos: [],
  ...over,
});

describe("overallRating", () => {
  it("averages every metric the review rated", () => {
    const r = review({ ratings: { food: 4, vibe: 4.5, work: 5 } });
    expect(overallRating(r)).toBeCloseTo((4.5 + 4 + 4.5 + 5) / 4);
  });

  it("ignores metrics that were not rated", () => {
    expect(overallRating(review())).toBe(4.5);
  });
});

describe("arrangeReviews", () => {
  const a = review({ review_id: "a", cafe_name: "Zed", created_at: "2026-10-10T00:00:00Z" });
  const b = review({
    review_id: "b",
    cafe_name: "Alpha",
    created_at: "2026-10-12T00:00:00Z",
    drinks: [{ drink_id: 1, name: "Magic", rating: 3, milk: null, price_aud: null }],
    photos: [{ path: "u/b.jpg", thumb_path: null, width: 10, height: 10 }],
  });
  const c = review({ review_id: "c", cafe_name: "Mid", created_at: "2026-10-11T00:00:00Z" });
  const ids = (list: MyReview[]) => list.map((r) => r.review_id);

  it("newest puts the latest review first", () => {
    expect(ids(arrangeReviews([a, b, c], "newest"))).toEqual(["b", "c", "a"]);
  });

  it("highest orders by overall rating, then newest", () => {
    expect(ids(arrangeReviews([a, b, c], "highest"))).toEqual(["c", "a", "b"]);
  });

  it("by cafe orders by cafe name", () => {
    expect(ids(arrangeReviews([a, b, c], "cafe"))).toEqual(["b", "c", "a"]);
  });

  it("has photo keeps only reviews with a photo", () => {
    expect(ids(arrangeReviews([a, b, c], "photo"))).toEqual(["b"]);
  });

  it("does not change the list it is given", () => {
    const list = [a, b, c];
    arrangeReviews(list, "cafe");
    expect(ids(list)).toEqual(["a", "b", "c"]);
  });
});

describe("reviewStats", () => {
  it("counts reviews and distinct cafes", () => {
    const list = [review({ cafe_id: "x" }), review({ cafe_id: "x" }), review({ cafe_id: "y" })];
    expect(reviewStats(list)).toEqual({ reviews: 3, cafes: 2 });
  });
});

describe("relativeAge", () => {
  const now = new Date(2026, 9, 20, 15, 0);
  const daysAgo = (n: number) => new Date(2026, 9, 20 - n, 23, 0).toISOString();

  it.each([
    [0, "today"],
    [1, "yesterday"],
    [2, "2 days ago"],
    [6, "6 days ago"],
    [7, "last week"],
    [13, "last week"],
    [21, "3 weeks ago"],
    [35, "last month"],
    [90, "3 months ago"],
    [400, "last year"],
  ])("%i days ago reads %s", (days, expected) => {
    expect(relativeAge(daysAgo(days), now)).toBe(expected);
  });
});

describe("detailsLine", () => {
  it("joins the price and the beans", () => {
    const r = review({
      beans: "Single origin Ethiopian",
      drinks: [{ drink_id: 1, name: "Magic", rating: 4, milk: null, price_aud: 5.8 }],
    });
    expect(detailsLine(r)).toBe("$5.80 · Single origin Ethiopian");
  });

  it("shows the price alone, or nothing", () => {
    const priced = review({
      drinks: [{ drink_id: 1, name: "Flat white", rating: 4, milk: null, price_aud: 5.5 }],
    });
    expect(detailsLine(priced)).toBe("$5.50");
    expect(detailsLine(review())).toBe("");
  });
});

describe("locationStatus", () => {
  it("reads a granted permission as while using", () => {
    expect(locationStatus({ granted: true, canAskAgain: true, status: "granted" })).toBe(
      "while-using",
    );
  });

  it("reads a refusal as denied", () => {
    expect(locationStatus({ granted: false, canAskAgain: false, status: "denied" })).toBe("denied");
  });

  it("reads an unanswered permission as not set", () => {
    expect(locationStatus({ granted: false, canAskAgain: true, status: "undetermined" })).toBe(
      "not-asked",
    );
  });
});
