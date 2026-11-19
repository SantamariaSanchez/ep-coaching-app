"use client";

import { useEffect } from "react";
import { reloadIfStale } from "@/lib/stale-build";

// Filet pour les erreurs « ancienne version » qui n'atteignent pas l'écran
// d'erreur (action serveur lancée d'un bouton, morceau de code chargé à la
// demande) : après une mise à jour pendant que l'appli dormait, on recharge
// une fois, sans afficher d'erreur. Voir lib/stale-build.ts.
export default function StaleBuildGuard() {
  useEffect(() => {
    const onRejection = (e: PromiseRejectionEvent) => { reloadIfStale(e.reason); };
    const onError = (e: ErrorEvent) => { reloadIfStale(e.error ?? e.message); };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);
  return null;
}
