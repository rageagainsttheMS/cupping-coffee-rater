import { contrastRatio } from "../contrast";
import { METRICS } from "@/domain/metrics";
import { themes } from "../tokens";

const MIN_TEXT_CONTRAST = 4.5;

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for identical colours", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});

describe.each(Object.entries(themes))("%s theme", (_name, theme) => {
  it("has readable body and muted text on the background and surface", () => {
    for (const bg of [theme.colors.background, theme.colors.surface]) {
      expect(contrastRatio(theme.colors.text, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
      expect(contrastRatio(theme.colors.textMuted, bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it.each(METRICS)("%s: text is readable on strong, tint and every score band", (metric) => {
    const m = theme.metrics[metric];
    expect(contrastRatio(m.onStrong, m.strong)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(m.onTint, m.tint)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    for (const band of ["low", "mid", "high"] as const) {
      expect(contrastRatio(m.bands[band].fg, m.bands[band].bg)).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      );
    }
  });

  it("has a readable neutral band for New and Rate first", () => {
    const n = theme.neutralBand;
    expect(contrastRatio(n.fg, n.bg)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it("keeps each metric's strong colour distinct", () => {
    const strongs = METRICS.map((m) => theme.metrics[m].strong);
    expect(new Set(strongs).size).toBe(METRICS.length);
  });
});
