import type { MapCafe } from "../types";

let next = 0;

/** A cafe in view with sensible defaults: rated 4.0 for the selected metric. */
export function cafe(over: Partial<MapCafe> = {}): MapCafe {
  next += 1;
  return {
    id: `cafe-${next}`,
    google_place_id: `place-${next}`,
    name: `Cafe ${next}`,
    suburb: "Fitzroy",
    lat: -37.8,
    lng: 144.98,
    score: 4.0,
    rating_count: 10,
    coffee_score: 4.0,
    coffee_count: 10,
    food_score: null,
    food_count: 0,
    vibe_score: null,
    vibe_count: 0,
    work_score: null,
    work_count: 0,
    best_drink: null,
    best_drink_score: null,
    has_ratings: true,
    ...over,
  };
}
