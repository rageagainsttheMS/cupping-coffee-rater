import * as Sentry from "@sentry/react-native";
import { onlineManager } from "@tanstack/react-query";
import { queryClient, reportQueryError } from "../query";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock("expo-network", () => ({
  addNetworkStateListener: jest.fn(),
  getNetworkStateAsync: jest.fn(),
}));

const capture = Sentry.captureException as jest.Mock;

beforeEach(() => {
  capture.mockClear();
  onlineManager.setOnline(true);
});

describe("reportQueryError", () => {
  it("sends the error with the kind and the first part of the key as tags", () => {
    const error = new Error("permission denied for table profiles");
    reportQueryError(error, "query", ["profile", "user-123"]);
    expect(capture).toHaveBeenCalledWith(error, {
      tags: { source: "react-query-query", key: "profile" },
    });
  });

  it("copes with a missing or non-text key", () => {
    reportQueryError(new Error("x"), "mutation", undefined);
    reportQueryError(new Error("y"), "query", [{ id: 1 }]);
    expect(capture).toHaveBeenNthCalledWith(1, expect.any(Error), {
      tags: { source: "react-query-mutation", key: "unknown" },
    });
    expect(capture).toHaveBeenNthCalledWith(2, expect.any(Error), {
      tags: { source: "react-query-query", key: "unknown" },
    });
  });

  it("stays quiet while the phone is offline", () => {
    onlineManager.setOnline(false);
    reportQueryError(new Error("Network request failed"), "query", ["cafes-in-view"]);
    expect(capture).not.toHaveBeenCalled();
  });
});

describe("queryClient", () => {
  it("reports a query that fails", async () => {
    const error = new Error("boom");
    await queryClient
      .fetchQuery({
        queryKey: ["profile", "u1"],
        queryFn: () => Promise.reject(error),
        retry: false,
      })
      .catch(() => {});
    expect(capture).toHaveBeenCalledWith(error, {
      tags: { source: "react-query-query", key: "profile" },
    });
  });
});
