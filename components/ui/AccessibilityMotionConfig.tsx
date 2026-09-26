"use client";

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { ACCESSIBILITY_CHANGE_EVENT, readAccessibility, type AccessibilitySettings } from "@/lib/accessibility";

// Framer Motion ne lit ni la media query ni l'attribut data-reduce-motion posé
// sur <html> : "user" suit la préférence système, "always" force le mouvement
// réduit quand la personne l'a demandé dans Paramètres > Accessibilité (utile
// pour qui ne sait pas où se trouve le réglage de son téléphone). MotionConfig
// ne rend aucun élément DOM, donc lire localStorage dès l'initialisation ne
// crée pas d'écart d'hydratation.
export default function AccessibilityMotionConfig({ children }: { children: React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(() => readAccessibility().reduceMotion);

  useEffect(() => {
    function onChange(e: Event) {
      const detail = (e as CustomEvent<AccessibilitySettings>).detail;
      setReduceMotion(detail?.reduceMotion === true);
    }
    window.addEventListener(ACCESSIBILITY_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(ACCESSIBILITY_CHANGE_EVENT, onChange);
  }, []);

  return <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>{children}</MotionConfig>;
}
