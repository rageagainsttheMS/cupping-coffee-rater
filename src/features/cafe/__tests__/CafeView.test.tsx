import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { CafeView } from "../CafeView";
import type { CafeDetail, CafeReview, ReviewsResult } from "../types";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import type { PlaceDetails } from "@/lib/places";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
// Photos and Google details are fetched through Supabase. These tests never need the network.
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
// The icon font is an asset the test renderer can't load.
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("../usePhotos", () => ({
  useSignedPhotoUrl: () => ({ data: undefined, isError: false }),
}));

const detail = (over: Partial<CafeDetail> = {}): CafeDetail => ({
  cafe: {
    id: "c1",
    google_place_id: "g1",
    name: "Corner Roast",
    suburb: "Fitzroy",
    lat: -37.8,
    lng: 144.9,
  },
  scores: {
    coffee: { score: 4.6, count: 18 },
    food: { score: null, count: 1 },
    vibe: { score: 4.2, count: 5 },
    work: { score: 4.8, count: 12 },
  },
  drinks: [
    {
      drink_id: 1,
      name: "Magic",
      score: 4.8,
      rating_count: 14,
      median_price: 5.8,
      price_reports: 9,
    },
    {
      drink_id: 2,
      name: "Cortado",
      score: null,
      rating_count: 2,
      median_price: null,
      price_reports: 0,
    },
  ],
  beans: [{ beans: "Market Lane seasonal", count: 6 }],
  tags: [{ tag_id: 1, metric: "work", label: "Wifi", count: 11 }],
  saved: false,
  ...over,
});

const review = (over: Partial<CafeReview> = {}): CafeReview => ({
  review_id: "r1",
  user_id: "u1",
  author_name: "Sam",
  visit_date: "2026-10-18",
  created_at: "2026-10-18T01:00:00Z",
  comment: "Great flat white and a good table by the window.",
  beans: null,
  verified: true,
  drinks: [{ drink_id: 1, name: "Magic", rating: 4.5, milk: null, price_aud: 5.8 }],
  ratings: { work: 5 },
  tags: [],
  photo_path: null,
  photo_width: null,
  photo_height: null,
  ...over,
});

const result = (over: Partial<ReviewsResult> = {}): ReviewsResult => ({
  reviews: [],
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  ...over,
});

const google = (rating: number | null): PlaceDetails => ({
  open_now: null,
  weekday_descriptions: null,
  rating,
  rating_count: rating === null ? null : 120,
  maps_uri: null,
  attribution: true,
});

async function renderView(
  ui: Partial<Parameters<typeof CafeView>[0]> = {},
): Promise<{ useReviews: jest.Mock }> {
  const useReviews = jest.fn(() => result());
  const element: ReactElement = (
    <ThemeProvider>
      <CafeView
        detail={detail()}
        google={undefined}
        photos={[]}
        distance="350 m"
        initialMetric="coffee"
        useReviews={useReviews}
        onBack={jest.fn()}
        onToggleSave={jest.fn()}
        onDirections={jest.fn()}
        onRate={jest.fn()}
        {...ui}
      />
    </ThemeProvider>
  );
  await render(element);
  return { useReviews: ui.useReviews ? (ui.useReviews as jest.Mock) : useReviews };
}

describe("CafeView score tiles", () => {
  it("shows a score from 3 ratings and New under it", async () => {
    await renderView();
    expect(screen.getByLabelText("Coffee 4.6 from 18 ratings")).toBeTruthy();
    expect(screen.getByLabelText("Food, new")).toBeTruthy();
  });

  it("filters the reviews to a metric when its tile is tapped", async () => {
    const { useReviews } = await renderView();
    expect(useReviews).toHaveBeenLastCalledWith("c1", "coffee", null);

    await fireEvent.press(screen.getByLabelText("Work 4.8 from 12 ratings"));

    expect(useReviews).toHaveBeenLastCalledWith("c1", "work", null);
    expect(screen.getByText("Work · 12 reviews")).toBeTruthy();
    expect(screen.getByText("Reviews · Work")).toBeTruthy();
  });
});

const manyDrinks = (n: number): CafeDetail["drinks"] =>
  Array.from({ length: n }, (_, i) => ({
    drink_id: i + 1,
    name: `Drink ${i + 1}`,
    score: 4.5 - i * 0.1,
    rating_count: 10,
    median_price: 5,
    price_reports: 3,
  }));

describe("What to order", () => {
  it("filters the reviews to a drink, and clears when the drink is tapped again", async () => {
    const { useReviews } = await renderView();
    await fireEvent.press(screen.getByText("Magic"));
    expect(useReviews).toHaveBeenLastCalledWith("c1", "coffee", 1);
    await fireEvent.press(screen.getByText("Magic"));
    expect(useReviews).toHaveBeenLastCalledWith("c1", "coffee", null);
  });

  it("is hidden outside Coffee, and a chosen drink is not applied there", async () => {
    const { useReviews } = await renderView();
    await fireEvent.press(screen.getByText("Magic"));

    await fireEvent.press(screen.getByLabelText("Food, new"));
    expect(useReviews).toHaveBeenLastCalledWith("c1", "food", null);
    expect(screen.queryByText("What to order")).toBeNull();
    expect(screen.queryByText(/^Beans:/)).toBeNull();

    await fireEvent.press(screen.getByLabelText("Coffee 4.6 from 18 ratings"));
    expect(screen.getByText("What to order")).toBeTruthy();
  });

  it("shows the top 3 drinks and reveals the rest with Show all", async () => {
    await renderView({ detail: detail({ drinks: manyDrinks(5) }) });
    expect(screen.getByText("Drink 3")).toBeTruthy();
    expect(screen.queryByText("Drink 4")).toBeNull();

    await fireEvent.press(screen.getByText("Show all"));
    expect(screen.getByText("Drink 5")).toBeTruthy();
    await fireEvent.press(screen.getByText("Show fewer"));
    expect(screen.queryByText("Drink 4")).toBeNull();
  });

  it("is left out when there are no drinks", async () => {
    await renderView({ detail: detail({ drinks: [] }) });
    expect(screen.queryByText("What to order")).toBeNull();
  });
});

describe("Google fallback", () => {
  const unrated = detail({
    scores: {
      coffee: { score: null, count: 0 },
      food: { score: null, count: 0 },
      vibe: { score: null, count: 0 },
      work: { score: null, count: 0 },
    },
  });

  it("shows greyed out with attribution when Coffee has no community score", async () => {
    await renderView({ detail: unrated, google: google(4.3) });
    expect(screen.getByLabelText(/Coffee, no community score yet. Google rating 4.3/)).toBeTruthy();
    expect(screen.getByText("Google")).toBeTruthy();
    // The other tiles stay "New": Google never stands in for them.
    expect(screen.getByLabelText("Work, new")).toBeTruthy();
  });

  it("does not show when Coffee has a community score", async () => {
    await renderView({ google: google(4.3) });
    expect(screen.queryByText("Google")).toBeNull();
    expect(screen.getByLabelText("Coffee 4.6 from 18 ratings")).toBeTruthy();
  });

  it("does not show when Google has no rating", async () => {
    await renderView({ detail: unrated, google: google(null) });
    expect(screen.queryByText("Google")).toBeNull();
    expect(screen.getByLabelText("Coffee, new")).toBeTruthy();
  });
});

describe("CafeView sections and reviews", () => {
  it("lists drinks, with a score only from 3 ratings", async () => {
    await renderView();
    expect(screen.getByText("4.8")).toBeTruthy();
    expect(screen.getByText("14 people · about $5.80")).toBeTruthy();
    expect(screen.getByText("2 people")).toBeTruthy();
  });

  it("shows the top beans on one line", async () => {
    await renderView();
    expect(screen.getByText("Beans: Market Lane seasonal, reported by 6 people")).toBeTruthy();
  });

  it("shows an empty state when the metric has no reviews", async () => {
    await renderView();
    expect(screen.getByText("No Coffee reviews yet")).toBeTruthy();
    expect(screen.getByText("Be the first to rate it.")).toBeTruthy();
  });

  it("renders a review with its rating, verified badge and comment", async () => {
    await renderView({ useReviews: () => result({ reviews: [review()] }) });
    expect(screen.getByText("Great flat white and a good table by the window.")).toBeTruthy();
    expect(screen.getByLabelText("Coffee 4.5")).toBeTruthy();
    expect(screen.getByLabelText("Work 5.0")).toBeTruthy();
    expect(screen.getByText("Verified visit")).toBeTruthy();
  });

  it("offers a retry when reviews fail to load", async () => {
    const refetch = jest.fn();
    await renderView({ useReviews: () => result({ isError: true, refetch }) });
    await fireEvent.press(screen.getByText("Try again"));
    expect(refetch).toHaveBeenCalled();
  });
});

describe("CafeView actions", () => {
  it("rates, gets directions, saves and goes back", async () => {
    const onRate = jest.fn();
    const onDirections = jest.fn();
    const onToggleSave = jest.fn();
    const onBack = jest.fn();
    await renderView({ onRate, onDirections, onToggleSave, onBack });

    await fireEvent.press(screen.getByText("Rate this cafe"));
    await fireEvent.press(screen.getByText("Directions"));
    await fireEvent.press(screen.getByLabelText("Save cafe"));
    await fireEvent.press(screen.getByLabelText("Back"));

    expect(onRate).toHaveBeenCalled();
    expect(onDirections).toHaveBeenCalled();
    expect(onToggleSave).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalled();
  });

  it("shows the saved state on the heart", async () => {
    await renderView({ detail: detail({ saved: true }) });
    expect(screen.getByLabelText("Remove from saved")).toBeTruthy();
  });

  it("shows open status from the live details", async () => {
    await renderView({ google: { ...google(4.3), open_now: false } });
    expect(screen.getByText("Closed")).toBeTruthy();
  });
});
