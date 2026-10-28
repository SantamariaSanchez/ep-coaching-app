"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Compass, Check, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { AdjustmentSuggestion } from "@/lib/coaching-adjustments";
import { applyCalorieAdjustment } from "@/app/dashboard/coach/clients/[id]/nutrition/actions";

const MAX_VISIBLE = 3;

type TabKey = "nutrition" | "programme" | "bilans" | "cycle" | "profil";

// Ajustements suggérés pour la fiche client : une phrase simple, un seul
// bouton, jamais appliqué sans clic. Le niveau de confiance interne des
// règles n'est jamais montré.
export default function CoachAdjustmentsPanel({
  clientId,
  suggestions,
  onOpenTab,
}: {
  clientId: string;
  suggestions: AdjustmentSuggestion[];
  onOpenTab: (tab: TabKey) => void;
}) {
  const t = useT();
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [done, setDone] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const visible = useMemo(
    () => suggestions.filter((s) => s.audience !== "client" && !dismissed.includes(s.id) && !done.includes(s.id)).slice(0, MAX_VISIBLE),
    [suggestions, dismissed, done]
  );
  if (visible.length === 0 && done.length === 0) return null;

  function apply(s: AdjustmentSuggestion) {
    if (s.action?.type !== "adjust_calories") return;
    const delta = s.action.deltaKcal;
    setError(null);
    start(async () => {
      const res = await applyCalorieAdjustment(clientId, delta);
      if (res.error) {
        setError(res.error);
        return;
      }
      setDone((d) => [...d, s.id]);
      router.refresh();
    });
  }

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-4">
      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-(--ep-accent) mb-3">
        <Compass size={11} /> {t("Ajustements suggérés")}
      </p>
      {done.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-(--ep-ink)/60 mb-2">
          <Check size={13} /> {t("Objectifs mis à jour, le client est prévenu.")}
        </p>
      )}
      <div className="space-y-3">
        {visible.map((s) => (
          <div key={s.id} className="flex items-start gap-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-(--ep-ink)/75 leading-relaxed">{t(s.coachText)}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {s.action?.type === "adjust_calories" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => apply(s)}
                    className="px-2.5 py-1 rounded-lg bg-(--ep-accent) text-(--ep-strong) text-[11px] font-bold disabled:opacity-50"
                  >
                    {t(s.action.label)}
                  </button>
                )}
                {s.action?.type === "link" && (
                  <button
                    type="button"
                    onClick={() => onOpenTab(s.action && s.action.type === "link" ? s.action.tab : "profil")}
                    className="px-2.5 py-1 rounded-lg border border-(--ep-line)/40 text-(--ep-ink)/70 text-[11px] font-semibold"
                  >
                    {t(s.action.label)}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label={t("Ignorer")}
              onClick={() => setDismissed((d) => [...d, s.id])}
              className="p-1 text-(--ep-ink)/30 hover:text-(--ep-ink)/60"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-(--ep-ink)/70">{error}</p>}
    </div>
  );
}
