import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { ActionSheet } from "../ActionSheet";
import { isOverdue, shortAge } from "../moderation";
import { ModerationReviewView } from "../ModerationReviewView";
import { QueueView } from "../QueueView";
import type { BannedUser, ModerationDetail, QueueItem } from "../types";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("@/features/cafe/Photos", () => ({ SignedImage: () => null }));

const wrap = (ui: React.ReactElement) => <ThemeProvider>{ui}</ThemeProvider>;

const NOW = new Date("2026-10-31T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 60 * 60 * 1000).toISOString();

describe("shortAge", () => {
  it("counts hours under two days, then days", () => {
    expect(shortAge(hoursAgo(0.5), NOW)).toBe("now");
    expect(shortAge(hoursAgo(6), NOW)).toBe("6 h");
    expect(shortAge(hoursAgo(26), NOW)).toBe("26 h");
    expect(shortAge(hoursAgo(80), NOW)).toBe("3 d");
  });
});

describe("isOverdue", () => {
  it("is overdue past the 24-hour target", () => {
    expect(isOverdue(hoursAgo(23), NOW)).toBe(false);
    expect(isOverdue(hoursAgo(25), NOW)).toBe(true);
  });
});

const item = (over: Partial<QueueItem> = {}): QueueItem => ({
  review_id: "r1",
  cafe_id: "c1",
  cafe_name: "Corner Roast",
  suburb: "Carlton",
  user_id: "u3",
  author_name: "Sam K.",
  created_at: hoursAgo(48),
  hidden_at: null,
  comment: "BEST COFFEE IN MELBOURNE!!! Use code SAM20.",
  drinks: [{ drink_id: 9, name: "Flat white", rating: 5, milk: null, price_aud: null }],
  ratings: { food: 5, vibe: 5, work: 5 },
  photos: [],
  report_count: 3,
  reasons: ["fake", "spam"],
  oldest_report_at: hoursAgo(26),
  ...over,
});

describe("QueueView", () => {
  async function renderQueue(props: Partial<React.ComponentProps<typeof QueueView>> = {}) {
    const handlers = {
      onChangeTab: jest.fn(),
      onBack: jest.fn(),
      onRetry: jest.fn(),
      onOpenReview: jest.fn(),
      onUnban: jest.fn(),
    };
    await render(
      wrap(
        <QueueView
          tab="open"
          openCount={2}
          items={[
            item(),
            item({
              review_id: "r3",
              cafe_name: "Little Mouse",
              suburb: "Fitzroy",
              author_name: "Priya",
              report_count: 1,
              reasons: ["offensive"],
              oldest_report_at: hoursAgo(6),
            }),
          ]}
          banned={undefined}
          failed={false}
          now={NOW}
          {...handlers}
          {...props}
        />,
      ),
    );
    return handlers;
  }

  it("shows each reported review with its reports, reasons and age", async () => {
    await renderQueue();
    expect(screen.getByText("2 reviews to check · oldest first")).toBeTruthy();
    expect(screen.getByText("Open · 2")).toBeTruthy();
    expect(screen.getByText("Carlton · by Sam K.")).toBeTruthy();
    expect(screen.getByText("3 reports")).toBeTruthy();
    expect(screen.getByText("Fake, Spam")).toBeTruthy();
    expect(screen.getByText("26 h")).toBeTruthy();
    expect(screen.getByText("1 report")).toBeTruthy();
  });

  it("opens a review", async () => {
    const { onOpenReview } = await renderQueue();
    await fireEvent.press(screen.getByLabelText("Sam K.'s review of Corner Roast. Open"));
    expect(onOpenReview).toHaveBeenCalledWith(expect.objectContaining({ review_id: "r1" }));
  });

  it("switches lists", async () => {
    const { onChangeTab } = await renderQueue();
    await fireEvent.press(screen.getByRole("tab", { name: "Banned" }));
    expect(onChangeTab).toHaveBeenCalledWith("banned");
  });

  it("says so when there is nothing to check", async () => {
    await renderQueue({ items: [], openCount: 0 });
    expect(screen.getByText("No open reports")).toBeTruthy();
  });

  it("offers a retry when loading failed", async () => {
    const { onRetry } = await renderQueue({ items: undefined, failed: true });
    await fireEvent.press(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("lists banned people with Unban", async () => {
    const user: BannedUser = {
      user_id: "u3",
      display_name: "Sam K.",
      banned_at: hoursAgo(5),
      note: "Discount-code spam.",
      hidden_count: 6,
    };
    const { onUnban } = await renderQueue({ tab: "banned", items: undefined, banned: [user] });
    expect(screen.getByText("Banned 5 h ago · 6 hidden reviews")).toBeTruthy();
    expect(screen.getByText("“Discount-code spam.”")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Unban Sam K."));
    expect(onUnban).toHaveBeenCalledWith(user);
  });
});

const detail = (over: { hidden?: boolean; banned?: boolean } = {}): ModerationDetail => ({
  review: {
    review_id: "r1",
    cafe_id: "c1",
    cafe_name: "Corner Roast",
    suburb: "Carlton",
    visit_date: "2026-10-29",
    created_at: hoursAgo(48),
    edited_at: null,
    hidden_at: over.hidden ? hoursAgo(1) : null,
    comment: "BEST COFFEE IN MELBOURNE!!! Use code SAM20.",
    beans: null,
    verified: false,
    drinks: [{ drink_id: 9, name: "Flat white", rating: 5, milk: null, price_aud: null }],
    ratings: {},
    tags: [],
    photos: [],
  },
  reports: [
    {
      reason: "spam",
      details: "Advertising a discount code.",
      created_at: hoursAgo(26),
      resolved_at: null,
    },
    { reason: "fake", details: null, created_at: hoursAgo(3), resolved_at: null },
  ],
  author: {
    user_id: "u3",
    display_name: "Sam K.",
    joined_at: hoursAgo(72),
    review_count: 6,
    hidden_count: 1,
    banned: over.banned ?? false,
  },
});

describe("ModerationReviewView", () => {
  async function renderReview(
    props: Partial<React.ComponentProps<typeof ModerationReviewView>> = {},
  ) {
    const handlers = { onBack: jest.fn(), onRetry: jest.fn(), onAction: jest.fn() };
    await render(
      wrap(
        <ModerationReviewView
          detail={detail()}
          failed={false}
          now={NOW}
          {...handlers}
          {...props}
        />,
      ),
    );
    return handlers;
  }

  it("shows the reports without naming who sent them", async () => {
    await renderReview();
    expect(screen.getByText("2 reports")).toBeTruthy();
    expect(screen.getByText("Reporter 1 · Spam")).toBeTruthy();
    expect(screen.getByText("Reporter 2 · Fake")).toBeTruthy();
    expect(screen.getByText("“Advertising a discount code.”")).toBeTruthy();
    expect(screen.getByText(/6 reviews · 1 hidden/)).toBeTruthy();
  });

  it("dismisses, hides or bans", async () => {
    const { onAction } = await renderReview();
    await fireEvent.press(screen.getByText("Dismiss"));
    await fireEvent.press(screen.getByText("Hide review"));
    await fireEvent.press(screen.getByText("Hide and ban Sam K."));
    expect(onAction.mock.calls).toEqual([["dismiss"], ["hide"], ["ban"]]);
  });

  it("offers Restore on a hidden review, and Unban for a banned author", async () => {
    const { onAction } = await renderReview({ detail: detail({ hidden: true, banned: true }) });
    expect(screen.getByText("This review is hidden. Nobody else can see it.")).toBeTruthy();
    expect(screen.queryByText("Hide review")).toBeNull();
    expect(screen.queryByText("Dismiss")).toBeNull();
    await fireEvent.press(screen.getByText("Restore review"));
    await fireEvent.press(screen.getByText("Unban Sam K."));
    expect(onAction.mock.calls).toEqual([["restore"], ["unban"]]);
  });

  it("offers a retry when loading failed", async () => {
    const { onRetry } = await renderReview({ detail: undefined, failed: true });
    await fireEvent.press(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("ActionSheet", () => {
  async function renderSheet(action: React.ComponentProps<typeof ActionSheet>["action"]) {
    const handlers = { onConfirm: jest.fn(), onCancel: jest.fn() };
    await render(
      wrap(
        <ActionSheet
          action={action}
          authorName="Sam K."
          reviewCount={6}
          busy={false}
          {...handlers}
        />,
      ),
    );
    return handlers;
  }

  it("spells out what a ban does and sends the note", async () => {
    const { onConfirm } = await renderSheet("ban");
    expect(screen.getByText("Ban Sam K.?")).toBeTruthy();
    expect(screen.getByText(/All 6 of their reviews are hidden/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Note for the log"), "Spam on four cafes.");
    expect(screen.getByText("19 / 500")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Hide reviews and ban" }));
    expect(onConfirm).toHaveBeenCalledWith("Spam on four cafes.");
  });

  it("confirms without a note", async () => {
    const { onConfirm } = await renderSheet("hide");
    await fireEvent.press(screen.getByRole("button", { name: "Hide review" }));
    expect(onConfirm).toHaveBeenCalledWith("");
  });

  it("cancels", async () => {
    const { onCancel, onConfirm } = await renderSheet("dismiss");
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
