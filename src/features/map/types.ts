/**
 * One cafe in the map view, as returned by the `cafes_in_view` function. `score` and `rating_count`
 * are for the metric that is selected. The generated database types call the nullable fields plain
 * numbers, so the real shape is written out here.
 */
export type MapCafe = {
  id: string;
  google_place_id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
  /** The selected metric's score. Null until it has 3 ratings. */
  score: number | null;
  rating_count: number;
  coffee_score: number | null;
  coffee_count: number;
  food_score: number | null;
  food_count: number;
  vibe_score: number | null;
  vibe_count: number;
  work_score: number | null;
  work_count: number;
  best_drink: string | null;
  best_drink_score: number | null;
  /** True if anyone has rated this cafe on any metric. */
  has_ratings: boolean;
};

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type Point = { lat: number; lng: number };
