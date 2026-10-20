import { distanceMetres } from "@/features/map/geo";
import type { Point } from "@/features/map/types";
import type { SavedCafe } from "./types";

/** Metres from the person to the cafe, or null when their position is not known. */
export function distanceTo(cafe: SavedCafe, from: Point | null | undefined): number | null {
  return from ? distanceMetres(from, { lat: cafe.lat, lng: cafe.lng }) : null;
}

/** Puts a cafe back where it was in the list, e.g. when an unsave is undone. */
export function insertAt(cafes: readonly SavedCafe[], cafe: SavedCafe, index: number): SavedCafe[] {
  if (cafes.some((c) => c.id === cafe.id)) return [...cafes];
  const next = [...cafes];
  next.splice(Math.min(Math.max(index, 0), next.length), 0, cafe);
  return next;
}
