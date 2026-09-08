"use client";

// Carte de format du funnel TOF/MOF/BOF, avec une vraie action dessus.
// Avant : une idée à lire puis à recopier soi-même dans le Studio créatif
// pour pouvoir la travailler. Maintenant : un tap l'ajoute directement,
// prête à devenir un script (retour direct 2026-09-08, "les onglets qui
// pour l'instant sont seulement informatifs... fait un gros travail pour
// créer davantage de valeur").

import { useState, useTransition } from "react";
import { Plus, Check } from "lucide-react";
import { createContentIdeaFromFunnel } from "@/app/dashboard/coach/studio/actions";
import type { FunnelStage } from "@/lib/coach-business";

export default function FunnelIdeaCard({
  stage,
  platform,
  format,
  idea,
}: {
  stage: FunnelStage;
  platform: string;
  format: string;
  idea: string;
}) {
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await createContentIdeaFromFunnel({ stage, platformLabel: platform, format, idea });
      if (result.error) {
        setError(result.error);
        return;
      }
      setAdded(true);
    });
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E]">
          {platform} · {format}
        </p>
        <button
          type="button"
          onClick={add}
          disabled={isPending || added}
          title={added ? "Ajoutée à ton Studio créatif" : "Ajouter à mon Studio créatif"}
          className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full border border-[#890404]/30 text-[#F5EDED]/40 hover:text-[#E01E1E] hover:border-[#E01E1E]/40 disabled:opacity-60 transition-colors"
        >
          {added ? <Check size={10} className="text-[#4ade80]" /> : <Plus size={10} />}
        </button>
      </div>
      <p className="text-[10.5px] text-[#F5EDED]/50 leading-relaxed">{idea}</p>
      {error && <p className="text-[9.5px] text-red-400 mt-1.5">{error}</p>}
    </div>
  );
}
