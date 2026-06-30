"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  THEME_MODE_KEY,
  THEME_ACCENT_KEY,
  DEFAULT_ACCENT,
  applyAccentToRoot,
  type ThemeMode,
} from "@/lib/theme";

interface ThemeContextValue {
  mode: ThemeMode;
  accent: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (hex: string) => void;
  resetAccent: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // L'attribut data-theme / les variables --color-ep-* sont déjà posés par
  // THEME_INIT_SCRIPT avant le premier paint — ces states ne font que se
  // resynchroniser dessus pour piloter l'UI (boutons actifs, etc.).
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<string>(DEFAULT_ACCENT);

  useEffect(() => {
    const storedMode = (localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null) ?? "dark";
    const storedAccent = localStorage.getItem(THEME_ACCENT_KEY) ?? DEFAULT_ACCENT;
    setModeState(storedMode);
    setAccentState(storedAccent);
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    localStorage.setItem(THEME_MODE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function setAccent(hex: string) {
    setAccentState(hex);
    localStorage.setItem(THEME_ACCENT_KEY, hex);
    applyAccentToRoot(hex);
  }

  function resetAccent() {
    setAccentState(DEFAULT_ACCENT);
    localStorage.removeItem(THEME_ACCENT_KEY);
    applyAccentToRoot(DEFAULT_ACCENT);
  }

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, resetAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
