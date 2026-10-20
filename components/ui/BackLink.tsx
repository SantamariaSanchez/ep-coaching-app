"use client";

import BackButton from "@/components/ui/BackButton";

// Retour (2026-10-08, retour direct : « dans Claude et Notion il n'y a pas de
// bouton retour ») : revient à l'écran précédent, ou à la page de secours si
// la page a été ouverte directement (lien, notification). Même logique que
// BackButton (lib/nav-trail.ts), présentation plus discrète.
export default function BackLink({ fallback, label }: { fallback: string; label?: string }) {
  return (
    <BackButton
      fallbackHref={fallback}
      label={label}
      variant="plain"
      style={{ minHeight: 36, padding: "4px 8px 4px 0", marginBottom: 6 }}
    />
  );
}
