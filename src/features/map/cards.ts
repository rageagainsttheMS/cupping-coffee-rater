import { copy } from "@/lib/copy/en";
import { distanceMetres } from "./geo";
import type { MapCafe, Point } from "./types";

/**
 * The order of the cards at the bottom of the map: best score for the selected metric first, then
 * nearest to the person, then by name. Cafes without a score come last.
 */
export function sortForCards(cafes: readonly MapCafe[], from?: Point | null): MapCafe[] {
  return [...cafes].sort((a, b) => {
    if (a.score !== b.score) {
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score;
    }
    if (a.has_ratings !== b.has_ratings) return a.has_ratings ? -1 : 1;
    if (from) {
      const nearer = distanceMetres(from, a) - distanceMetres(from, b);
      if (Math.abs(nearer) > 1) return nearer;
    }
    return a.name.localeCompare(b.name);
  });
}

/** "350 m" up to a kilometre, then "1.8 km". Empty when the distance is not known. */
export function formatDistance(metres: number | null): string {
  if (metres === null) return "";
  if (metres < 1000) return copy.map.distanceMetres(Math.max(10, Math.round(metres / 10) * 10));
  return copy.map.distanceKm((metres / 1000).toFixed(1));
}
