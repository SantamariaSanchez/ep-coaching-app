"use client";

import { useSyncExternalStore } from "react";

// Plateforme de l'appli native (Capacitor), null dans un navigateur.
// Sert surtout à respecter les règles de l'App Store : dans l'appli iOS,
// aucun achat numérique (abonnement à l'appli, formation) ne passe par
// Stripe, ces achats se font sur le site. Le coaching humain (service de
// personne à personne) garde son paiement habituel.
type NativeWindow = Window & { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };

function read(): string | null {
  if (typeof window === "undefined") return null;
  const c = (window as NativeWindow).Capacitor;
  return c?.isNativePlatform?.() ? c.getPlatform?.() ?? null : null;
}

export function useNativePlatform(): string | null {
  return useSyncExternalStore(() => () => {}, read, () => null);
}

export function useIsIOSApp(): boolean {
  return useNativePlatform() === "ios";
}
