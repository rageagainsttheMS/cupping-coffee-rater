import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { Alert } from "react-native";
import type { MyReview } from "@/features/profile/types";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import CommentStep from "@/app/review/comment";
import RateStep from "@/app/review/rate";
import { ReviewWizardProvider } from "../ReviewWizardProvider";

const REVIEW_ID = "20000000-0000-4000-8000-000000000001";
const mockBack = jest.fn();
const mockEditReview = jest.fn();
let mockPathname = "/review/rate";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn(), back: () => mockBack(), push: jest.fn() },
  usePathname: () => mockPathname,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({ editId: "20000000-0000-4000-8000-000000000001" }),
  useFocusEffect: (callback: () => void) =>
    jest.requireActual("react").useEffect(callback, [callback]),
  Redirect: () => null,
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/referenceData", () => ({
  useReferenceData: () => ({
    data: jest.requireActual("@/lib/referenceDataSnapshot").referenceDataSnapshot,
  }),
}));
jest.mock("../postReview", () => ({
  updateRatings: jest.fn(),
  editReview: (...args: unknown[]) => mockEditReview(...args),
}));

const mockReview: MyReview = {
  review_id: REVIEW_ID,
  cafe_id: "10000000-0000-4000-8000-000000000001",
  cafe_name: "Corner Roast",
  suburb: "Carlton",
  visit_date: "2026-10-18",
  created_at: "2026-10-18T02:00:00Z",
  edited_at: null,
  comment: "Silky, sweet, properly hot.",
  beans: null,
  verified: false,
  drinks: [{ drink_id: 3, name: "Long black", rating: 4, milk: null, price_aud: null }],
  ratings: {},
  tags: [],
  photos: [],
};
jest.mock("@/features/profile/useMyReviews", () => ({
  MY_REVIEWS_KEY: "my-reviews",
  useMyReviews: () => ({ data: [mockReview], isError: false }),
}));

async function renderEdit(children: React.ReactNode) {
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <ReviewWizardProvider>{children}</ReviewWizardProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  mockBack.mockClear();
  mockEditReview.mockReset();
  await AsyncStorage.clear();
});

describe("Editing a review", () => {
  it("starts on the loaded rating, with no way to add a drink", async () => {
    mockPathname = "/review/rate";
    await renderEdit(<RateStep />);
    expect(screen.getByText("How was your long black?")).toBeTruthy();
    expect(screen.getByText("Step 1 of 3")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    expect(screen.queryByText("+ Another drink")).toBeNull();
  });

  it("closes without saving when nothing changed", async () => {
    mockPathname = "/review/comment";
    await renderEdit(<CommentStep />);
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    expect(mockEditReview).not.toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });

  it("saves the new comment and returns to My reviews", async () => {
    mockPathname = "/review/comment";
    mockEditReview.mockResolvedValue({ review_id: REVIEW_ID, before: {}, after: {} });
    await renderEdit(<CommentStep />);
    await fireEvent.changeText(
      screen.getByLabelText("Say a few words"),
      "Weaker than I remembered, sadly.",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await act(async () => {});
    expect(mockEditReview).toHaveBeenCalledTimes(1);
    expect(mockEditReview.mock.calls[0][0].values.comment).toBe("Weaker than I remembered, sadly.");
    expect(mockBack).toHaveBeenCalled();
  });

  it("tells the person when saving fails, and stays on the screen", async () => {
    mockPathname = "/review/comment";
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockEditReview.mockRejectedValue({ code: "XX000", message: "boom" });
    await renderEdit(<CommentStep />);
    await fireEvent.changeText(screen.getByLabelText("Say a few words"), "Changed my mind a lot.");
    await fireEvent.press(screen.getByRole("button", { name: "Save changes" }));
    await act(async () => {});
    expect(alert).toHaveBeenCalledWith("Couldn't save your changes. Try again.");
    expect(mockBack).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("asks before discarding changes", async () => {
    mockPathname = "/review/comment";
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderEdit(<CommentStep />);
    await fireEvent.changeText(screen.getByLabelText("Say a few words"), "Changed my mind a lot.");
    await fireEvent.press(screen.getByLabelText("Close"));
    expect(alert).toHaveBeenCalledWith(
      "Discard your changes?",
      "Your edits to this review won't be saved.",
      expect.any(Array),
    );
    expect(mockBack).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("closes straight away when nothing changed", async () => {
    mockPathname = "/review/comment";
    await renderEdit(<CommentStep />);
    await fireEvent.press(screen.getByLabelText("Close"));
    expect(mockBack).toHaveBeenCalled();
  });
});
