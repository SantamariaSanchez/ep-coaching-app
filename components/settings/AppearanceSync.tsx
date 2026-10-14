"use client";

import { useEffect } from "react";
import { getAppearanceAction, setAppearanceAction } from "@/app/actions/user-settings";
import {
  APPEARANCE_STORAGE_KEY,
  AMBIANCE_STORAGE_KEY,
  applyAppearance,
  currentAppearance,
  parseAppearance,
  serializeAppearance,
} from "@/lib/theme-color";

// L'apparence choisie suit la personne sur tous ses appareils : une fois par
// session, celle du compte s'applique ici si elle diffère. Un ancien choix
// resté seulement sur cet appareil remonte sur le compte.
const SYNCED_KEY = "ep-appearance-synced";

export default function AppearanceSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SYNCED_KEY)) return;
      sessionStorage.setItem(SYNCED_KEY, "1");
    } catch {
      return;
    }
    getAppearanceAction()
      .then((server) => {
        const fromServer = parseAppearance(server);
        const here = serializeAppearance(currentAppearance());
        if (fromServer) {
          if (serializeAppearance(fromServer) !== here) applyAppearance(fromServer);
          return;
        }
        let local: string | null = null;
        try {
          local = localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? localStorage.getItem(AMBIANCE_STORAGE_KEY);
        } catch {}
        if (local && parseAppearance(local)) void setAppearanceAction(here);
      })
      .catch(() => {});
  }, []);
  return null;
}
