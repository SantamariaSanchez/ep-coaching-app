"use client";

import { useEffect } from "react";
import { rememberUiLocaleAction } from "@/app/actions/user-settings";
import type { Locale } from "@/lib/i18n";

const KEY = "ep-ui-locale-synced";

// Une fois par session et seulement si elle a changé : la langue affichée
// est retenue sur le compte pour que les notifications (push et cloche)
// partent dans cette langue, même envoyées la nuit par un rappel automatique.
export function LocaleSync({ locale }: { locale: Locale }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === locale) return;
      sessionStorage.setItem(KEY, locale);
    } catch {
      // Stockage indisponible (navigation privée) : on enregistre quand même.
    }
    rememberUiLocaleAction(locale).catch(() => {});
  }, [locale]);
  return null;
}
