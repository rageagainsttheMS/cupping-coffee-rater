import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Metric } from "@/domain/metrics";

/** A request, from the search screen, for the map to move to a cafe and select its card. */
export type FocusRequest = { id: string; lat: number; lng: number };

type MapFiltersValue = {
  /** The metric the pins show. Coffee is the app's core metric, so it is the default. */
  metric: Metric;
  setMetric: (metric: Metric) => void;
  focusRequest: FocusRequest | null;
  requestFocus: (request: FocusRequest) => void;
  clearFocus: () => void;
};

const MapFiltersContext = createContext<MapFiltersValue | null>(null);

/** State shared by the map and the search screen. Lives for as long as the app is signed in. */
export function MapFiltersProvider({ children }: { children: ReactNode }) {
  const [metric, setMetric] = useState<Metric>("coffee");
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const clearFocus = useCallback(() => setFocusRequest(null), []);

  const value = useMemo(
    () => ({ metric, setMetric, focusRequest, requestFocus: setFocusRequest, clearFocus }),
    [metric, focusRequest, clearFocus],
  );
  return <MapFiltersContext.Provider value={value}>{children}</MapFiltersContext.Provider>;
}

export function useMapFilters(): MapFiltersValue {
  const value = useContext(MapFiltersContext);
  if (!value) throw new Error("useMapFilters must be used inside MapFiltersProvider");
  return value;
}
