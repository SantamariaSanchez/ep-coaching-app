"use client";

import { useEffect } from "react";

// Enregistrement silencieux du service worker dès l'entrée dans l'espace
// membre (au lieu d'attendre la page d'accueil ou les messages) — sans ça,
// le navigateur pouvait traiter certaines pages comme un simple site web
// tant que /sw.js n'avait jamais été enregistré côté client.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
