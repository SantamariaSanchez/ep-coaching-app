"use client";

import { useEffect } from "react";

// Appli installée (écran d'accueil, Play Store) : on n'affiche jamais la page
// de présentation, mais directement la connexion (ou l'espace si la session
// existe). /launch s'en charge côté serveur. Sert de filet quand l'appli est
// ouverte sur « / » (ancien raccourci, ouverture depuis un lien).
export default function StandaloneRedirect() {
  useEffect(() => {
    try {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
        document.referrer.startsWith("android-app://");
      if (standalone) window.location.replace("/launch");
    } catch {
      /* page de présentation affichée */
    }
  }, []);
  return null;
}
