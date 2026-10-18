import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import * as Network from "expo-network";
import { AppState } from "react-native";
import type { AppStateStatus } from "react-native";

export const queryClient = new QueryClient({
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
