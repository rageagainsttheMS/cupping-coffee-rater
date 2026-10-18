import { DEFAULT_MAP_CENTRE } from "../mapDefaults";

describe("DEFAULT_MAP_CENTRE", () => {
  it("is in Melbourne's centre, where the launch cafes are", () => {
    expect(DEFAULT_MAP_CENTRE.lat).toBeGreaterThan(-37.9);
    expect(DEFAULT_MAP_CENTRE.lat).toBeLessThan(-37.7);
    expect(DEFAULT_MAP_CENTRE.lng).toBeGreaterThan(144.9);
    expect(DEFAULT_MAP_CENTRE.lng).toBeLessThan(145.05);
  });
});
