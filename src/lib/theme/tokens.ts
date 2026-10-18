import type { Metric } from "@/domain/metrics";
import { contrastRatio, mix } from "./contrast";

export type ColorScheme = "light" | "dark";

export type Shade = { bg: string; fg: string };
export type MetricColors = {
  /** Selected chip, pin and tile accent. */
  strong: string;
  /** Text and icons on `strong`. */
  onStrong: string;
  /** Tile and card background. */
  tint: string;
  /** Text and icons on `tint`. */
  onTint: string;
  /** Pin shades by score band (< 3.5, 3.5 to 4.2, 4.3 and up). */
  bands: { low: Shade; mid: Shade; high: Shade };
};

export type Theme = {
  scheme: ColorScheme;
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    onPrimary: string;
    danger: string;
  };
  metrics: Record<Metric, MetricColors>;
  /** Pins for "New" and "Rate first". */
  neutralBand: Shade;
};

type MetricSeed = Pick<MetricColors, "strong" | "onStrong" | "tint" | "onTint">;

/** Picks whichever of two text colours reads better on `bg`. */
function readable(bg: string, a: string, b: string): string {
  return contrastRatio(a, bg) >= contrastRatio(b, bg) ? a : b;
}

function metricColors(seed: MetricSeed, background: string, text: string): MetricColors {
  const shade = (bg: string): Shade => ({ bg, fg: readable(bg, seed.onStrong, text) });
  return {
    ...seed,
    bands: {
      low: shade(mix(seed.strong, background, 0.6)),
      mid: shade(mix(seed.strong, background, 0.1)),
      high: { bg: seed.strong, fg: seed.onStrong },
    },
  };
}

function buildTheme(
  scheme: ColorScheme,
  colors: Theme["colors"],
  seeds: Record<Metric, MetricSeed>,
  neutralBand: Shade,
): Theme {
  const metrics = {} as Record<Metric, MetricColors>;
  for (const metric of Object.keys(seeds) as Metric[]) {
    metrics[metric] = metricColors(seeds[metric], colors.background, colors.text);
  }
  return { scheme, colors, metrics, neutralBand };
}

const light = buildTheme(
  "light",
  {
    background: "#FBF6EE",
    surface: "#FFFCF7",
    text: "#2B1B12",
    textMuted: "#6B5B4F",
    border: "#E6DCCB",
    primary: "#4A2E1F",
    onPrimary: "#FFFFFF",
    danger: "#B3261E",
  },
  {
    // Espresso brown, sage green, terracotta, slate blue.
    coffee: { strong: "#5B3A29", onStrong: "#FFFFFF", tint: "#F1E6DC", onTint: "#4A2E1F" },
    food: { strong: "#3F6B45", onStrong: "#FFFFFF", tint: "#E4EEE0", onTint: "#2F5535" },
    vibe: { strong: "#A8472F", onStrong: "#FFFFFF", tint: "#F7E2DA", onTint: "#8A3823" },
    work: { strong: "#3F5F85", onStrong: "#FFFFFF", tint: "#E0E8F2", onTint: "#2F4B6B" },
  },
  { bg: "#E5DED3", fg: "#5C4E43" },
);

const dark = buildTheme(
  "dark",
  {
    background: "#1A130E",
    surface: "#261C15",
    text: "#F5ECE0",
    textMuted: "#BFAF9F",
    border: "#3A2D24",
    primary: "#E8C4A5",
    onPrimary: "#1A130E",
    danger: "#F2B8B5",
  },
  {
    coffee: { strong: "#D9A87F", onStrong: "#1A130E", tint: "#3A2A1F", onTint: "#E8C4A5" },
    food: { strong: "#8FBF8F", onStrong: "#1A130E", tint: "#25342A", onTint: "#B5D8B5" },
    vibe: { strong: "#E58B6D", onStrong: "#1A130E", tint: "#3D2620", onTint: "#F0AE96" },
    work: { strong: "#8DAFD6", onStrong: "#1A130E", tint: "#232F3E", onTint: "#B3CBE6" },
  },
  { bg: "#3A3029", fg: "#D8CBBD" },
);

export const themes: Record<ColorScheme, Theme> = { light, dark };

/** 4 pt grid. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;

/** Font families as registered with `useFonts` in the root layout. */
export const fonts = {
  heading: "Fraunces_600SemiBold",
  headingBold: "Fraunces_700Bold",
  body: "Manrope_400Regular",
  bodyMedium: "Manrope_500Medium",
  bodySemiBold: "Manrope_600SemiBold",
  bodyBold: "Manrope_700Bold",
} as const;

export const typeScale = {
  display: { fontFamily: fonts.headingBold, fontSize: 32, lineHeight: 38 },
  title: { fontFamily: fonts.heading, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
} as const;
