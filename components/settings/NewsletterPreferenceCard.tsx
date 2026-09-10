"use client";

import { useState, useTransition } from "react";
import { Mail, Check } from "lucide-react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";

// Newsletter (2026-09-10) — jusqu'ici on ne pouvait s'inscrire qu'au moment
// du signup (case à cocher, jamais pré-cochée) ou en laissant son email sur
// un leadmagnet. Un membre qui avait décoché, ou inscrit avant que cette
// case existe, n'avait aucun moyen de s'y ajouter depuis l'appli — d'où
// cette carte. Volontairement à sens unique (pas de bouton "se
// désinscrire" ici : ce lien existe déjà en pied de chaque email Brevo,
// mécanisme standard et déjà conforme, pas besoin de le dupliquer).
export default function NewsletterPreferenceCard({ initialSubscribed }: { initialSubscribed: boolean }) {
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function subscribe() {
    setError(null);
    startTransition(async () => {
      const result = await subscribeToNewsletter();
      if (result.error) setError(result.error);
      else setSubscribed(true);
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
        <Mail size={12} /> Newsletter
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">EP Coaching par email</p>
          <p className="text-[11px] text-[#F5EDED]/35 mt-0.5 leading-relaxed">
            Conseils entraînement, nutrition, mindset. Désinscription en un clic à tout moment
            depuis n&apos;importe quel email reçu.
          </p>
        </div>
        {subscribed ? (
          <span className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-green-400">
            <Check size={13} /> Inscrit
          </span>
        ) : (
          <button
            type="button"
            onClick={subscribe}
            disabled={isPending}
            className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wider text-[#E01E1E] border border-[#E01E1E]/40 rounded-lg px-3 py-2 disabled:opacity-50"
          >
            {isPending ? "..." : "S'inscrire"}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-[#FDC4C4] mt-2">{error}</p>}
    </div>
  );
}
