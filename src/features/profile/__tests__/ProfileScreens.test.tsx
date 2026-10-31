import { fireEvent, render, screen } from "@testing-library/react-native";
import { MyReviewsView } from "../MyReviewsView";
import { ProfileView } from "../ProfileView";
import type { MyReview } from "../types";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("@/features/cafe/Photos", () => ({ SignedImage: () => null }));

const NOW = new Date(2026, 9, 20, 12, 0);

const review = (over: Partial<MyReview> = {}): MyReview => ({
  review_id: "r1",
  cafe_id: "c1",
  cafe_name: "Corner Roast",
  suburb: "Carlton",
  visit_date: "2026-10-18",
  created_at: new Date(2026, 9, 18, 9, 0).toISOString(),
  edited_at: null,
  comment: "Silky, sweet, properly hot.",
  beans: "Single origin Ethiopian",
  verified: false,
  drinks: [{ drink_id: 1, name: "Magic", rating: 4.5, milk: null, price_aud: 5.8 }],
  ratings: { food: 4, vibe: 4.5, work: 5 },
  tags: [],
  photos: [{ path: "u/r1.jpg", thumb_path: null, width: 10, height: 10 }],
  ...over,
});

const reviews = [
  review(),
  review({
    review_id: "r2",
    cafe_id: "c2",
    cafe_name: "Little Mouse",
    suburb: "Fitzroy",
    comment: "Good beans, a bit loud on weekends.",
    beans: null,
    ratings: { vibe: 3.5 },
    photos: [],
    created_at: new Date(2026, 9, 13, 9, 0).toISOString(),
    drinks: [{ drink_id: 2, name: "Flat white", rating: 4, milk: null, price_aud: 5.5 }],
  }),
];

async function renderMyReviews(props: Partial<React.ComponentProps<typeof MyReviewsView>> = {}) {
  const handlers = {
    onBack: jest.fn(),
    onRetry: jest.fn(),
    onOpenCafe: jest.fn(),
    onOpenMenu: jest.fn(),
    onRateCafe: jest.fn(),
  };
  await render(
    <ThemeProvider>
      <MyReviewsView reviews={reviews} failed={false} now={NOW} {...handlers} {...props} />
    </ThemeProvider>,
  );
  return handlers;
}

describe("MyReviewsView", () => {
  it("shows the counts and each review's cafe, age and details", async () => {
    await renderMyReviews();
    expect(screen.getByText("2 reviews across 2 cafes")).toBeTruthy();
    expect(screen.getByText("Carlton · 2 days ago")).toBeTruthy();
    expect(screen.getByText("Fitzroy · last week")).toBeTruthy();
    expect(screen.getByText("$5.80 · Single origin Ethiopian")).toBeTruthy();
  });

  it("marks an edited review", async () => {
    await renderMyReviews({
      reviews: [review({ edited_at: new Date(2026, 9, 19, 9, 0).toISOString() }), reviews[1]],
    });
    expect(screen.getByText("Carlton · 2 days ago · Edited")).toBeTruthy();
    expect(screen.getByText("Fitzroy · last week")).toBeTruthy();
  });

  it("shows a dash for metrics that were not rated", async () => {
    await renderMyReviews();
    expect(screen.getByLabelText("Food, Not rated")).toBeTruthy();
    expect(screen.getByLabelText("Work 5.0")).toBeTruthy();
  });

  it("Has photo keeps only reviews with a photo", async () => {
    await renderMyReviews();
    await fireEvent.press(screen.getByText("Has photo"));
    expect(screen.getByText("Corner Roast")).toBeTruthy();
    expect(screen.queryByText("Little Mouse")).toBeNull();
  });

  it("opens the menu for the pressed review", async () => {
    const { onOpenMenu } = await renderMyReviews();
    await fireEvent.press(screen.getByLabelText("More options for your review of Little Mouse"));
    expect(onOpenMenu).toHaveBeenCalledWith(reviews[1]);
  });

  it("opens the cafe page from a review", async () => {
    const { onOpenCafe } = await renderMyReviews();
    await fireEvent.press(screen.getByLabelText("Corner Roast. Open cafe page"));
    expect(onOpenCafe).toHaveBeenCalledWith(reviews[0]);
  });

  it("invites a first review when there are none", async () => {
    const { onRateCafe } = await renderMyReviews({ reviews: [] });
    await fireEvent.press(screen.getByText("Rate a cafe"));
    expect(onRateCafe).toHaveBeenCalled();
  });

  it("offers a retry when loading failed", async () => {
    const { onRetry } = await renderMyReviews({ reviews: undefined, failed: true });
    await fireEvent.press(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalled();
  });
});

async function renderProfile(props: Partial<React.ComponentProps<typeof ProfileView>> = {}) {
  const handlers = {
    onSaveName: jest.fn().mockResolvedValue(true),
    onOpenMyReviews: jest.fn(),
    onOpenSaved: jest.fn(),
    onOpenLocation: jest.fn(),
    onOpenAppearance: jest.fn(),
    onOpenAccount: jest.fn(),
    onOpenHelp: jest.fn(),
    onSignOut: jest.fn(),
  };
  await render(
    <ThemeProvider>
      <ProfileView
        displayName="William"
        email="william@example.com"
        reviewCount={12}
        cafeCount={9}
        savedCount={5}
        locationStatus="while-using"
        appearance="system"
        {...handlers}
        {...props}
      />
    </ThemeProvider>,
  );
  return handlers;
}

describe("ProfileView", () => {
  it("shows the name, email, initial and the three counts", async () => {
    await renderProfile();
    expect(screen.getByText("William")).toBeTruthy();
    expect(screen.getByText("william@example.com")).toBeTruthy();
    expect(screen.getByText("W", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText("12 Reviews")).toBeTruthy();
    expect(screen.getByLabelText("9 Cafes")).toBeTruthy();
    expect(screen.getByLabelText("5 Saved")).toBeTruthy();
  });

  it("shows the location permission on its row", async () => {
    await renderProfile();
    expect(screen.getByLabelText("Location, While using")).toBeTruthy();
  });

  it("routes each row to its handler", async () => {
    const h = await renderProfile();
    await fireEvent.press(screen.getByLabelText("My reviews, 12"));
    await fireEvent.press(screen.getByLabelText("Saved cafes, 5"));
    await fireEvent.press(screen.getByLabelText("Location, While using"));
    await fireEvent.press(screen.getByLabelText("Appearance, System"));
    await fireEvent.press(screen.getByLabelText("Account and password"));
    await fireEvent.press(screen.getByLabelText("Help and feedback"));
    await fireEvent.press(screen.getByLabelText("Sign out"));
    expect(h.onOpenMyReviews).toHaveBeenCalled();
    expect(h.onOpenSaved).toHaveBeenCalled();
    expect(h.onOpenLocation).toHaveBeenCalled();
    expect(h.onOpenAppearance).toHaveBeenCalled();
    expect(h.onOpenAccount).toHaveBeenCalled();
    expect(h.onOpenHelp).toHaveBeenCalled();
    expect(h.onSignOut).toHaveBeenCalled();
  });

  it("edits the display name", async () => {
    const h = await renderProfile();
    await fireEvent.press(screen.getByLabelText("Edit"));
    await fireEvent.changeText(screen.getByLabelText("Display name"), "  Will  ");
    await fireEvent.press(screen.getByText("Save"));
    expect(h.onSaveName).toHaveBeenCalledWith("Will");
  });

  it("does not save an empty name", async () => {
    const h = await renderProfile();
    await fireEvent.press(screen.getByLabelText("Edit"));
    await fireEvent.changeText(screen.getByLabelText("Display name"), "   ");
    await fireEvent.press(screen.getByText("Save"));
    expect(h.onSaveName).not.toHaveBeenCalled();
  });

  it("has no Moderation group for people who are not moderators", async () => {
    await renderProfile();
    expect(screen.queryByText("Moderation")).toBeNull();
    expect(screen.queryByLabelText(/Report queue/)).toBeNull();
  });

  it("shows moderators the report queue with its open count", async () => {
    const onOpenModeration = jest.fn();
    await renderProfile({ onOpenModeration, moderationOpenCount: 4 });
    expect(screen.getByText("Moderation")).toBeTruthy();
    expect(screen.getByText("4 open")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Report queue, 4 open"));
    expect(onOpenModeration).toHaveBeenCalled();
  });

  it("shows no badge when nothing is open", async () => {
    await renderProfile({ onOpenModeration: jest.fn(), moderationOpenCount: 0 });
    expect(screen.getByLabelText("Report queue")).toBeTruthy();
  });
});
