"use client";

import { useEffect } from "react";

// Ne redemande JAMAIS la permission ici — Notification.requestPermission()
// hors d'un geste utilisateur direct (clic) est bloqué ou silencieusement
// refusé par la plupart des navigateurs récents, et quand elle s'affiche
// quand même, un prompt qui tombe sans contexte au chargement de la page se
// fait presque toujours refuser par réflexe. Sur 13 comptes, 2 seulement ont
// un jour activé le push alors que ce composant tournait sur CHAQUE
// chargement du tableau de bord depuis le début — c'est très probablement
// la cause : la vraie demande (avec un vrai clic, voir AccountActions dans
// Paramètres) ne s'est presque jamais déclenchée. Ce composant se contente
// maintenant de resynchroniser un abonnement déjà accordé (aucun geste
// requis pour ça, c'est un simple resync, pas une nouvelle demande).
export function PushPermission({ userId }: { userId: string }) {
  useEffect(() => {
    async function resyncExisting() {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        Notification.permission !== "granted"
      )
        return;

      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (!existing) return;
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: existing.toJSON() }),
        });
      } catch {
        // SW / push non disponible (ex. Safari iOS < 16.4)
      }
    }

    resyncExisting();
  }, [userId]);

  return null;
}
