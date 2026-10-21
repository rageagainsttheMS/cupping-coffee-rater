import * as Sentry from "@sentry/react-native";
import {
  focusManager,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

/**
 * Sends a failed query or mutation to Sentry. Screens show their own error states, so without this
 * a failing read (a missing database privilege, say) is invisible. Nothing is sent while the phone is
 * offline, because every request fails then and that is not a bug. Only the first part of the key
 * is sent as a tag, never its values, which can hold ids.
 */
export function reportQueryError(
  error: unknown,
  kind: "query" | "mutation",
  key: readonly unknown[] | undefined,
): void {
  if (!onlineManager.isOnline()) return;
  const name = typeof key?.[0] === "string" ? key[0] : "unknown";
  Sentry.captureException(error, { tags: { source: `react-query-${kind}`, key: name } });
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => reportQueryError(error, "query", query.queryKey),
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) =>
      reportQueryError(error, "mutation", mutation.options.mutationKey),
  }),
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
    mutations: { retry: false },
  },
});

/** Wires TanStack Query's focus and online state to React Native. Call once at startup. */
export function subscribeQueryManagers(): () => void {
  const appState = AppState.addEventListener("change", (status: AppStateStatus) => {
    focusManager.setFocused(status === "active");
  });

  const network = Network.addNetworkStateListener((state) => {
    onlineManager.setOnline(state.isConnected !== false);
  });
  Network.getNetworkStateAsync()
    .then((state) => onlineManager.setOnline(state.isConnected !== false))
    .catch(() => {});

  return () => {
    appState.remove();
    network.remove();
  };
}
