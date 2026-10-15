"use client";

import { useEffect } from "react";

// Écran gardé allumé pendant la séance (API Wake Lock). Le navigateur relâche
// le verrou dès que l'appli passe en arrière-plan : il est repris au retour
// au premier plan. Sans support (vieux iOS) : rien, la séance reprend de
// toute façon à l'identique (lib/live-session.ts).
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      if (cancelled || sentinel || document.visibilityState !== "visible") return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (cancelled) {
          s.release().catch(() => {});
          return;
        }
        sentinel = s;
        s.addEventListener("release", () => {
          sentinel = null;
        });
      } catch {
        // refusé (économie d'énergie) : on n'insiste pas
      }
    }

    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
}
