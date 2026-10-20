/**
 * One row from `my_saved_cafes()`: the cafe, its four scores and the person's latest drink rating
 * there. The generated database types call the nullable fields plain numbers, so the real shape is
 * written out here.
 */
export type SavedCafe = {
  id: string;
  google_place_id: string;
  name: string;
  suburb: string | null;
  lat: number;
  lng: number;
  saved_at: string;
  coffee_score: number | null;
  coffee_count: number;
  food_score: number | null;
  food_count: number;
  vibe_score: number | null;
  vibe_count: number;
  work_score: number | null;
  work_count: number;
  /** The person's own most recent drink rating at this cafe. Null if they haven't reviewed it. */
  last_drink_name: string | null;
  last_rating: number | null;
};
