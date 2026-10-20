import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { referenceDataSnapshot } from "@/lib/referenceDataSnapshot";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { DRAFT_KEY } from "../draft";
import { ReviewWizardProvider, useWizard } from "../ReviewWizardProvider";
import CommentStep from "@/app/review/comment";
import ExtrasStep from "@/app/review/extras";
import RateStep from "@/app/review/rate";
import { buildReviewInput, toSubmitArgs } from "../submission";
import { blankValues } from "../types";

const mockReplace = jest.fn();
let mockPathname = "/review/rate";

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: unknown[]) => mockReplace(...args),
    back: jest.fn(),
    push: jest.fn(),
  },
  usePathname: () => mockPathname,
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
  useFocusEffect: (callback: () => void) =>
    jest.requireActual("react").useEffect(callback, [callback]),
}));
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("expo-crypto", () => ({ randomUUID: () => "3f0c2b8e-5a6d-4a52-9c54-0d6a8e3a1b11" }));
// Nothing here may reach the network.
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@/lib/referenceData", () => ({
  useReferenceData: () => ({
    data: jest.requireActual("@/lib/referenceDataSnapshot").referenceDataSnapshot,
  }),
}));
jest.mock("@/features/cafe/useCafeDetail", () => ({
  useCafeDetail: () => ({ data: undefined }),
}));
jest.mock("../useWizardData", () => ({
  useUsualDrinks: () => ({ data: {} }),
  useNearbyCafes: () => ({ data: [], isLoading: false }),
}));
jest.mock("../postReview", () => ({ updateRatings: jest.fn() }));

// What the responder system passes with every touch event.
const TOUCH = {
  touchBank: [],
  numberActiveTouches: 0,
  indexOfSingleActiveTouch: -1,
  mostRecentTimeStamp: 0,
};

const CAFE = {
  id: "7d6b1e26-3c2f-4d75-8a3e-9f1c2b7d4e55",
  name: "Corner Roast",
  suburb: "Fitzroy",
  lat: -37.8,
  lng: 144.97,
};
const LONG_BLACK = 3;
const LATTE = 10;

type Wizard = ReturnType<typeof useWizard>;
const probe: { current: Wizard | null } = { current: null };
const wizard = () => probe.current as Wizard;

function Probe() {
  const current = useWizard();
  useEffect(() => {
    probe.current = current;
  });
  return null;
}

async function renderWizard(children: ReactNode) {
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <ThemeProvider>
        <ReviewWizardProvider>
          <Probe />
          {children}
        </ReviewWizardProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

async function startWithDrink() {
  await act(async () => {
    wizard().setCafe(CAFE);
    wizard().patchDrink(0, { drinkId: LONG_BLACK });
  });
}

async function rate(rating: number) {
  const stars = screen.getByLabelText("How was your long black?");
  await fireEvent(stars, "layout", { nativeEvent: { layout: { width: 500, height: 52 } } });
  // A tap on the right half of the star whose whole rating is `rating`.
  await fireEvent(stars, "responderGrant", {
    nativeEvent: { locationX: (rating / 5) * 500 - 10 },
    touchHistory: TOUCH,
  });
}

beforeEach(async () => {
  mockReplace.mockClear();
  mockPathname = "/review/rate";
  await AsyncStorage.clear();
});

describe("Rate step", () => {
  it("won't continue until Coffee is rated", async () => {
    await renderWizard(<RateStep />);
    await startWithDrink();

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await rate(4);
    expect(wizard().activeDrink.rating).toBe(4);
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("shows the Coffee quick tags only once rated", async () => {
    await renderWizard(<RateStep />);
    await startWithDrink();
    expect(screen.queryByText("Smooth")).toBeNull();
    await rate(4);
    expect(screen.getByText("Smooth")).toBeTruthy();
    await fireEvent.press(screen.getByText("Smooth"));
    expect(wizard().values.tagIds).toEqual([2]);
  });

  it('"+ Another drink" puts two drinks in the payload', async () => {
    await renderWizard(<RateStep />);
    await startWithDrink();
    await rate(4.5);

    await fireEvent.press(screen.getByText("+ Another drink"));
    expect(wizard().values.drinks).toHaveLength(2);
    expect(wizard().drinkIndex).toBe(1);
    expect(mockReplace).toHaveBeenLastCalledWith("/review/drink");

    await act(async () => {
      wizard().patchDrink(1, { drinkId: LATTE, rating: 3.5 });
      wizard().setComment("Both good, the latte was a bit hot.");
    });
    const result = buildReviewInput(wizard().values, referenceDataSnapshot.tags);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(toSubmitArgs(result.data).p_drinks.map((d) => d.drink_id)).toEqual([LONG_BLACK, LATTE]);
  });
});

describe("Extras step", () => {
  it('starts on "Didn\'t try" and sends null when it is chosen again', async () => {
    await renderWizard(<ExtrasStep />);
    expect(wizard().values.work).toBeNull();

    // Open Work, rate it, then go back to "Didn't try".
    await fireEvent.press(screen.getByLabelText("Work. Tap to rate"));
    const stars = screen.getByLabelText("Could you work here?");
    await fireEvent(stars, "layout", { nativeEvent: { layout: { width: 500, height: 44 } } });
    await fireEvent(stars, "responderGrant", {
      nativeEvent: { locationX: 470 },
      touchHistory: TOUCH,
    });
    expect(wizard().values.work).toBe(5);

    await fireEvent.press(screen.getByText("Wifi"));
    expect(wizard().values.tagIds).toEqual([16]);

    // The same label is on the collapsed card and the link, so use the link inside the open card.
    await fireEvent.press(screen.getAllByText("Didn't try").at(-1) as never);
    expect(wizard().values.work).toBeNull();
    // Its tags go too, because the server rejects tags for a metric that wasn't rated.
    expect(wizard().values.tagIds).toEqual([]);
  });

  it("skips ahead when nothing is rated", async () => {
    await renderWizard(<ExtrasStep />);
    expect(screen.getByText("Skip")).toBeTruthy();
    await fireEvent.press(screen.getByText("Skip"));
    expect(mockReplace).toHaveBeenLastCalledWith("/review/comment");
  });
});

describe("Comment step", () => {
  const continueButton = () => screen.getByRole("button", { name: "Continue" });

  it("blocks continuing under 10 characters and shows the counter", async () => {
    await renderWizard(<CommentStep />);
    await startWithDrink();

    const input = screen.getByLabelText("Say a few words");
    await fireEvent.changeText(input, "too short");
    expect(screen.getByText("9/280")).toBeTruthy();
    expect(screen.getByText("Write at least 10 characters.")).toBeTruthy();
    expect(continueButton()).toBeDisabled();

    await fireEvent.changeText(input, "just enough");
    expect(screen.getByText("11/280")).toBeTruthy();
    expect(continueButton()).toBeEnabled();
  });

  it("adapts the placeholder to the drink and to whether Work was rated", async () => {
    await renderWizard(<CommentStep />);
    await startWithDrink();
    expect(
      screen.getByPlaceholderText("How was the long black? Strength, milk, temperature…"),
    ).toBeTruthy();

    await act(async () => wizard().setMetricRating("work", 4));
    expect(
      screen.getByPlaceholderText(
        "How was the long black? Strength, milk, temperature… and how was it to work from?",
      ),
    ).toBeTruthy();
  });
});

describe("Draft", () => {
  const draft = (savedAt: number) =>
    JSON.stringify({
      version: 1,
      savedAt,
      step: "comment",
      drinkIndex: 0,
      values: {
        ...blankValues("3f0c2b8e-5a6d-4a52-9c54-0d6a8e3a1b11", CAFE),
        drinks: [{ drinkId: LONG_BLACK, milk: null, rating: 4, priceAud: null }],
        comment: "Half written already",
      },
    });

  it("offers to continue a recent draft and restores it", async () => {
    await AsyncStorage.setItem(DRAFT_KEY, draft(Date.now() - 60_000));
    await renderWizard(<></>);

    expect(await screen.findByText("Continue your review of Corner Roast?")).toBeTruthy();
    await fireEvent.press(screen.getByText("Continue"));

    expect(wizard().values.cafe?.name).toBe("Corner Roast");
    expect(wizard().values.comment).toBe("Half written already");
    expect(wizard().values.drinks[0].rating).toBe(4);
    expect(wizard().resumeStep).toBe("comment");
  });

  it("starts fresh, and forgets the draft, on Start again", async () => {
    await AsyncStorage.setItem(DRAFT_KEY, draft(Date.now() - 60_000));
    await renderWizard(<></>);

    await fireEvent.press(await screen.findByText("Start again"));

    expect(wizard().values.cafe).toBeNull();
    expect(wizard().values.comment).toBe("");
    expect(await AsyncStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("does not offer a draft older than a day", async () => {
    await AsyncStorage.setItem(DRAFT_KEY, draft(Date.now() - 25 * 60 * 60 * 1000));
    await renderWizard(<></>);
    // No prompt: straight into the wizard with a blank form.
    await act(async () => {});
    expect(screen.queryByText(/Continue your review/)).toBeNull();
    expect(wizard().values.cafe).toBeNull();
  });

  it("saves the draft on a step change once a cafe is chosen", async () => {
    mockPathname = "/review/drink";
    await renderWizard(<></>);
    await act(async () => wizard().setCafe(CAFE));
    mockPathname = "/review/rate";
    await act(async () => wizard().patchDrink(0, { drinkId: LONG_BLACK }));
    await act(async () => {});

    const saved = JSON.parse((await AsyncStorage.getItem(DRAFT_KEY)) ?? "null");
    expect(saved?.values.cafe.name).toBe("Corner Roast");
    expect(saved?.version).toBe(1);
  });
});
