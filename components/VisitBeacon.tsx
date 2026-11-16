"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { shouldTrack } from "@/lib/visit-tracking";

// Une visite par page publique et par onglet (lib/visit-tracking.ts).
// Aucun cookie : sessionStorage seulement, pour ne pas recompter un rechargement.
export default function VisitBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!path || !shouldTrack(path)) return;
    const key = `ep-visit:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // stockage bloqué : on compte quand même
    }
    const utm = new URLSearchParams(window.location.search).get("utm_source");
    const body = JSON.stringify({ path, ref: document.referrer || null, utm });
    try {
      if (!navigator.sendBeacon?.("/api/public/visit", new Blob([body], { type: "application/json" }))) {
        void fetch("/api/public/visit", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true });
      }
    } catch {
      // jamais bloquant
    }
  }, [path]);
  return null;
}
