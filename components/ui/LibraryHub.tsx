"use client";

import { useT } from "@/components/i18n/I18nProvider";
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
  myGymsView,
  myGymCount = 0,
}: {
  initialTab: "exercises" | "gyms" | "mine";
  exerciseCount: number;
  gymCount: number;
  exerciseView: React.ReactNode;
  gymView: React.ReactNode;
  /** « Mes salles » : salles d'entraînement avec matériel et photos (optionnel). */
  myGymsView?: React.ReactNode;
  myGymCount?: number;
}) {
  const t = useT();
  const [tab, setTab] = useState<"exercises" | "gyms" | "mine">(initialTab);

  return (
    <div>
      {/* overflow-x-auto : même pattern que les autres barres d'onglets de
          l'appli (CoachClientNutritionTabs, ClientNutritionView, etc.) —
          sans ça, un onglet peut rester inatteignable sur petit écran. */}
      <div className="flex gap-1 mb-6 border-b border-(--ep-line)/20 overflow-x-auto">
        <button
          onClick={() => setTab("exercises")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
            tab === "exercises" ? "text-(--ep-accent) border-b-2 border-(--ep-accent)" : "text-(--ep-ink)/40 hover:text-(--ep-ink)/70"
          }`}
        >
          <Dumbbell size={13} />{" "}{t("Exercices (")}{exerciseCount})
        </button>
        <button
          onClick={() => setTab("gyms")}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
            tab === "gyms" ? "text-(--ep-accent) border-b-2 border-(--ep-accent)" : "text-(--ep-ink)/40 hover:text-(--ep-ink)/70"
          }`}
        >
          <MapPin size={13} />{" "}{t("Salles (")}{gymCount})
        </button>
        {myGymsView && (
          <button
            onClick={() => setTab("mine")}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === "mine" ? "text-(--ep-accent) border-b-2 border-(--ep-accent)" : "text-(--ep-ink)/40 hover:text-(--ep-ink)/70"
            }`}
          >
            <MapPin size={13} />{" "}{t("Mes salles (")}{myGymCount})
          </button>
        )}
      </div>

      {tab === "exercises" ? exerciseView : tab === "mine" && myGymsView ? myGymsView : gymView}
    </div>
  );
}
