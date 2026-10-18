import {
  distanceMetres,
  regionAtZoom,
  regionToBbox,
  regionToZoom,
  roundBbox,
  searchTileKey,
} from "../geo";

const region = { latitude: -37.8, longitude: 144.98, latitudeDelta: 0.02, longitudeDelta: 0.01 };

describe("regionToBbox", () => {
  it("returns west, south, east, north around the centre", () => {
    const [west, south, east, north] = regionToBbox(region);
    expect(west).toBeCloseTo(144.975, 6);
    expect(east).toBeCloseTo(144.985, 6);
    expect(south).toBeCloseTo(-37.81, 6);
    expect(north).toBeCloseTo(-37.79, 6);
  });
});

describe("regionToZoom", () => {
  it("is 0 for the whole world and grows as the view narrows", () => {
    expect(regionToZoom({ ...region, longitudeDelta: 360 })).toBe(0);
    expect(regionToZoom({ ...region, longitudeDelta: 0.0439 })).toBe(13);
    expect(regionToZoom({ ...region, longitudeDelta: 0.01 })).toBe(15);
  });

  it("stays within 0 to 20", () => {
    expect(regionToZoom({ ...region, longitudeDelta: 1000 })).toBe(0);
    expect(regionToZoom({ ...region, longitudeDelta: 0.0000001 })).toBe(20);
  });
});

describe("regionAtZoom", () => {
  it("centres on the point at the zoom and round-trips with regionToZoom", () => {
    const r = regionAtZoom({ lat: -37.8, lng: 144.98 }, 15);
    expect(r.latitude).toBe(-37.8);
    expect(r.longitude).toBe(144.98);
    expect(regionToZoom(r)).toBe(15);
    expect(r.latitudeDelta).toBeGreaterThan(r.longitudeDelta);
  });
});

describe("distanceMetres", () => {
  it("is 0 for the same point", () => {
    expect(distanceMetres({ lat: -37.8, lng: 144.98 }, { lat: -37.8, lng: 144.98 })).toBe(0);
  });

  it("measures Melbourne CBD to Fitzroy at about 2 km", () => {
    const d = distanceMetres({ lat: -37.8136, lng: 144.9631 }, { lat: -37.7983, lng: 144.9785 });
    expect(d).toBeGreaterThan(1900);
    expect(d).toBeLessThan(2400);
  });

  it("measures 0.001 degrees of latitude at about 111 m", () => {
    expect(distanceMetres({ lat: -37.8, lng: 144.98 }, { lat: -37.801, lng: 144.98 })).toBeCloseTo(
      111.2,
      0,
    );
  });
});

describe("roundBbox", () => {
  it("grows the box outwards to a 0.005 degree grid so small pans share a query", () => {
    expect(roundBbox([144.9761, -37.8113, 144.9849, -37.7987])).toEqual([
      144.975, -37.815, 144.985, -37.795,
    ]);
  });
});

describe("searchTileKey", () => {
  it("is the same for views centred in the same 0.01 degree tile", () => {
    expect(searchTileKey({ ...region, latitude: -37.8012, longitude: 144.9821 })).toBe(
      searchTileKey({ ...region, latitude: -37.8049, longitude: 144.9877 }),
    );
  });

  it("differs between tiles", () => {
    expect(searchTileKey(region)).not.toBe(searchTileKey({ ...region, longitude: 145.1 }));
  });
});
