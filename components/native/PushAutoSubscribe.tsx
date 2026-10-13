"use client";

import { useEffect } from "react";

// Notifications sans écran d'autorisation dans l'appli (2026-10-13, retour
// direct : « les autorisations, faut pas les mettre dans l'appli, c'est dans
// les paramètres du téléphone »).
//
// - Autorisation déjà donnée (dans l'appli ou dans Réglages > Applications >
//   EP Coaching > Notifications) : l'abonnement est créé ou resynchronisé en
//   silence, à chaque ouverture. Activer les notifs dans les réglages du
//   téléphone suffit donc, sans rien toucher dans l'appli.
// - Jamais demandée : au tout premier toucher dans l'appli, le téléphone
//   affiche SON dialogue système (une seule fois par appareil). Aucun écran
//   maison avant.
// - Refusée : on ne redemande jamais, la personne réactive dans les réglages.
//
// Dans l'appli native, c'est NativeBridge qui s'en charge (push natif).

const ASKED_KEY = "ep-push-asked-v2";

function vapidKey(): ArrayBuffer | null {
  const b64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!b64) return null;
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = window.atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0))).buffer as ArrayBuffer;
}

async function ensureSubscribed(): Promise<void> {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = vapidKey();
    if (!key) return;
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  }
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
}

export default function PushAutoSubscribe() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
    if (document.documentElement.classList.contains("ep-native")) return;

    if (Notification.permission === "granted") {
      ensureSubscribed().catch(() => {});
      return;
    }
    if (Notification.permission === "denied") return;

    let asked = false;
    try {
      asked = localStorage.getItem(ASKED_KEY) === "1";
    } catch {}
    if (asked) return;

    const onFirstTap = () => {
      window.removeEventListener("pointerup", onFirstTap, true);
      try {
        localStorage.setItem(ASKED_KEY, "1");
      } catch {}
      Notification.requestPermission()
        .then((p) => (p === "granted" ? ensureSubscribed() : undefined))
        .catch(() => {});
    };
    // Laisse d'abord la visite d'accueil se terminer s'il y en a une.
    const arm = () => window.addEventListener("pointerup", onFirstTap, true);
    const t = setTimeout(arm, 4000);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerup", onFirstTap, true);
    };
  }, []);

  return null;
}
