import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { PhotoUploadError } from "../errors";
import { postReview } from "../postReview";
import { blankValues } from "../types";
import { useNearbyCafes, useUsualDrinks } from "../useWizardData";
import { useSubmitReview } from "../useSubmitReview";

const mockReplace = jest.fn();
const mockDiscard = jest.fn();
const mockSetPosted = jest.fn();
const mockWizard = {
  values: blankValues("rid", { id: "c1", name: "Corner Roast", suburb: null, lat: 1, lng: 2 }),
  tags: [],
  discardDraft: mockDiscard,
  setPosted: mockSetPosted,
};
let mockSession: { user: { id: string } } | null = { user: { id: "u1" } };

jest.mock("expo-router", () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock("@/lib/supabase", () => ({ supabase: { rpc: jest.fn(), from: jest.fn() } }));
jest.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => ({ session: mockSession }) }));
jest.mock("../ReviewWizardProvider", () => ({ useWizard: () => mockWizard }));
jest.mock("../postReview", () => ({
  postReview: jest.fn(),
  InvalidReviewError: class InvalidReviewError extends Error {},
}));

const rpc = supabase.rpc as unknown as jest.Mock;
const from = supabase.from as unknown as jest.Mock;
const post = postReview as jest.Mock;

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, wrapper };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSession = { user: { id: "u1" } };
  mockDiscard.mockResolvedValue(undefined);
});

describe("useNearbyCafes", () => {
  it("waits for a position", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useNearbyCafes(null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("asks for the five nearest cafes", async () => {
    rpc.mockResolvedValue({ data: [{ id: "c1" }], error: null });
    const { wrapper } = setup();
    const { result } = await renderHook(() => useNearbyCafes({ lat: -37.8, lng: 144.97 }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.data).toEqual([{ id: "c1" }]));
    expect(rpc).toHaveBeenCalledWith("nearby_cafes", { p_lat: -37.8, p_lng: 144.97, p_limit: 5 });
  });

  it("surfaces a database error", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("down") });
    const { wrapper } = setup();
    const { result } = await renderHook(() => useNearbyCafes({ lat: 1, lng: 2 }), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUsualDrinks", () => {
  const chain = (result: unknown) => {
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(result),
    };
    from.mockReturnValue(query);
    return query;
  };

  it("counts how often each drink was had", async () => {
    chain({ data: [{ drink_id: 1 }, { drink_id: 2 }, { drink_id: 1 }], error: null });
    const { wrapper } = setup();
    const { result } = await renderHook(() => useUsualDrinks(), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ 1: 2, 2: 1 }));
  });

  it("does nothing when signed out", async () => {
    mockSession = null;
    const { wrapper } = setup();
    const { result } = await renderHook(() => useUsualDrinks(), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("useSubmitReview", () => {
  it("posts, drops the draft, refreshes the data and opens the Posted screen", async () => {
    post.mockResolvedValue({ verified: true, before: {}, after: {} });
    const { client, wrapper } = setup();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    const { result } = await renderHook(() => useSubmitReview(), { wrapper });

    await act(async () => result.current.submit());

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/review/posted"));
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
    expect(mockDiscard).toHaveBeenCalled();
    expect(mockSetPosted).toHaveBeenCalledWith(expect.objectContaining({ verified: true }));
    expect(invalidate).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("passes 'skip and post' through", async () => {
    post.mockResolvedValue({ verified: false, before: {}, after: {} });
    const { wrapper } = setup();
    const { result } = await renderHook(() => useSubmitReview(), { wrapper });
    await act(async () => result.current.submit(true));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ withoutDetails: true }));
  });

  it("keeps the draft and says why when posting fails", async () => {
    post.mockRejectedValue(new PhotoUploadError());
    const { wrapper } = setup();
    const { result } = await renderHook(() => useSubmitReview(), { wrapper });
    await act(async () => result.current.submit());
    await waitFor(() => expect(result.current.error).toBe("photo"));
    expect(mockDiscard).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("fails as invalid when there is no signed-in person", async () => {
    mockSession = null;
    const { wrapper } = setup();
    const { result } = await renderHook(() => useSubmitReview(), { wrapper });
    await act(async () => result.current.submit());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(post).not.toHaveBeenCalled();
  });
});
