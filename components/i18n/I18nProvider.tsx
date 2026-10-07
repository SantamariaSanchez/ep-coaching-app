"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { makeT, type Locale, type Translator } from "@/lib/i18n";

const I18nContext = createContext<{ locale: Locale; t: Translator }>({ locale: "fr", t: makeT("fr") });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: makeT(locale) }), [locale]);
  // Le layout racine reste statique (pages publiques en français) : la
  // langue réelle de l'espace connecté est posée ici pour les lecteurs
  // d'écran et la correction orthographique du clavier.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Traducteur de l'interface : `const t = useT(); t("Aujourd'hui")`. */
export function useT(): Translator {
  return useContext(I18nContext).t;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}
