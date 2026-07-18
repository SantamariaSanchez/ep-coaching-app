"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import type { AutoGenerateResult } from "@/app/dashboard/coach/clients/[id]/autogenerate/actions";

const DONE_LABELS: Record<keyof AutoGenerateResult["done"], string> = {
  nutrition: "Objectifs nutrition (TDEE réel)",
  dietPlan: "Plan alimentaire flexible",
  program: "Programme d'entraînement",
  roadmap: "Road map",
};

export default function AutoGeneratePlanButton({
  clientId,
  hasIntake,
  autoGenerateClientPlan,
}: {
  clientId: string;
  hasIntake: boolean;
  autoGenerateClientPlan: (clientId: string) => Promise<AutoGenerateResult>;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AutoGenerateResult | null>(null);

  async function handleRun() {
    if (
      !confirm(
        "Ça va générer les objectifs nutrition, un plan alimentaire flexible, un programme d'entraînement complet et une road map à partir de la fiche client. Le programme actif et la road map existante seront remplacés. Continuer ?"
      )
    ) {
      return;
    }
    setRunning(true);
    setResult(null);
    const res = await autoGenerateClientPlan(clientId);
    setRunning(false);
    setResult(res);
    router.refresh();
  }

  return (
    <div className="bg-gradient-to-br from-[#1f0101] to-[#150000] border border-[#E01E1E]/25 rounded-xl p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#E01E1E]/15 border border-[#E01E1E]/30 flex items-center justify-center flex-shrink-0">
          <Wand2 size={16} className="text-[#E01E1E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Générer le plan complet</p>
          <p className="text-[11px] text-[#F5EDED]/40 mt-0.5 leading-relaxed">
            À partir de la fiche client : calcule les objectifs nutrition, crée un plan alimentaire flexible,
            construit un programme d&apos;entraînement complet et une road map. Un point de départ à vérifier
            et ajuster, pas un remplacement de ton travail.
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
            {running ? "Génération…" : "Générer automatiquement"}
          </button>

          {result && (
            <div className="mt-3 space-y-1.5">
              {(Object.keys(DONE_LABELS) as (keyof AutoGenerateResult["done"])[]).map((key) => (
                <div key={key} className="flex items-center gap-1.5 text-[11px]">
                  {result.done[key] ? (
                    <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                  )}
                  <span className={result.done[key] ? "text-[#F5EDED]/60" : "text-[#F5EDED]/35"}>
                    {DONE_LABELS[key]}
                  </span>
                </div>
              ))}
              {result.error && <p className="text-[11px] text-red-400 mt-1">⚠ {result.error}</p>}
              {result.warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-400/80 mt-1">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
