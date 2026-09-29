import { Trophy } from "lucide-react";
import type { PersonalRecord } from "@/utils/sessions";

function fmtDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
    new Date(dateStr + "T12:00:00")
  );
}

// Ne garde que les records qui battent vraiment le meilleur précédent du
// même exercice. personal_records contient des doublons historiques (ex.
// Crunch poulie haute 35 kg enregistré après 37,5 kg le même jour, Tirage
// horizontal marqué deux fois à 60 kg) : ils polluaient le bandeau. Filtre
// d'affichage uniquement, rien n'est modifié en base. Dans une même
// journée, le plus lourd passe en premier : un record plus léger du même
// jour n'en est pas un.
function trueRecords(records: PersonalRecord[]): PersonalRecord[] {
  const chronological = [...records].sort((a, b) => {
    const byDate = a.achieved_at.localeCompare(b.achieved_at);
    return byDate !== 0 ? byDate : b.weight_kg - a.weight_kg;
  });
  const bestByExercise = new Map<string, number>();
  const kept: PersonalRecord[] = [];
  for (const r of chronological) {
    const key = r.exercise_name.toLowerCase();
    const best = bestByExercise.get(key);
    if (best != null && r.weight_kg <= best) continue;
    bestByExercise.set(key, r.weight_kg);
    kept.push(r);
  }
  return kept;
}

// Item 26 : chronologie de progression "highlight" — les records personnels
// méritaient une frise qui se voit d'un coup d'œil, plutôt que d'être
// enterrés dans le graphique par exercice plus bas sur la même page.
// Périmètre de cette passe : records seulement (déjà disponibles dans
// LogbookClient sans nouvelle requête) ; les photos de progression restent
// pour l'instant consultables dans leur propre onglet Photos.
export default function HighlightsStrip({ records }: { records: PersonalRecord[] }) {
  const recent = trueRecords(records)
    .sort((a, b) => b.achieved_at.localeCompare(a.achieved_at))
    .slice(0, 12);

  if (recent.length === 0) return null;

  return (
    <div className="mb-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-2.5 flex items-center gap-1.5">
        <Trophy size={11} className="text-amber-400" /> Records récents
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {recent.map((r) => (
          <div
            key={r.id}
            className="flex-shrink-0 bg-[#1f0101] border border-amber-500/15 rounded-xl px-4 py-3"
            style={{ minWidth: 128 }}
          >
            <p className="text-lg font-black text-white leading-none">
              {r.weight_kg}
              <span className="text-[11px] font-bold text-[#F5EDED]/40 ml-0.5">kg</span>
            </p>
            <p className="text-[10.5px] text-[#F5EDED]/55 font-semibold mt-1.5 leading-tight line-clamp-2">
              {r.exercise_name}
            </p>
            <p className="text-[9px] text-[#F5EDED]/25 mt-1 uppercase tracking-wide">{fmtDate(r.achieved_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
