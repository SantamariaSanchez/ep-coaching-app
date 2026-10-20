"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { Mail, Check } from "lucide-react";
import { subscribeToNewsletter } from "@/app/actions/newsletter";
import { safeAction } from "@/lib/safe-action";

// Newsletter (2026-09-10) — jusqu'ici on ne pouvait s'inscrire qu'au moment
// du signup (case à cocher, jamais pré-cochée) ou en laissant son email sur
// un leadmagnet. Un membre qui avait décoché, ou inscrit avant que cette
// case existe, n'avait aucun moyen de s'y ajouter depuis l'appli — d'où
// cette carte. Volontairement à sens unique (pas de bouton "se
// désinscrire" ici : ce lien existe déjà en pied de chaque email Brevo,
// mécanisme standard et déjà conforme, pas besoin de le dupliquer).
export default function NewsletterPreferenceCard({ initialSubscribed }: { initialSubscribed: boolean }) {
  const t = useT();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function subscribe() {
    setError(null);
    startTransition(async () => {
      const result = await safeAction(() => subscribeToNewsletter());
      if (result.error) setError(result.error);
      else setSubscribed(true);
    });
  }

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-3">
        <Mail size={12} />{" "}{t("Newsletter")}
      </p>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-(--ep-strong)">{t("EP Coaching par email")}</p>
          <p className="text-[11px] text-(--ep-ink)/35 mt-0.5 leading-relaxed">
            {t("Conseils entraînement, nutrition, mindset. Désinscription en un clic à tout moment depuis n'importe quel email reçu.")}
          </p>
        </div>
        {subscribed ? (
          <span className="flex items-center gap-1.5 flex-shrink-0 text-[11px] font-bold text-green-400">
            <Check size={13} />{" "}{t("Inscrit")}
          </span>
        ) : (
          <button
            type="button"
            onClick={subscribe}
            disabled={isPending}
            className="flex-shrink-0 text-[11px] font-bold uppercase tracking-wider text-(--ep-accent) border border-(--ep-accent)/40 rounded-lg px-3 py-2 disabled:opacity-50"
          >
            {isPending ? "..." : t("S'inscrire")}
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-(--ep-pink) mt-2">{t(error)}</p>}
    </div>
  );
}
