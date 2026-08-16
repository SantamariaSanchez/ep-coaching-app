"use client";

import { useState } from "react";
import { Wand2, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
import type { PlanSuggestions } from "@/app/dashboard/coach/clients/[id]/autogenerate/actions";
import type { ExerciseSuggestion } from "@/lib/plan-generator";

const PHASE_LABEL: Record<string, string> = {
  deficit: "Déficit / Sèche",
  maintenance: "Maintenance",
  surplus: "Prise de masse",
};

function ExerciseChip({ ex }: { ex: ExerciseSuggestion }) {
  return (
    <div className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2">
      <p className="text-xs font-bold text-white">{ex.name}</p>
      <p className="text-[10px] text-[#F5EDED]/40 mt-0.5">{ex.reason}</p>
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
    <div className="bg-gradient-to-br from-[#1f0101] to-[#150000] border border-[#E01E1E]/25 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#E01E1E]/15 border border-[#E01E1E]/30 flex items-center justify-center flex-shrink-0">
          <Wand2 size={16} className="text-[#E01E1E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Suggestions à partir de la fiche client</p>
          <p className="text-[11px] text-[#F5EDED]/40 mt-0.5 leading-relaxed">
            Calcule des objectifs nutrition indicatifs et propose plusieurs exercices possibles par groupe
            musculaire (jamais un seul choix imposé). <strong className="text-[#F5EDED]/60">Rien n&apos;est
            enregistré automatiquement.</strong> C&apos;est à toi de reporter ce qui te semble pertinent dans le
            calculateur TDEE ou l&apos;éditeur de programme.
          </p>
          {!hasIntake && (
            <p className="text-[11px] text-amber-400 mt-2">Remplis et enregistre la fiche client d&apos;abord.</p>
          )}
          <button
            onClick={handleRun}
            disabled={running || !hasIntake}
            className="mt-3 flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            {running ? "Calcul…" : "Voir des suggestions"}
          </button>

          {result?.error && <p className="text-[11px] text-red-400 mt-3">⚠ {result.error}</p>}

          {result && !result.error && (
            <div className="mt-4 space-y-4">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-400/80">⚠ {w}</p>
              ))}

              <div className="flex items-start gap-2 bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5">
                <Info size={12} className="text-[#F5EDED]/30 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#F5EDED]/40 leading-relaxed">
                  Sélection basée sur la difficulté déclarée (débutant/intermédiaire d&apos;abord) et la catégorie
                  (composé/isolation) de chaque exercice de ta bibliothèque, filtrée sur le matériel détesté /
                  problématique déclaré. Ce n&apos;est pas une recherche dans la littérature scientifique,
                  vérifie toujours la pertinence pour ce client précis.
                </p>
              </div>

              {result.nutrition && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
                    Nutrition suggérée : {PHASE_LABEL[result.nutrition.phase]}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Kcal", value: result.nutrition.calories },
                      { label: "Prot.", value: `${result.nutrition.proteins}g` },
                      { label: "Gluc.", value: `${result.nutrition.carbs}g` },
                      { label: "Lip.", value: `${result.nutrition.fats}g` },
                    ].map((m) => (
                      <div key={m.label} className="bg-[#150000] border border-[#890404]/20 rounded-lg px-2 py-2 text-center">
                        <p className="text-sm font-black text-white">{m.value}</p>
                        <p className="text-[9px] text-[#F5EDED]/35 uppercase tracking-wider">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.program && result.program.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
                    Pistes d&apos;exercices par jour
                  </p>
                  <div className="space-y-2">
                    {result.program.map((day, i) => (
                      <div key={day.dayLabel} className="border border-[#890404]/15 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedDay(expandedDay === i ? null : i)}
                          aria-expanded={expandedDay === i}
                          className="w-full flex items-center justify-between px-3 py-2 bg-[#150000] text-left"
                        >
                          <span className="text-xs font-bold text-white">{day.dayLabel}</span>
                          {expandedDay === i ? (
                            <ChevronUp size={13} className="text-[#F5EDED]/30" />
                          ) : (
                            <ChevronDown size={13} className="text-[#F5EDED]/30" />
                          )}
                        </button>
                        {expandedDay === i && (
                          <div className="p-3 space-y-3">
                            {day.groups.map((g) => (
                              <div key={g.group}>
                                <p className="text-[10px] font-bold text-[#F5EDED]/50 mb-1.5">{g.group}</p>
                                <div className="grid sm:grid-cols-2 gap-1.5">
                                  {[...g.compound, ...g.isolation].map((ex) => (
                                    <ExerciseChip key={ex.name} ex={ex} />
                                  ))}
                                  {g.compound.length === 0 && g.isolation.length === 0 && (
                                    <p className="text-[10px] text-[#F5EDED]/25 italic">Aucun exercice disponible pour ce groupe.</p>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
                    Road map suggérée
                  </p>
                  <div className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2.5 space-y-1.5">
                    {result.roadmap.phases.map((p) => (
                      <p key={p.label} className="text-xs text-white">
                        <strong>{p.label}</strong> : {p.start_date} → {p.end_date}
                      </p>
                    ))}
                    {result.roadmap.objectives.map((o) => (
                      <p key={o.label} className="text-[11px] text-[#F5EDED]/50">
                        🎯 {o.label} : objectif {o.term === "short" ? "court terme" : "long terme"} pour {o.target_date}
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
