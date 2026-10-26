import { MAX_PER_RUN, refreshCafes } from "../refresh.ts";
import { PlacesError } from "../types.ts";
import type { CafeStore, PlaceDetails, PlacesClient } from "../types.ts";

const NOW = new Date("2026-10-26T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const fresh: PlaceDetails = {
  name: "Brother Baba Budan",
  lat: -37.8136,
  lng: 144.9631,
  openNow: null,
  weekdayDescriptions: null,
  rating: null,
  ratingCount: null,
  mapsUri: null,
};

type Row = { id: string; googlePlaceId: string; ageDays: number };

/** A fake store whose find methods honour the cutoff they are given, as the database does. */
function setup({
  coordinateRows = [] as Row[],
  placeIdRows = [] as Row[],
  getDetails = jest.fn(async (_id: string): Promise<PlaceDetails | null> => fresh),
  getPlaceId = jest.fn(async (id: string): Promise<string | null> => id),
} = {}) {
  const pick = (rows: Row[], cutoff: Date, limit: number) =>
    rows
      .filter((r) => NOW.getTime() - r.ageDays * DAY_MS < cutoff.getTime())
      .slice(0, limit)
      .map((r) => ({ id: r.id, googlePlaceId: r.googlePlaceId }));
  const store = {
    findCafesToRefresh: jest.fn(async (cutoff: Date, limit: number) =>
      pick(coordinateRows, cutoff, limit),
    ),
    findPlaceIdsToCheck: jest.fn(async (cutoff: Date, limit: number) =>
      pick(placeIdRows, cutoff, limit),
    ),
    refreshCafe: jest.fn(async () => {}),
    markPlaceIdChecked: jest.fn(async () => {}),
  };
  const places = { getDetails, getPlaceId };
  return {
    store,
    places,
    run: () =>
      refreshCafes({
        store: store as unknown as CafeStore,
        places: places as unknown as PlacesClient,
        now: NOW,
      }),
  };
}

beforeEach(() => {
  jest.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe("refreshCafes coordinates", () => {
  it("picks up a row refreshed more than 25 days ago and leaves a recent one alone", async () => {
    const { run, store, places } = setup({
      coordinateRows: [
        { id: "old", googlePlaceId: "g_old", ageDays: 26 },
        { id: "recent", googlePlaceId: "g_recent", ageDays: 24 },
      ],
    });
    const summary = await run();
    expect(places.getDetails).toHaveBeenCalledTimes(1);
    expect(places.getDetails).toHaveBeenCalledWith("g_old");
    expect(store.refreshCafe).toHaveBeenCalledWith("old", {
      name: "Brother Baba Budan",
      lat: -37.8136,
      lng: 144.9631,
    });
    expect(summary.coordinates_refreshed).toBe(1);
  });

  it("asks the store for rows older than 25 days", async () => {
    const { run, store } = setup();
    await run();
    expect(store.findCafesToRefresh).toHaveBeenCalledWith(
      new Date(NOW.getTime() - 25 * DAY_MS),
      MAX_PER_RUN,
    );
  });

  it("keeps the stored coordinates when the lookup fails", async () => {
    const { run, store, places } = setup({
      coordinateRows: [{ id: "old", googlePlaceId: "g_old", ageDays: 30 }],
      getDetails: jest.fn(async (_id: string): Promise<PlaceDetails | null> => {
        throw new PlacesError(503);
      }),
    });
    const summary = await run();
    expect(places.getDetails).toHaveBeenCalled();
    expect(store.refreshCafe).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ coordinates_refreshed: 0, failed: 1 });
  });

  it("keeps the stored coordinates when Google no longer has the place", async () => {
    const { run, store } = setup({
      coordinateRows: [{ id: "gone", googlePlaceId: "g_gone", ageDays: 30 }],
      getDetails: jest.fn(async (_id: string) => null),
    });
    const summary = await run();
    expect(store.refreshCafe).not.toHaveBeenCalled();
    expect(summary.not_found).toBe(1);
  });

  it("keeps the stored coordinates when Google omits the position", async () => {
    const { run, store } = setup({
      coordinateRows: [{ id: "x", googlePlaceId: "g_x", ageDays: 30 }],
      getDetails: jest.fn(async (_id: string) => ({ ...fresh, lat: null, lng: null })),
    });
    const summary = await run();
    expect(store.refreshCafe).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });

  it("carries on after one row fails", async () => {
    const getDetails = jest
      .fn<Promise<PlaceDetails | null>, [string]>()
      .mockRejectedValueOnce(new PlacesError(500))
      .mockResolvedValue(fresh);
    const { run, store } = setup({
      coordinateRows: [
        { id: "a", googlePlaceId: "g_a", ageDays: 40 },
        { id: "b", googlePlaceId: "g_b", ageDays: 39 },
      ],
      getDetails,
    });
    const summary = await run();
    expect(store.refreshCafe).toHaveBeenCalledTimes(1);
    expect(summary).toMatchObject({ coordinates_refreshed: 1, failed: 1 });
  });

  it("stops after repeated failures instead of spending the whole cap", async () => {
    const rows = Array.from({ length: 50 }, (_, i) => ({
      id: `c${i}`,
      googlePlaceId: `g${i}`,
      ageDays: 30,
    }));
    const { run, places } = setup({
      coordinateRows: rows,
      getDetails: jest.fn(async (_id: string): Promise<PlaceDetails | null> => {
        throw new PlacesError(403);
      }),
    });
    const summary = await run();
    expect(places.getDetails).toHaveBeenCalledTimes(5);
    expect(summary.failed).toBe(5);
  });
});

describe("refreshCafes place ids", () => {
  it("checks IDs older than 12 months and records the answer", async () => {
    const { run, store, places } = setup({
      placeIdRows: [
        { id: "old", googlePlaceId: "g_old", ageDays: 400 },
        { id: "recent", googlePlaceId: "g_recent", ageDays: 300 },
      ],
      getPlaceId: jest.fn(async (_id: string): Promise<string | null> => "g_renewed"),
    });
    const summary = await run();
    expect(places.getPlaceId).toHaveBeenCalledTimes(1);
    expect(store.markPlaceIdChecked).toHaveBeenCalledWith("old", "g_renewed");
    expect(summary).toMatchObject({ place_ids_checked: 1, place_ids_changed: 1 });
  });

  it("does not count an unchanged ID as changed", async () => {
    const { run } = setup({ placeIdRows: [{ id: "o", googlePlaceId: "g_o", ageDays: 400 }] });
    expect(await run()).toMatchObject({ place_ids_checked: 1, place_ids_changed: 0 });
  });

  it("leaves the row alone when the ID lookup fails", async () => {
    const { run, store } = setup({
      placeIdRows: [{ id: "o", googlePlaceId: "g_o", ageDays: 400 }],
      getPlaceId: jest.fn(async (_id: string): Promise<string | null> => {
        throw new PlacesError(500);
      }),
    });
    const summary = await run();
    expect(store.markPlaceIdChecked).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });
});

describe("refreshCafes cap", () => {
  it("never makes more than the cap in calls, coordinates first", async () => {
    const coordinateRows = Array.from({ length: MAX_PER_RUN - 10 }, (_, i) => ({
      id: `c${i}`,
      googlePlaceId: `g${i}`,
      ageDays: 30,
    }));
    const placeIdRows = Array.from({ length: 500 }, (_, i) => ({
      id: `p${i}`,
      googlePlaceId: `gp${i}`,
      ageDays: 500,
    }));
    const { run, places, store } = setup({ coordinateRows, placeIdRows });
    const summary = await run();
    expect(places.getDetails).toHaveBeenCalledTimes(MAX_PER_RUN - 10);
    expect(places.getPlaceId).toHaveBeenCalledTimes(10);
    expect(store.findPlaceIdsToCheck).toHaveBeenCalledWith(expect.any(Date), 10);
    expect(summary.coordinates_refreshed + summary.place_ids_checked).toBe(MAX_PER_RUN);
  });

  it("skips the ID check when coordinates used the whole cap", async () => {
    const coordinateRows = Array.from({ length: MAX_PER_RUN + 50 }, (_, i) => ({
      id: `c${i}`,
      googlePlaceId: `g${i}`,
      ageDays: 30,
    }));
    const { run, store } = setup({ coordinateRows });
    await run();
    expect(store.findPlaceIdsToCheck).not.toHaveBeenCalled();
  });
});
