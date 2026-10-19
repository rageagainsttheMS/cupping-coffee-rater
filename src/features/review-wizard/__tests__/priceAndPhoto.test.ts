import { resizeTarget } from "../photo";
import { DEFAULT_PRICE, PRICE_MAX, stepPrice } from "../price";

describe("stepPrice", () => {
  it("moves in 10 cent steps without floating point drift", () => {
    let price: number | null = 5.5;
    for (let i = 0; i < 3; i++) price = stepPrice(price, null, 1);
    expect(price).toBe(5.8);
    for (let i = 0; i < 5; i++) price = stepPrice(price, null, -1);
    expect(price).toBe(5.3);
  });

  it("starts from the cafe's median, else $5", () => {
    expect(stepPrice(null, 5.5, 1)).toBe(5.6);
    expect(stepPrice(null, 5.5, -1)).toBe(5.4);
    expect(stepPrice(null, null, 1)).toBe(DEFAULT_PRICE + 0.1);
  });

  it("stays between $0 and the database maximum", () => {
    expect(stepPrice(0, null, -1)).toBe(0);
    expect(stepPrice(0.05, null, -1)).toBe(0);
    expect(stepPrice(PRICE_MAX, null, 1)).toBe(PRICE_MAX);
  });
});

describe("resizeTarget", () => {
  it("shrinks the long edge to 1600 and keeps the shape", () => {
    expect(resizeTarget(4000, 3000)).toEqual({ width: 1600 });
    expect(resizeTarget(3000, 4000)).toEqual({ height: 1600 });
    expect(resizeTarget(4000, 4000)).toEqual({ width: 1600 });
  });

  it("never scales a small photo up", () => {
    expect(resizeTarget(1600, 1200)).toBeNull();
    expect(resizeTarget(800, 600)).toBeNull();
  });

  it("leaves an image with unknown size alone", () => {
    expect(resizeTarget(0, 0)).toBeNull();
    expect(resizeTarget(NaN, 100)).toBeNull();
  });
});
