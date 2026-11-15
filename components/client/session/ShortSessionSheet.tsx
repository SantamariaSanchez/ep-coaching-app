"use client";

import { useMemo, useState } from "react";
import { Clock, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { SHORT_SESSION_CHOICES, SHORT_SESSION_TIPS, planShortSession, type ShortSessionExercise, type ShortSessionPlan } from "@/lib/short-session";

// « Peu de temps » (C62) : le pratiquant dit combien de minutes il lui reste,
// l'appli montre exercice par exercice ce qu'elle propose (garder, réduire,
// retirer), et rien ne change tant qu'il n'a pas touché « Appliquer ». Le
// programme n'est jamais modifié : seulement la séance d'aujourd'hui.
export default function ShortSessionSheet({
  exercises,
  onApply,
  onClose,
}: {
  exercises: ShortSessionExercise[];
  onApply: (plan: ShortSessionPlan) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [minutes, setMinutes] = useState<number>(30);
  const plan = useMemo(() => planShortSession(exercises, minutes), [exercises, minutes]);
  const changes = plan.lines.filter((l) => l.action !== "garder").length;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={t("Peu de temps aujourd'hui")}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div className="relative w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-(--ep-s4) border border-(--ep-line)/35 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-(--ep-accent)" />
          <p className="flex-1 text-[15px] font-black text-(--ep-strong)">{t("Il te reste combien de temps ?")}</p>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className="h-9 w-9 flex items-center justify-center rounded-lg text-(--ep-ink)/50">
            <X size={16} />
          </button>
        </div>
        <p className="text-[12px] text-(--ep-ink)/55 leading-relaxed mb-3">
          {t("Ton programme ne change pas : on adapte seulement la séance d'aujourd'hui. Tes séries déjà faites restent.")}
        </p>

        <div className="flex gap-1.5 flex-wrap mb-3" role="radiogroup" aria-label={t("Temps disponible")}>
          {SHORT_SESSION_CHOICES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              onClick={() => setMinutes(m)}
              className="min-h-10 px-3.5 rounded-full text-[13px] font-extrabold border"
              style={{
                borderColor: minutes === m ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.15)",
                background: minutes === m ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent",
                color: minutes === m ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)",
              }}
            >
              {m} {t("min")}
            </button>
          ))}
        </div>

        <p className="text-[12.5px] font-bold text-(--ep-ink) mb-2">
          {plan.fitsAlready
            ? `${t("Bonne nouvelle : ce qui reste tient en")} ${plan.minutesBefore} ${t("min environ, rien à couper.")}`
            : `${t("Ce qui reste")} : ${plan.minutesBefore} ${t("min environ. Proposition")} : ${plan.minutesAfter} ${t("min.")}`}
        </p>
        {plan.tooShort && !plan.fitsAlready && (
          <p className="text-[12px] text-(--ep-warn) mb-2">
            {t("Même réduit au minimum, ça dépasse un peu : fais le premier exercice à fond, c'est déjà une vraie séance.")}
          </p>
        )}

        {!plan.fitsAlready && (
          <ul className="flex flex-col gap-1.5 mb-3">
            {plan.lines.map((l) => (
              <li key={l.key} className="flex items-center gap-2 text-[12.5px]">
                <span className="flex-1 min-w-0 truncate" style={{ color: l.action === "retirer" ? "rgba(var(--ep-ink-rgb),0.4)" : "var(--ep-ink)", textDecoration: l.action === "retirer" ? "line-through" : "none" }}>
                  {l.name}
                </span>
                <span
                  className="shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-full"
                  style={{
                    background: l.action === "garder" ? "rgba(var(--ep-ok-rgb),0.14)" : l.action === "reduire" ? "rgba(var(--ep-accent-rgb),0.14)" : "rgba(var(--ep-ink-rgb),0.08)",
                    color: l.action === "garder" ? "var(--ep-ok)" : l.action === "reduire" ? "var(--ep-accent-hi2)" : "rgba(var(--ep-ink-rgb),0.5)",
                  }}
                >
                  {l.action === "garder"
                    ? `${l.remainingAfter} ${t(l.remainingAfter > 1 ? "séries" : "série")}`
                    : l.action === "reduire"
                      ? `${l.remainingBefore} → ${l.remainingAfter}`
                      : t("retiré")}
                </span>
              </li>
            ))}
          </ul>
        )}

        <ul className="mb-4 flex flex-col gap-1">
          {SHORT_SESSION_TIPS.map((tip) => (
            <li key={tip} className="text-[11.5px] text-(--ep-ink)/50 leading-snug">· {t(tip)}</li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={plan.fitsAlready || changes === 0}
            onClick={() => onApply(plan)}
            className="flex-1 min-h-11 rounded-xl text-[13.5px] font-black text-white disabled:opacity-40"
            style={{ background: "var(--ep-accent)" }}
          >
            {t("Appliquer à la séance d'aujourd'hui")}
          </button>
          <button type="button" onClick={onClose} className="min-h-11 px-4 rounded-xl text-[13px] font-bold border border-(--ep-line)/35 text-(--ep-ink)">
            {t("Annuler")}
          </button>
        </div>
      </div>
    </div>
  );
}
