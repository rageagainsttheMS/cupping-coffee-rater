import { DETAILS_FIELD_MASK, SEARCH_FIELD_MASK, createPlacesClient } from "../places.ts";
import { PlacesError } from "../types.ts";

const KEY = "test-secret-key-123";

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function setup(response: ReturnType<typeof reply> | Error) {
  const fetchMock = jest.fn(async (_url: string, _init: unknown) => {
    if (response instanceof Error) throw response;
    return response;
  });
  const client = createPlacesClient({ apiKey: KEY, fetch: fetchMock });
  return { client, fetchMock };
}

const googlePlace = {
  id: "ChIJabc",
  displayName: { text: "Brother Baba Budan", languageCode: "en" },
  location: { latitude: -37.8136, longitude: 144.9631 },
  addressComponents: [
    { longText: "Melbourne", shortText: "Melbourne", types: ["locality", "political"] },
    { longText: "Victoria", shortText: "VIC", types: ["administrative_area_level_1"] },
  ],
};

describe("searchNearby", () => {
  it("sends the key, the minimal field mask and a distance-ranked cafe search", async () => {
    const { client, fetchMock } = setup(reply(200, { places: [googlePlace] }));
    await client.searchNearby({ lat: -37.8, lng: 144.97, radiusM: 1000 });

    const [url, init] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchNearby");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Goog-Api-Key"]).toBe(KEY);
    expect(init.headers["X-Goog-FieldMask"]).toBe(
      "places.id,places.displayName,places.location,places.addressComponents",
    );
    expect(SEARCH_FIELD_MASK).toBe(init.headers["X-Goog-FieldMask"]);
    expect(JSON.parse(init.body)).toEqual({
      includedTypes: ["cafe", "coffee_shop"],
      maxResultCount: 20,
      rankPreference: "DISTANCE",
      locationRestriction: {
        circle: { center: { latitude: -37.8, longitude: 144.97 }, radius: 1000 },
      },
    });
  });

  it("maps places to cafes, taking the suburb from the locality", async () => {
    const { client } = setup(reply(200, { places: [googlePlace] }));
    expect(await client.searchNearby({ lat: -37.8, lng: 144.97, radiusM: 1000 })).toEqual([
      {
        googlePlaceId: "ChIJabc",
        name: "Brother Baba Budan",
        suburb: "Melbourne",
        lat: -37.8136,
        lng: 144.9631,
      },
    ]);
  });

  it("falls back to the sublocality, then to no suburb", async () => {
    const sub = {
      ...googlePlace,
      addressComponents: [{ longText: "Fitzroy", types: ["sublocality_level_1", "sublocality"] }],
    };
    const none = { ...googlePlace, id: "ChIJnone", addressComponents: undefined };
    const { client } = setup(reply(200, { places: [sub, none] }));
    const cafes = await client.searchNearby({ lat: -37.8, lng: 144.97, radiusM: 1000 });
    expect(cafes.map((c) => c.suburb)).toEqual(["Fitzroy", null]);
  });

  it("skips places without an id, a name or a location", async () => {
    const { client } = setup(
      reply(200, {
        places: [
          googlePlace,
          { ...googlePlace, id: undefined },
          { ...googlePlace, id: "x", displayName: undefined },
          { ...googlePlace, id: "y", location: undefined },
        ],
      }),
    );
    expect(await client.searchNearby({ lat: -37.8, lng: 144.97, radiusM: 1000 })).toHaveLength(1);
  });

  it("returns an empty list when Google finds nothing", async () => {
    const { client } = setup(reply(200, {}));
    expect(await client.searchNearby({ lat: -37.8, lng: 144.97, radiusM: 1000 })).toEqual([]);
  });
});

describe("searchText", () => {
  it("sends the query with the same minimal field mask and a location bias", async () => {
    const { client, fetchMock } = setup(reply(200, { places: [googlePlace] }));
    await client.searchText({ query: "market lane", near: { lat: -37.8, lng: 144.97 } });

    const [url, init] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(init.headers["X-Goog-FieldMask"]).toBe(SEARCH_FIELD_MASK);
    expect(JSON.parse(init.body)).toEqual({
      textQuery: "market lane",
      includedType: "cafe",
      pageSize: 20,
      locationBias: { circle: { center: { latitude: -37.8, longitude: 144.97 }, radius: 5000 } },
    });
  });

  it("omits the bias when no position is given", async () => {
    const { client, fetchMock } = setup(reply(200, { places: [] }));
    await client.searchText({ query: "market lane" });
    const body = JSON.parse((fetchMock.mock.calls[0] as [string, any])[1].body);
    expect(body.locationBias).toBeUndefined();
  });
});

describe("getDetails", () => {
  const detailsBody = {
    id: "ChIJabc",
    displayName: { text: "Brother Baba Budan" },
    location: { latitude: -37.8136, longitude: 144.9631 },
    currentOpeningHours: { openNow: true },
    regularOpeningHours: { openNow: false, weekdayDescriptions: ["Monday: 7:00 AM – 4:00 PM"] },
    rating: 4.6,
    userRatingCount: 812,
    googleMapsUri: "https://maps.google.com/?cid=1",
  };

  it("requests only the fields the cafe page needs, as a header, with the id in the path", async () => {
    const { client, fetchMock } = setup(reply(200, detailsBody));
    await client.getDetails("ChIJ/odd id");

    const [url, init] = fetchMock.mock.calls[0] as [string, any];
    expect(url).toBe("https://places.googleapis.com/v1/places/ChIJ%2Fodd%20id");
    expect(init.method).toBe("GET");
    expect(init.headers["X-Goog-FieldMask"]).toBe(DETAILS_FIELD_MASK);
    expect(DETAILS_FIELD_MASK.split(",").sort()).toEqual(
      [
        "currentOpeningHours",
        "displayName",
        "googleMapsUri",
        "id",
        "location",
        "rating",
        "regularOpeningHours",
        "userRatingCount",
      ].sort(),
    );
  });

  it("maps the response, preferring current opening hours for open now", async () => {
    const { client } = setup(reply(200, detailsBody));
    expect(await client.getDetails("ChIJabc")).toEqual({
      name: "Brother Baba Budan",
      lat: -37.8136,
      lng: 144.9631,
      openNow: true,
      weekdayDescriptions: ["Monday: 7:00 AM – 4:00 PM"],
      rating: 4.6,
      ratingCount: 812,
      mapsUri: "https://maps.google.com/?cid=1",
    });
  });

  it("returns nulls for fields Google left out", async () => {
    const { client } = setup(reply(200, { id: "ChIJabc" }));
    expect(await client.getDetails("ChIJabc")).toEqual({
      name: null,
      lat: null,
      lng: null,
      openNow: null,
      weekdayDescriptions: null,
      rating: null,
      ratingCount: null,
      mapsUri: null,
    });
  });

  it("returns null when the place no longer exists", async () => {
    const { client } = setup(reply(404, { error: { message: "not found" } }));
    expect(await client.getDetails("gone")).toBeNull();
  });
});

describe("errors", () => {
  it("turns an error response into a generic PlacesError with no Google detail", async () => {
    const { client } = setup(
      reply(403, { error: { message: `API key ${KEY} is not authorised` } }),
    );
    const failure = await client
      .searchNearby({ lat: -37.8, lng: 144.97, radiusM: 1000 })
      .catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(PlacesError);
    expect(JSON.stringify(failure)).not.toContain(KEY);
    expect((failure as Error).message).not.toContain(KEY);
    expect((failure as Error).message).not.toContain("authorised");
  });

  it("turns a network failure into a PlacesError", async () => {
    const { client } = setup(new Error(`socket hang up for key ${KEY}`));
    const failure = await client.getDetails("ChIJabc").catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(PlacesError);
    expect((failure as Error).message).not.toContain(KEY);
  });
});
