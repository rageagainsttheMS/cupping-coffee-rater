import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import type { Point } from "./types";

/**
 * The person's location, if they have allowed it. `ready` turns true once we know the answer, so
 * the map can open in the right place. `locate` asks for permission if needed and returns a fresh
 * position, or null when it is not available.
 */
export function useUserLocation() {
  const [ready, setReady] = useState(false);
  const [granted, setGranted] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);

  const read = useCallback(async (): Promise<Point | null> => {
    try {
      const last = await Location.getLastKnownPositionAsync();
      const fix =
        last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const point = { lat: fix.coords.latitude, lng: fix.coords.longitude };
      setPosition(point);
      return point;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { granted: allowed } = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;
        setGranted(allowed);
        if (allowed) await read();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [read]);

  const locate = useCallback(async (): Promise<Point | null> => {
    const current = await Location.getForegroundPermissionsAsync();
    const allowed = current.granted || (await Location.requestForegroundPermissionsAsync()).granted;
    setGranted(allowed);
    if (!allowed) return null;
    try {
      const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { lat: fix.coords.latitude, lng: fix.coords.longitude };
      setPosition(point);
      return point;
    } catch {
      return read();
    }
  }, [read]);

  return { ready, granted, position, locate };
}
