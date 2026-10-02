"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Démarrage d'une séance (POST /api/client/sessions puis ouverture de la
// séance). Écrit à l'origine deux fois dans LogbookClient (jour du
// programme / séance libre) : mis en commun le 2026-10-02 quand la page
// "Mon programme" a reçu son propre bouton "Démarrer", pour qu'un seul
// endroit gère la reprise d'une séance déjà ouverte (faite côté API) et les
// messages d'erreur.

export interface StartSessionInput {
  dayLabel: string;
  programId?: string;
  muscleGroups?: string[];
}

export function useStartSession(sessionBasePath: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(input: StartSessionInput) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/client/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json().catch(() => ({}));
      const sessionId: string | undefined = json.sessionId;
      if (!sessionId) {
        setError(json.error ?? "Impossible de démarrer la séance. Réessaie.");
        setLoading(false);
        return;
      }
      // loading reste à true : la page change, inutile de réactiver le bouton.
      router.push(`${sessionBasePath}/session/${sessionId}`);
    } catch {
      setError("Impossible de démarrer, vérifie ta connexion.");
      setLoading(false);
    }
  }

  return { start, loading, error };
}
