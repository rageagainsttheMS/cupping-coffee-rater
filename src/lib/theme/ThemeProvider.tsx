import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useColorScheme } from "react-native";
import { themes } from "./tokens";
import type { Theme } from "./tokens";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "theme-preference";

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (isPreference(stored)) setPreferenceState(stored);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme = preference === "system" ? (systemScheme ?? "light") : preference;
    return { theme: themes[scheme], preference, setPreference };
  }, [preference, systemScheme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

/** For the Profile screen's theme setting (M8). */
export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();
  return { preference, setPreference };
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
