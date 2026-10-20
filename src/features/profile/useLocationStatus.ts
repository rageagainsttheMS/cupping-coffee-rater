import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { locationStatus } from "./locationStatus";
import type { LocationStatus } from "./locationStatus";

/** The location permission, re-read when the screen is shown and when the app returns from Settings. */
export function useLocationStatus(): LocationStatus | null {
  const [status, setStatus] = useState<LocationStatus | null>(null);

  const read = useCallback(() => {
    Location.getForegroundPermissionsAsync()
      .then((permission) => setStatus(locationStatus(permission)))
      .catch(() => {});
  }, []);

  useFocusEffect(read);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") read();
    });
    return () => subscription.remove();
  }, [read]);

  return status;
}
