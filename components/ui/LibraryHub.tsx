"use client";

import { useState } from "react";
import { Dumbbell, MapPin } from "lucide-react";

// Exercices et salles étaient deux onglets séparés alors qu'ils se répondent
// directement : le matériel d'une salle détermine quels exercices y sont
// réalisables, et inversement. Un seul espace "Bibliothèque" avec un
// sélecteur, plutôt que deux pages sans lien entre elles.
export default function LibraryHub({
  initialTab,
  exerciseCount,
  gymCount,
  exerciseView,
  gymView,
}: {
  initialTab: "exercises" | "gyms";
  exerciseCount: number;
  gymCount: number;
  exerciseView: React.ReactNode;
  gymView: React.ReactNode;
}) {
  const [tab, setTab] = useState<"exercises" | "gyms">(initialTab);

  return (
    <div>
      {/* overflow-x-auto : même pattern que les autres barres d'onglets de
          l'appli (CoachClientNutritionTabs, ClientNutritionView, etc.) —
          sans ça, un onglet peut rester inatteignable sur petit écran. */}
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        <button
          onClick={() => setTab("exercises")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
            tab === "exercises" ? "text-[#E01E1E] border-b-2 border-[#E01E1E]" : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
          }`}
        >
          <Dumbbell size={13} /> Exercices ({exerciseCount})
        </button>
        <button
          onClick={() => setTab("gyms")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
            tab === "gyms" ? "text-[#E01E1E] border-b-2 border-[#E01E1E]" : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
          }`}
        >
          <MapPin size={13} /> Salles ({gymCount})
        </button>
      </div>

      {tab === "exercises" ? exerciseView : gymView}
    </div>
  );
}
