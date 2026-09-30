"use client";

import { useIsIOSApp } from "@/lib/use-native";

// Masque son contenu dans l'appli iOS (achats numériques, règles App Store).
export default function NotInIOSApp({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return useIsIOSApp() ? <>{fallback}</> : <>{children}</>;
}
