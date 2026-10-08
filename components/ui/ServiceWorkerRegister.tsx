"use client";

import { useEffect } from "react";

const RESYNC_KEY = "ep-push-resync-v1";

// Enregistrement silencieux du service worker dès l'entrée dans l'espace
// membre (au lieu d'attendre la page d'accueil ou les messages) — sans ça,
// le navigateur pouvait traiter certaines pages comme un simple site web
// tant que /sw.js n'avait jamais été enregistré côté client.
//
// Réinscription automatique (2026-10-08, retour direct : « mon agenda ne
// m'envoie plus de notif ») : un appareil qui a déjà autorisé les
// notifications renvoie son abonnement au serveur une fois par jour. Un
// abonnement perdu côté serveur (remplacé par un autre appareil avant le
// passage au multi-appareils, ou renouvelé par le navigateur) revient tout
// seul dès que l'appli est ouverte, sans rien faire.
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        if (!("PushManager" in window) || typeof Notification === "undefined" || Notification.permission !== "granted") return;
        try {
          const last = Number(localStorage.getItem(RESYNC_KEY) ?? 0);
          if (Date.now() - last < 20 * 3600 * 1000) return;
        } catch {}
        let sub = await reg.pushManager.getSubscription();
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!sub && key) {
          // Autorisation accordée mais abonnement disparu (navigateur
          // nettoyé) : on le recrée, la personne avait déjà dit oui.
          const pad = "=".repeat((4 - (key.length % 4)) % 4);
          const raw = atob((key + pad).replace(/-/g, "+").replace(/_/g, "/"));
          const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes }).catch(() => null);
        }
        if (!sub) return;
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        }).catch(() => null);
        if (res?.ok) {
          try {
            localStorage.setItem(RESYNC_KEY, String(Date.now()));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
