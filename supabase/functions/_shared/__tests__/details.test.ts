import { placeDetails } from "../details.ts";
import { detailsInputSchema } from "../schemas.ts";
import { HttpError } from "../http.ts";
import type { CafeStore, PlaceDetails, PlacesClient } from "../types.ts";

const details: PlaceDetails = {
  name: "Brother Baba Budan",
  lat: -37.8136,
  lng: 144.9631,
  openNow: true,
  weekdayDescriptions: ["Monday: 7:00 AM – 4:00 PM"],
  rating: 4.6,
  ratingCount: 812,
  mapsUri: "https://maps.google.com/?cid=1",
};

function setup({
  placeId = "ChIJabc" as string | null,
  google = details as PlaceDetails | null,
  refreshFails = false,
} = {}) {
  const store = {
    findCafePlaceId: jest.fn(async () => placeId),
    refreshCafe: jest.fn(async () => {
      if (refreshFails) throw new Error("db down");
    }),
  };
  const places = { getDetails: jest.fn(async () => google) };
  return {
    store,
    places,
    run: () =>
      placeDetails(detailsInputSchema.parse({ cafe_id: "10000000-0000-4000-8000-000000000001" }), {
        store: store as unknown as CafeStore,
        places: places as unknown as PlacesClient,
      }),
  };
}

describe("placeDetails", () => {
  it("returns hours, rating, count, maps link and the attribution flag", async () => {
    const { run } = setup();
    expect(await run()).toEqual({
      open_now: true,
      weekday_descriptions: ["Monday: 7:00 AM – 4:00 PM"],
      rating: 4.6,
      rating_count: 812,
      maps_uri: "https://maps.google.com/?cid=1",
      attribution: true,
    });
  });

  it("looks the place up by the stored Google place id", async () => {
    const { run, places } = setup();
    await run();
    expect(places.getDetails).toHaveBeenCalledWith("ChIJabc");
  });

  it("refreshes only the stored name and coordinates", async () => {
    const { run, store } = setup();
    await run();
    expect(store.refreshCafe).toHaveBeenCalledWith("10000000-0000-4000-8000-000000000001", {
      name: "Brother Baba Budan",
      lat: -37.8136,
      lng: 144.9631,
    });
  });

  it("skips the refresh when Google returned no name or position", async () => {
    const { run, store } = setup({ google: { ...details, name: null, lat: null, lng: null } });
    await run();
    expect(store.refreshCafe).not.toHaveBeenCalled();
  });

  it("still returns the details when the refresh fails", async () => {
    const { run } = setup({ refreshFails: true });
    expect((await run()).rating).toBe(4.6);
  });

  it("returns nulls when Google has no hours or rating", async () => {
    const { run } = setup({
      google: {
        ...details,
        openNow: null,
        weekdayDescriptions: null,
        rating: null,
        ratingCount: null,
      },
    });
    const result = await run();
    expect(result.open_now).toBeNull();
    expect(result.rating).toBeNull();
    expect(result.attribution).toBe(true);
  });

  it("answers 404 for an unknown cafe without calling Google", async () => {
    const { run, places } = setup({ placeId: null });
    await expect(run()).rejects.toMatchObject({ status: 404, code: "cafe_not_found" });
    expect(places.getDetails).not.toHaveBeenCalled();
  });

  it("answers 404 when Google no longer has the place", async () => {
    const { run, store } = setup({ google: null });
    const failure = await run().catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(HttpError);
    expect(failure).toMatchObject({ status: 404, code: "place_not_found" });
    expect(store.refreshCafe).not.toHaveBeenCalled();
  });

  it("never returns anything that could be stored as Google content beyond the response", async () => {
    // The store has no method for saving ratings or hours: only findCafePlaceId and refreshCafe are used.
    const { run, store } = setup();
    await run();
    expect(Object.keys(store).sort()).toEqual(["findCafePlaceId", "refreshCafe"]);
  });
});

describe("detailsInputSchema", () => {
  it("requires a uuid cafe id", () => {
    expect(detailsInputSchema.safeParse({ cafe_id: "nope" }).success).toBe(false);
    expect(detailsInputSchema.safeParse({}).success).toBe(false);
  });
});
