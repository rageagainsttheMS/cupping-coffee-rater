import {
  directionsUrl,
  drinkScore,
  formatPrice,
  formatVisitDate,
  googleFallbackRating,
  openStatus,
  otherRatings,
  reviewMetricRating,
  tagsForMetric,
} from "../format";
import type { CafeDrink, CafeTag, ReviewDrink } from "../types";
import { METRICS } from "@/domain/metrics";

const drink = (over: Partial<CafeDrink>): CafeDrink => ({
  drink_id: 1,
  name: "Magic",
  score: 4.8,
  rating_count: 14,
  median_price: 5.8,
  price_reports: 9,
  ...over,
});

const reviewDrink = (over: Partial<ReviewDrink>): ReviewDrink => ({
  drink_id: 1,
  name: "Magic",
  rating: 4,
  milk: null,
  price_aud: null,
  ...over,
});

describe("googleFallbackRating", () => {
  const google = { rating: 4.3 };

  it("shows on Coffee when there is no community score", () => {
    expect(googleFallbackRating("coffee", null, 0, google)).toBe(4.3);
    expect(googleFallbackRating("coffee", null, 2, google)).toBe(4.3);
  });

  it("is gone once Coffee has a community score", () => {
    expect(googleFallbackRating("coffee", 4.1, 3, google)).toBeNull();
  });

  it("never shows on Food, Vibe or Work", () => {
    expect(googleFallbackRating("work", null, 0, google)).toBeNull();
    expect(googleFallbackRating("food", null, 0, google)).toBeNull();
  });

  it("is nothing when Google has no rating or has not loaded", () => {
    expect(googleFallbackRating("coffee", null, 0, { rating: null })).toBeNull();
    expect(googleFallbackRating("coffee", null, 0, undefined)).toBeNull();
  });
});

describe("drinkScore", () => {
  it("hides the score under 3 ratings", () => {
    expect(drinkScore(drink({ score: 4.9, rating_count: 2 }))).toBeNull();
    expect(drinkScore(drink({ score: null, rating_count: 5 }))).toBeNull();
    expect(drinkScore(drink({ score: 4.8, rating_count: 3 }))).toBe(4.8);
  });
});

describe("tagsForMetric", () => {
  it("keeps one metric and puts the most reported first", () => {
    const tags: CafeTag[] = [
      { tag_id: 1, metric: "work", label: "Power outlets", count: 9 },
      { tag_id: 2, metric: "vibe", label: "Cosy", count: 20 },
      { tag_id: 3, metric: "work", label: "Wifi", count: 11 },
    ];
    expect(tagsForMetric(tags, "work").map((t) => t.label)).toEqual(["Wifi", "Power outlets"]);
  });
});

describe("openStatus", () => {
  // 2026-10-19 is a Monday, the first line Google lists.
  const monday = new Date(2026, 9, 19, 10, 0);
  const week = [
    "Monday: 7:00 AM – 4:00 PM",
    "Tuesday: 7:00 AM – 12:00 PM, 1:00 – 5:30 PM",
    "Wednesday: Open 24 hours",
  ];

  it("reads the closing time, with Google's narrow spaces", () => {
    expect(openStatus({ open_now: true, weekday_descriptions: week }, monday)).toEqual({
      kind: "open",
      until: "4pm",
    });
  });

  it("uses the last range of a split day and keeps the minutes", () => {
    const tuesday = new Date(2026, 9, 20, 10, 0);
    expect(openStatus({ open_now: true, weekday_descriptions: week }, tuesday)).toEqual({
      kind: "open",
      until: "5:30pm",
    });
  });

  it("is just open when the hours can't be read", () => {
    const wednesday = new Date(2026, 9, 21, 10, 0);
    expect(openStatus({ open_now: true, weekday_descriptions: week }, wednesday)).toEqual({
      kind: "open",
      until: null,
    });
    expect(openStatus({ open_now: true, weekday_descriptions: null }, monday)).toEqual({
      kind: "open",
      until: null,
    });
  });

  it("reports closed, and nothing when Google does not know", () => {
    expect(openStatus({ open_now: false, weekday_descriptions: week }, monday)).toEqual({
      kind: "closed",
    });
    expect(openStatus({ open_now: null, weekday_descriptions: week }, monday)).toBeNull();
    expect(openStatus(undefined, monday)).toBeNull();
  });

  it("counts Sunday as the last line", () => {
    const sunday = new Date(2026, 9, 25, 10, 0);
    const days = [...week, "Thursday: x", "Friday: x", "Saturday: x", "Sunday: 8:00 AM – 3:00 PM"];
    expect(openStatus({ open_now: true, weekday_descriptions: days }, sunday)).toEqual({
      kind: "open",
      until: "3pm",
    });
  });
});

describe("directionsUrl", () => {
  const cafe = { name: "Corner Roast", lat: -37.8, lng: 144.9 };

  it("prefers Google's maps link", () => {
    expect(directionsUrl(cafe, "https://maps.google.com/?cid=1", "ios")).toBe(
      "https://maps.google.com/?cid=1",
    );
  });

  it("falls back to the phone's maps app", () => {
    expect(directionsUrl(cafe, null, "ios")).toBe("maps://?q=Corner%20Roast&ll=-37.8,144.9");
    expect(directionsUrl(cafe, null, "android")).toBe(
      "geo:-37.8,144.9?q=-37.8,144.9(Corner%20Roast)",
    );
    expect(directionsUrl(cafe, undefined, "web")).toContain("google.com/maps");
  });
});

describe("review ratings", () => {
  const review = {
    drinks: [
      reviewDrink({ drink_id: 1, rating: 4 }),
      reviewDrink({ drink_id: 2, name: "Long black", rating: 4.5 }),
    ],
    ratings: { work: 5 },
  };

  it("uses the best drink for Coffee, or the filtered drink", () => {
    expect(reviewMetricRating(review, "coffee", null)).toBe(4.5);
    expect(reviewMetricRating(review, "coffee", 1)).toBe(4);
    expect(reviewMetricRating(review, "coffee", 99)).toBeNull();
  });

  it("reads the other metrics from ratings", () => {
    expect(reviewMetricRating(review, "work", null)).toBe(5);
    expect(reviewMetricRating(review, "food", null)).toBeNull();
  });

  it("lists the other rated metrics, leaving out the selected one", () => {
    expect(otherRatings(review, "work", METRICS)).toEqual([{ metric: "coffee", rating: 4.5 }]);
    expect(otherRatings(review, "coffee", METRICS)).toEqual([{ metric: "work", rating: 5 }]);
  });
});

describe("formatting", () => {
  it("formats prices", () => {
    expect(formatPrice(5.8)).toBe("$5.80");
    expect(formatPrice(4)).toBe("$4.00");
  });

  it("formats a visit date without shifting the day", () => {
    expect(formatVisitDate("2026-10-18")).toMatch(/18/);
    expect(formatVisitDate("2026-10-18")).toMatch(/2026/);
  });
});
