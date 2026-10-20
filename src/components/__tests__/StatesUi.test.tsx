import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { onlineManager } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorFallback } from "../ErrorFallback";
import { OfflineBanner } from "../OfflineBanner";
import { copy } from "@/lib/copy/en";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const metrics = {
  frame: { x: 0, y: 0, width: 360, height: 640 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const inTheme = (ui: ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider>{ui}</ThemeProvider>
    </SafeAreaProvider>,
  );

describe("ErrorFallback", () => {
  it("explains the problem and retries", async () => {
    const onRetry = jest.fn();
    await inTheme(<ErrorFallback onRetry={onRetry} />);
    expect(await screen.findByText(copy.errorBoundary.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: copy.errorBoundary.retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("OfflineBanner", () => {
  afterEach(() => onlineManager.setOnline(true));

  it("shows nothing while online", async () => {
    onlineManager.setOnline(true);
    await inTheme(<OfflineBanner />);
    expect(screen.queryByText(copy.offline.banner)).toBeNull();
  });

  it("appears when the phone goes offline and leaves when it is back", async () => {
    onlineManager.setOnline(true);
    await inTheme(<OfflineBanner />);
    await act(async () => onlineManager.setOnline(false));
    expect(await screen.findByText(copy.offline.banner)).toBeTruthy();
    await act(async () => onlineManager.setOnline(true));
    expect(screen.queryByText(copy.offline.banner)).toBeNull();
  });
});
