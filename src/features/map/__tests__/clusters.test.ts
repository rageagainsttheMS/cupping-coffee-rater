import {
  buildClusterIndex,
  clusterExpansionZoom,
  getMapItems,
  isFaded,
  pinKind,
} from "../clusters";
import { cafe } from "../__fixtures__/cafe";

const WORLD_BBOX: [number, number, number, number] = [-180, -85, 180, 85];

describe("pinKind", () => {
  it("is rated when the selected metric has a score", () => {
    expect(pinKind(cafe({ score: 4.2 }))).toBe("rated");
  });

  it('is "new" when the cafe has ratings but this metric has fewer than 3', () => {
    expect(pinKind(cafe({ score: null, rating_count: 2, has_ratings: true }))).toBe("new");
    expect(pinKind(cafe({ score: null, rating_count: 0, has_ratings: true }))).toBe("new");
  });

  it('is "rate first" when nobody has rated the cafe at all', () => {
    expect(pinKind(cafe({ score: null, rating_count: 0, has_ratings: false }))).toBe("rate_first");
  });
});

describe("isFaded", () => {
  it("fades low scores (under 3.5) and nothing else", () => {
    expect(isFaded(cafe({ score: 3.4 }))).toBe(true);
    expect(isFaded(cafe({ score: 3.5 }))).toBe(false);
    expect(isFaded(cafe({ score: 4.6 }))).toBe(false);
    expect(isFaded(cafe({ score: null }))).toBe(false);
  });
});

describe("clustering", () => {
  const near = (over: Parameters<typeof cafe>[0]) => cafe({ lat: -37.8, lng: 144.98, ...over });

  it("carries the count and the best score of everything in a cluster", () => {
    const index = buildClusterIndex([
      near({ score: 4.6 }),
      near({ score: 3.9 }),
      near({ score: 4.1 }),
    ]);
    const items = getMapItems(index, WORLD_BBOX, 3);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "cluster", count: 3, best: 4.6 });
  });

  it("counts unrated cafes in the cluster but not towards its best score", () => {
    const index = buildClusterIndex([
      near({ score: 3.8 }),
      near({ score: null, has_ratings: false }),
      near({ score: null, has_ratings: true, rating_count: 1 }),
    ]);
    const [item] = getMapItems(index, WORLD_BBOX, 3);
    expect(item).toMatchObject({ kind: "cluster", count: 3, best: 3.8 });
  });

  it("has no best score when nothing in the cluster is rated", () => {
    const index = buildClusterIndex([
      near({ score: null, has_ratings: false }),
      near({ score: null, has_ratings: false }),
    ]);
    const [item] = getMapItems(index, WORLD_BBOX, 3);
    expect(item).toMatchObject({ kind: "cluster", count: 2, best: null });
  });

  it("takes the best across clusters of clusters", () => {
    const cafes = [
      ...[4.0, 4.2].map((score) => cafe({ lat: -37.8, lng: 144.98, score })),
      ...[3.0, 4.9].map((score) => cafe({ lat: -37.8001, lng: 144.9801, score })),
    ];
    const [item] = getMapItems(buildClusterIndex(cafes), WORLD_BBOX, 2);
    expect(item).toMatchObject({ kind: "cluster", count: 4, best: 4.9 });
  });

  it("shows individual cafes when zoomed in far enough", () => {
    const a = near({ lat: -37.8, lng: 144.98, score: 4.6 });
    const b = near({ lat: -37.8004, lng: 144.9804, score: 3.9 });
    const items = getMapItems(buildClusterIndex([a, b]), WORLD_BBOX, 19);
    expect(items.map((i) => i.kind)).toEqual(["cafe", "cafe"]);
    expect(items.map((i) => (i.kind === "cafe" ? i.cafe.id : "")).sort()).toEqual(
      [a.id, b.id].sort(),
    );
  });

  it("keeps far apart cafes separate", () => {
    const index = buildClusterIndex([
      cafe({ lat: -37.8, lng: 144.98 }),
      cafe({ lat: -37.9, lng: 145.2 }),
    ]);
    expect(getMapItems(index, WORLD_BBOX, 12)).toHaveLength(2);
  });

  it("only returns what is inside the box", () => {
    const inside = cafe({ lat: -37.8, lng: 144.98 });
    const outside = cafe({ lat: -37.9, lng: 145.2 });
    const items = getMapItems(
      buildClusterIndex([inside, outside]),
      [144.9, -37.85, 145.05, -37.75],
      14,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "cafe", cafe: { id: inside.id } });
  });

  it("works with no cafes", () => {
    expect(getMapItems(buildClusterIndex([]), WORLD_BBOX, 10)).toEqual([]);
  });

  it("gives a zoom that splits a cluster when it is tapped", () => {
    const index = buildClusterIndex([
      cafe({ lat: -37.8, lng: 144.98 }),
      cafe({ lat: -37.8008, lng: 144.9808 }),
    ]);
    const [item] = getMapItems(index, WORLD_BBOX, 8);
    if (item.kind !== "cluster") throw new Error("expected a cluster");
    const zoom = clusterExpansionZoom(index, item.id);
    expect(zoom).toBeGreaterThan(8);
    expect(getMapItems(index, WORLD_BBOX, zoom).every((i) => i.kind === "cafe")).toBe(true);
  });
});
