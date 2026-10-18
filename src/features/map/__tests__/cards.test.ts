import { copy } from "@/lib/copy/en";
import { formatDistance, sortForCards } from "../cards";
import { cafe } from "../__fixtures__/cafe";

describe("sortForCards", () => {
  it("orders by the selected metric's score, best first", () => {
    const a = cafe({ name: "A", score: 3.9 });
    const b = cafe({ name: "B", score: 4.7 });
    const c = cafe({ name: "C", score: 4.2 });
    expect(sortForCards([a, b, c]).map((x) => x.name)).toEqual(["B", "C", "A"]);
  });

  it("puts cafes without a score after the scored ones", () => {
    const rated = cafe({ name: "Rated", score: 3.0 });
    const isNew = cafe({ name: "New", score: null, has_ratings: true });
    const blank = cafe({ name: "Blank", score: null, has_ratings: false });
    expect(sortForCards([blank, isNew, rated]).map((x) => x.name)).toEqual([
      "Rated",
      "New",
      "Blank",
    ]);
  });

  it("breaks ties by distance from the person, nearest first", () => {
    const far = cafe({ name: "Far", score: 4.0, lat: -37.82, lng: 144.98 });
    const near = cafe({ name: "Near", score: 4.0, lat: -37.8001, lng: 144.98 });
    expect(sortForCards([far, near], { lat: -37.8, lng: 144.98 }).map((x) => x.name)).toEqual([
      "Near",
      "Far",
    ]);
  });

  it("falls back to name when scores tie and there is no position", () => {
    const b = cafe({ name: "Bravo", score: 4.0 });
    const a = cafe({ name: "Alpha", score: 4.0 });
    expect(sortForCards([b, a]).map((x) => x.name)).toEqual(["Alpha", "Bravo"]);
  });

  it("does not change the list it is given", () => {
    const list = [cafe({ score: 3.0 }), cafe({ score: 4.0 })];
    const copyOfList = [...list];
    sortForCards(list);
    expect(list).toEqual(copyOfList);
  });
});

describe("formatDistance", () => {
  it("shows metres under a kilometre, rounded to 10", () => {
    expect(formatDistance(347)).toBe(copy.map.distanceMetres(350));
    expect(formatDistance(4)).toBe(copy.map.distanceMetres(10));
  });

  it("shows kilometres with one decimal from 1 km", () => {
    expect(formatDistance(1000)).toBe(copy.map.distanceKm("1.0"));
    expect(formatDistance(1840)).toBe(copy.map.distanceKm("1.8"));
  });

  it("is empty when the distance is unknown", () => {
    expect(formatDistance(null)).toBe("");
  });
});
