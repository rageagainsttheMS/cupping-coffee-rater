import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SavedView } from "../SavedView";
import type { SavedCafe } from "../types";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);

const cafe = (over: Partial<SavedCafe> = {}): SavedCafe => ({
  id: "c1",
  google_place_id: "g1",
  name: "Corner Roast",
  suburb: "Carlton",
  lat: -37.8,
  lng: 144.97,
  saved_at: "2026-10-01T00:00:00Z",
  coffee_score: 4.6,
  coffee_count: 10,
  food_score: null,
  food_count: 1,
  vibe_score: 4.0,
  vibe_count: 4,
  work_score: 3.9,
  work_count: 5,
  last_drink_name: "Long black",
  last_rating: 4,
  ...over,
});

const list = [
  cafe(),
  cafe({
    id: "c2",
    name: "Laneway & Co",
    coffee_score: 3.8,
    work_score: 4.7,
    last_drink_name: null,
    last_rating: null,
  }),
];

async function renderView(props: Partial<React.ComponentProps<typeof SavedView>> = {}) {
  const handlers = {
    onRetry: jest.fn(),
    onOpen: jest.fn(),
    onUnsave: jest.fn(),
    onFindCafes: jest.fn(),
  };
  const ui: ReactElement = (
    <ThemeProvider>
      <SavedView cafes={list} failed={false} position={null} {...handlers} {...props} />
    </ThemeProvider>
  );
  await render(ui);
  return handlers;
}

describe("SavedView", () => {
  it("shows both cafes", async () => {
    await renderView();
    expect(screen.getByText("Corner Roast")).toBeTruthy();
    expect(screen.getByText("Laneway & Co")).toBeTruthy();
  });

  it("shows the person's last rating only where they have one", async () => {
    await renderView();
    expect(screen.getAllByText("Your last rating: Long black 4.0")).toHaveLength(1);
  });

  it("reports the unsaved cafe with its place in the full list", async () => {
    const { onUnsave } = await renderView();
    await fireEvent.press(screen.getAllByLabelText("Remove from saved")[1]);
    expect(onUnsave).toHaveBeenCalledWith(list[1], 1);
  });

  it("opens a cafe", async () => {
    const { onOpen } = await renderView();
    await fireEvent.press(screen.getByLabelText("Corner Roast. Open cafe page"));
    expect(onOpen).toHaveBeenCalledWith(list[0]);
  });

  it("points an empty list to the map", async () => {
    const { onFindCafes } = await renderView({ cafes: [] });
    expect(screen.getByText("No saved cafes yet")).toBeTruthy();
    await fireEvent.press(screen.getByText("Find cafes on the map"));
    expect(onFindCafes).toHaveBeenCalled();
  });

  it("offers a retry when loading failed", async () => {
    const { onRetry } = await renderView({ cafes: undefined, failed: true });
    await fireEvent.press(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalled();
  });
});
