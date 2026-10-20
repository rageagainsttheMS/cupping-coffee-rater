import { fireEvent, render, screen } from "@testing-library/react-native";
import { ReviewCard } from "@/features/cafe/ReviewCard";
import type { CafeReview } from "@/features/cafe/types";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { BlockedUsersView } from "../BlockedUsersView";
import { DeleteAccountView } from "../DeleteAccountView";
import { classifyReportError } from "../reports";
import { ReportSheet } from "../ReportSheet";
import type { BlockedUser } from "../useSafety";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("@/lib/supabase", () => ({ supabase: {} }));
jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => () => null);
jest.mock("@/features/cafe/Photos", () => ({ SignedImage: () => null }));

const wrap = (ui: React.ReactElement) => <ThemeProvider>{ui}</ThemeProvider>;

describe("classifyReportError", () => {
  it("reads a second report of the same review as already reported", () => {
    expect(classifyReportError({ code: "23505", message: "duplicate key" })).toBe(
      "already_reported",
    );
  });

  it("reads an error with no database code as a connection problem", () => {
    expect(classifyReportError(new TypeError("Network request failed"))).toBe("network");
  });

  it("treats anything else as generic", () => {
    expect(classifyReportError({ code: "42501", message: "denied" })).toBe("generic");
    expect(classifyReportError("boom")).toBe("generic");
  });
});

describe("ReportSheet", () => {
  async function renderSheet(busy = false) {
    const handlers = { onSubmit: jest.fn(), onCancel: jest.fn() };
    await render(wrap(<ReportSheet visible busy={busy} {...handlers} />));
    return handlers;
  }

  it("offers the four reasons and won't send until one is chosen", async () => {
    await renderSheet();
    for (const label of ["Spam", "Offensive", "Fake", "Other"]) {
      expect(screen.getByRole("radio", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Send report" })).toBeDisabled();
  });

  it("sends the chosen reason and the details", async () => {
    const { onSubmit } = await renderSheet();
    await fireEvent.press(screen.getByRole("radio", { name: "Offensive" }));
    await fireEvent.changeText(screen.getByLabelText("Details (optional)"), "Rude to staff");
    await fireEvent.press(screen.getByRole("button", { name: "Send report" }));
    expect(onSubmit).toHaveBeenCalledWith("offensive", "Rude to staff");
  });

  it("cancels", async () => {
    const { onCancel } = await renderSheet();
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });
});

const review: CafeReview = {
  review_id: "r1",
  user_id: "u2",
  author_name: "Ben",
  visit_date: "2026-10-18",
  created_at: "2026-10-18T02:00:00Z",
  edited_at: null,
  comment: "Great flat white, friendly staff.",
  beans: null,
  verified: false,
  drinks: [{ drink_id: 9, name: "Flat white", rating: 4.5, milk: null, price_aud: null }],
  ratings: {},
  tags: [],
  photo_path: null,
  photo_width: null,
  photo_height: null,
};

describe("ReviewCard menu", () => {
  it("shows the options button for someone else's review", async () => {
    const onMenu = jest.fn();
    await render(
      wrap(
        <ReviewCard
          review={review}
          metric="coffee"
          drinkId={null}
          onOpenPhoto={jest.fn()}
          onMenu={onMenu}
        />,
      ),
    );
    await fireEvent.press(screen.getByLabelText("Options for Ben's review"));
    expect(onMenu).toHaveBeenCalled();
  });

  it("has no options button when no menu is given", async () => {
    await render(
      wrap(<ReviewCard review={review} metric="coffee" drinkId={null} onOpenPhoto={jest.fn()} />),
    );
    expect(screen.queryByLabelText("Options for Ben's review")).toBeNull();
  });
});

describe("BlockedUsersView", () => {
  const users: BlockedUser[] = [
    { id: "u2", name: "Ben", blockedAt: "2026-10-18T00:00:00Z" },
    { id: "u3", name: null, blockedAt: "2026-10-17T00:00:00Z" },
  ];

  async function renderBlocked(props: Partial<React.ComponentProps<typeof BlockedUsersView>> = {}) {
    const handlers = { onBack: jest.fn(), onRetry: jest.fn(), onUnblock: jest.fn() };
    await render(wrap(<BlockedUsersView users={users} failed={false} {...handlers} {...props} />));
    return handlers;
  }

  it("lists blocked people and unblocks one", async () => {
    const { onUnblock } = await renderBlocked();
    expect(screen.getByText("Ben")).toBeTruthy();
    expect(screen.getByText("Someone")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Unblock Ben"));
    expect(onUnblock).toHaveBeenCalledWith(users[0]);
  });

  it("says so when nobody is blocked", async () => {
    await renderBlocked({ users: [] });
    expect(screen.getByText("No blocked users")).toBeTruthy();
  });

  it("offers a retry when loading failed", async () => {
    const { onRetry } = await renderBlocked({ users: undefined, failed: true });
    await fireEvent.press(screen.getByText("Try again"));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("DeleteAccountView", () => {
  async function renderDelete(busy = false) {
    const handlers = { onBack: jest.fn(), onDelete: jest.fn() };
    await render(wrap(<DeleteAccountView busy={busy} {...handlers} />));
    return handlers;
  }

  it("explains what is deleted", async () => {
    await renderDelete();
    expect(screen.getByText("•  All your reviews and their photos")).toBeTruthy();
    expect(
      screen.getByText("Cafe scores update without your reviews. This can't be undone."),
    ).toBeTruthy();
  });

  it("stays disabled until DELETE is typed exactly", async () => {
    const { onDelete } = await renderDelete();
    const button = () => screen.getByRole("button", { name: "Delete my account" });
    expect(button()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "delete me");
    expect(button()).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Type DELETE to confirm"), "DELETE");
    expect(button()).toBeEnabled();
    await fireEvent.press(button());
    expect(onDelete).toHaveBeenCalled();
  });
});
