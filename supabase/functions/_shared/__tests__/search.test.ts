import { ENOUGH_STORED_CAFES, SEARCH_REPEAT_DAYS, searchPlaces } from "../search.ts";
import { searchInputSchema } from "../schemas.ts";
import type { CafeStore, PlaceCafe, PlacesClient } from "../types.ts";

const found = (n: number): PlaceCafe[] =>
  Array.from({ length: n }, (_, i) => ({
    googlePlaceId: `g${i}`,
    name: `Cafe ${i}`,
    suburb: "Fitzroy",
    lat: -37.8,
    lng: 144.98,
  }));

function setup({
  stored = 0,
  searchedRecently = false,
  nearby = found(3),
}: { stored?: number; searchedRecently?: boolean; nearby?: PlaceCafe[] } = {}) {
  const store = {
    countCafesInBox: jest.fn(async () => stored),
    wasSearchedSince: jest.fn(async () => searchedRecently),
    logSearch: jest.fn(async () => {}),
    upsertCafes: jest.fn(async (cafes: PlaceCafe[]) =>
      cafes.map((c, i) => ({ id: `id${i}`, ...c, google_place_id: c.googlePlaceId })),
    ),
    findCafePlaceId: jest.fn(),
    refreshCafe: jest.fn(),
  };
  const places = {
    searchNearby: jest.fn(async () => nearby),
    searchText: jest.fn(async () => nearby),
    getDetails: jest.fn(),
  };
  const now = new Date("2026-10-18T00:00:00Z");
  return {
    store,
    places,
    run: (input: unknown) =>
      searchPlaces(searchInputSchema.parse(input), {
        store: store as unknown as CafeStore,
        places: places as unknown as PlacesClient,
        now: () => now,
      }),
  };
}

describe("area search", () => {
  it("skips Google when enough cafes are already stored", async () => {
    const { run, places, store } = setup({ stored: ENOUGH_STORED_CAFES });
    const result = await run({ lat: -37.8, lng: 144.98 });
    expect(result.status).toBe("enough_stored");
    expect(places.searchNearby).not.toHaveBeenCalled();
    expect(store.upsertCafes).not.toHaveBeenCalled();
  });

  it("skips Google when the area was searched recently", async () => {
    const { run, places, store } = setup({ searchedRecently: true });
    const result = await run({ lat: -37.8, lng: 144.98 });
    expect(result.status).toBe("recently_searched");
    expect(places.searchNearby).not.toHaveBeenCalled();
    const since = (store.wasSearchedSince.mock.calls[0] as unknown as [string, Date])[1];
    expect(new Date("2026-10-18T00:00:00Z").getTime() - since.getTime()).toBe(
      SEARCH_REPEAT_DAYS * 24 * 60 * 60 * 1000,
    );
  });

  it("searches Google once, stores what it finds and logs the area", async () => {
    const { run, places, store } = setup({ stored: 2 });
    const result = await run({ lat: -37.8, lng: 144.98, radius_m: 800 });

    expect(result.status).toBe("searched");
    expect(places.searchNearby).toHaveBeenCalledTimes(1);
    expect(places.searchNearby).toHaveBeenCalledWith({ lat: -37.8, lng: 144.98, radiusM: 800 });
    expect(store.upsertCafes).toHaveBeenCalledTimes(1);
    expect(store.logSearch).toHaveBeenCalledTimes(1);
    expect(result.cafes.map((c) => c.name)).toEqual(["Cafe 0", "Cafe 1", "Cafe 2"]);
  });

  it("logs an empty search so the area is not searched again", async () => {
    const { run, store } = setup({ nearby: [] });
    const result = await run({ lat: -37.8, lng: 144.98 });
    expect(result.cafes).toEqual([]);
    expect(store.upsertCafes).not.toHaveBeenCalled();
    expect((store.logSearch.mock.calls[0] as unknown as [string, number])[1]).toBe(0);
  });

  it("stores a place that Google returns twice only once", async () => {
    const { run, store } = setup({ nearby: [...found(2), ...found(2)] });
    await run({ lat: -37.8, lng: 144.98 });
    expect((store.upsertCafes.mock.calls[0] as unknown as [PlaceCafe[]])[0]).toHaveLength(2);
  });

  it("turns a bounding box into a centre and radius, within limits", async () => {
    const { run, places } = setup();
    await run({ bbox: { min_lng: 144.96, min_lat: -37.81, max_lng: 144.98, max_lat: -37.79 } });
    const call = (
      places.searchNearby.mock.calls[0] as unknown as [
        { lat: number; lng: number; radiusM: number },
      ]
    )[0];
    expect(call.lat).toBeCloseTo(-37.8, 5);
    expect(call.lng).toBeCloseTo(144.97, 5);
    expect(call.radiusM).toBeGreaterThanOrEqual(300);
    expect(call.radiusM).toBeLessThanOrEqual(3000);
  });

  it("clamps a huge radius", async () => {
    const { run, places } = setup();
    await run({ lat: -37.8, lng: 144.98, radius_m: 5000 });
    expect((places.searchNearby.mock.calls[0] as unknown as [{ radiusM: number }])[0].radiusM).toBe(
      3000,
    );
  });

  it("uses the same log key for two points in the same tile", async () => {
    const a = setup();
    const b = setup();
    await a.run({ lat: -37.8012, lng: 144.9821 });
    await b.run({ lat: -37.8049, lng: 144.9877 });
    expect((a.store.logSearch.mock.calls[0] as unknown as [string])[0]).toBe(
      (b.store.logSearch.mock.calls[0] as unknown as [string])[0],
    );
  });
});

describe("text search", () => {
  it("searches Google for the query, stores the results and returns them", async () => {
    const { run, places, store } = setup();
    const result = await run({ query: "Market Lane", lat: -37.8, lng: 144.98 });

    expect(result.status).toBe("searched");
    expect(places.searchText).toHaveBeenCalledWith({
      query: "Market Lane",
      near: { lat: -37.8, lng: 144.98 },
    });
    expect(places.searchNearby).not.toHaveBeenCalled();
    expect(store.upsertCafes).toHaveBeenCalledTimes(1);
    expect(result.cafes).toHaveLength(3);
  });

  it("does not repeat a query that was searched recently", async () => {
    const { run, places } = setup({ searchedRecently: true });
    const result = await run({ query: "Market Lane" });
    expect(result.status).toBe("recently_searched");
    expect(places.searchText).not.toHaveBeenCalled();
  });

  it("treats the same query in different case and spacing as the same search", async () => {
    const a = setup();
    const b = setup();
    await a.run({ query: "Market Lane" });
    await b.run({ query: "  market   lane " });
    expect((a.store.logSearch.mock.calls[0] as unknown as [string])[0]).toBe(
      (b.store.logSearch.mock.calls[0] as unknown as [string])[0],
    );
  });

  it("is not stopped by the number of stored cafes", async () => {
    const { run, places } = setup({ stored: 500 });
    await run({ query: "Market Lane" });
    expect(places.searchText).toHaveBeenCalledTimes(1);
  });
});

describe("input validation", () => {
  it.each([
    ["no area and no query", {}],
    ["a query under 3 characters", { query: "ab" }],
    ["a query over 100 characters", { query: "x".repeat(101) }],
    ["a latitude out of range", { lat: 91, lng: 0 }],
    ["a longitude out of range", { lat: 0, lng: 181 }],
    ["a latitude without a longitude", { lat: -37.8 }],
    [
      "a flipped bounding box",
      { bbox: { min_lng: 145, min_lat: -37.7, max_lng: 144, max_lat: -37.8 } },
    ],
  ])("rejects %s", (_name, input) => {
    expect(searchInputSchema.safeParse(input).success).toBe(false);
  });
});
