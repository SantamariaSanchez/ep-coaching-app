"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { Wand2, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { PlanSuggestions } from "@/app/dashboard/coach/clients/[id]/autogenerate/actions";
import type { ExerciseSuggestion } from "@/lib/plan-generator";

const PHASE_LABEL: Record<string, string> = {
  deficit: "Perte de gras (déficit)",
  maintenance: "Maintenance",
  surplus: "Prise de muscle",
};

function ExerciseChip({ ex }: { ex: ExerciseSuggestion }) {
  return (
    <div className="bg-(--ep-s2) border border-(--ep-line)/20 rounded-lg px-3 py-2">
      <p className="text-xs font-bold text-(--ep-strong)">{ex.name}</p>
      <p className="text-[10px] text-(--ep-ink)/40 mt-0.5">{ex.reason}</p>
    </div>
  );
}

export default function AutoGeneratePlanButton({
  clientId,
  hasIntake,
  generatePlanSuggestions,
}: {
  clientId: string;
  hasIntake: boolean;
  generatePlanSuggestions: (clientId: string) => Promise<PlanSuggestions>;
}) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PlanSuggestions | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  async function handleRun() {
    setRunning(true);
    const res = await generatePlanSuggestions(clientId);
    setRunning(false);
    setResult(res);
  }

  return (
    <div className="bg-gradient-to-br from-(--ep-s1) to-(--ep-s2) border border-(--ep-accent)/25 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-(--ep-accent)/15 border border-(--ep-accent)/30 flex items-center justify-center flex-shrink-0">
          <Wand2 size={16} className="text-(--ep-accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-(--ep-strong)">{t("Suggestions à partir de la fiche client")}</p>
          <p className="text-[11px] text-(--ep-ink)/40 mt-0.5 leading-relaxed">
            {t("Calcule des objectifs nutrition indicatifs et propose plusieurs exercices possibles par groupe musculaire (jamais un seul choix imposé).")}{" "}<strong className="text-(--ep-ink)/60">{t("Rien n'est enregistré automatiquement.")}</strong>{" "}{t("C'est à toi de reporter ce qui te semble pertinent dans le calculateur TDEE ou l'éditeur de programme.")}
          </p>
          {!hasIntake && (
            <p className="text-[11px] text-amber-400 mt-2">{t("Remplis et enregistre la fiche client d'abord.")}</p>
          )}
          <button
            onClick={handleRun}
            disabled={running || !hasIntake}
            className="mt-3 flex items-center gap-1.5 bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-40 text-(--ep-strong) text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {running ? t("Calcul…") : t("Voir des suggestions")}
          </button>

          {result?.error && <p className="text-[11px] text-red-400 mt-3">⚠ {result.error}</p>}

          {result && !result.error && (
            <div className="mt-4 space-y-4">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-400/80">⚠ {w}</p>
              ))}

              <div className="flex items-start gap-2 bg-(--ep-s2) border border-(--ep-line)/15 rounded-lg px-3 py-2.5">
                <Info size={12} className="text-(--ep-ink)/30 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-(--ep-ink)/40 leading-relaxed">
                  {t("Sélection basée sur la difficulté déclarée (débutant/intermédiaire d'abord) et la catégorie (composé/isolation) de chaque exercice de ta bibliothèque, filtrée sur le matériel détesté / problématique déclaré. Ce n'est pas une recherche dans la littérature scientifique, vérifie toujours la pertinence pour ce client précis.")}
                </p>
              </div>

              {result.nutrition && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-2">
                    {t("Nutrition suggérée :")}{" "}{PHASE_LABEL[result.nutrition.phase]}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: t("Kcal"), value: result.nutrition.calories },
                      { label: t("Prot."), value: `${result.nutrition.proteins}g` },
                      { label: t("Gluc."), value: `${result.nutrition.carbs}g` },
                      { label: t("Lip."), value: `${result.nutrition.fats}g` },
                    ].map((m) => (
                      <div key={m.label} className="bg-(--ep-s2) border border-(--ep-line)/20 rounded-lg px-2 py-2 text-center">
                        <p className="text-sm font-black text-(--ep-strong)">{m.value}</p>
                        <p className="text-[9px] text-(--ep-ink)/35 uppercase tracking-wider">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.program && result.program.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-2">
                    {t("Pistes d'exercices par jour")}
                  </p>
                  <div className="space-y-2">
                    {result.program.map((day, i) => (
                      <div key={day.dayLabel} className="border border-(--ep-line)/15 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                          aria-expanded={expandedDay === i}
                          className="w-full flex items-center justify-between px-3 py-2 bg-(--ep-s2) text-left"
                        >
                          <span className="text-xs font-bold text-(--ep-strong)">{day.dayLabel}</span>
                          {expandedDay === i ? (
                            <ChevronUp size={13} className="text-(--ep-ink)/30" />
                          ) : (
                            <ChevronDown size={13} className="text-(--ep-ink)/30" />
                          )}
                        </button>
                        {expandedDay === i && (
                          <div className="p-3 space-y-3">
                            {day.groups.map((g) => (
                              <div key={g.group}>
                                <p className="text-[10px] font-bold text-(--ep-ink)/50 mb-1.5">{g.group}</p>
                                <div className="grid sm:grid-cols-2 gap-1.5">
                                  {[...g.compound, ...g.isolation].map((ex) => (
                                    <ExerciseChip key={ex.name} ex={ex} />
                                  ))}
                                  {g.compound.length === 0 && g.isolation.length === 0 && (
                                    <p className="text-[10px] text-(--ep-ink)/25 italic">{t("Aucun exercice disponible pour ce groupe.")}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.roadmap && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-2">
                    {t("Road map suggérée")}
                  </p>
                  <div className="bg-(--ep-s2) border border-(--ep-line)/20 rounded-lg px-3 py-2.5 space-y-1.5">
                    {result.roadmap.phases.map((p) => (
                      <p key={p.label} className="text-xs text-(--ep-strong)">
                        <strong>{p.label}</strong> : {p.start_date} → {p.end_date}
                      </p>
                    ))}
                    {result.roadmap.objectives.map((o) => (
                      <p key={o.label} className="text-[11px] text-(--ep-ink)/50">
                        🎯 {o.label}{" "}{t(": objectif")}{" "}{o.term === "short" ? t("court terme") : t("long terme")}{" "}{t("pour")}{" "}{o.target_date}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
