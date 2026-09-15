"use client";

import { useState } from "react";
import { Lightbulb, StickyNote, BookmarkPlus, Clapperboard, Sparkles } from "lucide-react";
import ContentStudio from "@/components/coach/ContentStudio";
import IdeationNotes from "@/components/coach/IdeationNotes";
import IdeationInspirations from "@/components/coach/IdeationInspirations";
import IdeationScripts from "@/components/coach/IdeationScripts";
import SocialGenerator from "@/components/coach/SocialGenerator";
import type { ContentIdea } from "@/lib/content-ideas";
import type { IdeationNote, Inspiration, CoachScript } from "@/lib/coach-ideation";
import type { GuideMagnet } from "@/lib/lead-magnets";
import type { BusinessCanvas } from "@/lib/coach-business-canvas";

type Tab = "idees" | "scripts" | "notes" | "inspirations" | "generateur";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "idees", label: "Idées", icon: Lightbulb },
  { id: "generateur", label: "Générateur", icon: Sparkles },
  { id: "scripts", label: "Scripts", icon: Clapperboard },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "inspirations", label: "Inspirations", icon: BookmarkPlus },
];

// Idéation (ex "Idées & brouillons") — 2026-08-15, demande explicite d'un
// espace "hyper complet" plutôt qu'une seule liste : le pipeline de
// contenu (ContentStudio, déjà en place) reste le cœur, complété par la
// prise de notes libre et un swipe file de références externes.
//
// BUG CORRIGÉ (2026-08-17, signalé en direct : "je peux plus défiler pour
// retrouver les autres sous-onglets") : la barre d'onglets n'avait aucun
// overflow géré, sur mobile les derniers onglets sortaient du cadre sans
// aucun moyen de les atteindre. `overflow-x-auto` + `flex-shrink-0` sur
// chaque bouton (même motif que OutilsView.tsx).
export default function IdeationHub({
  initialIdeas,
  initialNotes,
  initialInspirations,
  initialScripts,
  guides,
  canvas,
}: {
  initialIdeas: ContentIdea[];
  initialNotes: IdeationNote[];
  initialInspirations: Inspiration[];
  initialScripts: CoachScript[];
  guides: GuideMagnet[];
  canvas: BusinessCanvas | null;
}) {
  const [tab, setTab] = useState<Tab>("idees");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections Idéation"
        className="flex gap-1.5 overflow-x-auto mb-5 border-b border-[#890404]/20 pb-0.5"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-[12.5px] font-extrabold whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                border: "none",
                borderBottom: active ? "2px solid #E01E1E" : "2px solid transparent",
                background: active ? "rgba(224,30,30,0.1)" : "transparent",
                color: active ? "#F5EDED" : "rgba(245,237,237,0.4)",
              }}
            >
              <Icon size={13} />
              {label}
              {id === "idees" && initialIdeas.length > 0 && <Count n={initialIdeas.length} active={active} />}
              {id === "scripts" && initialScripts.length > 0 && <Count n={initialScripts.length} active={active} />}
              {id === "notes" && initialNotes.length > 0 && <Count n={initialNotes.length} active={active} />}
              {id === "inspirations" && initialInspirations.length > 0 && <Count n={initialInspirations.length} active={active} />}
            </button>
          );
        })}
      </div>

      {/*
        Repasse 2026-09-15 : même piège que CoachMoiNutritionTabs.tsx
        (MASTERCLASS.md Axe BW) et IdeationScripts.tsx (repasse du même
        jour) — un rendu conditionnel ici démonte ENTIÈREMENT l'onglet
        actif dès qu'on va voir un autre onglet, perdant tout brouillon en
        cours (script/description ouverts en édition dans "Scripts", une
        idée à moitié tapée dans "Idées", une note dans "Notes"...) même si
        rien n'est encore enregistré. Les 5 sous-espaces restent désormais
        montés en permanence, seule la visibilité change.
      */}
      <div hidden={tab !== "idees"}>
        <ContentStudio initialIdeas={initialIdeas} />
      </div>
      <div hidden={tab !== "generateur"}>
        <SocialGenerator guides={guides} />
      </div>
      <div hidden={tab !== "scripts"}>
        <IdeationScripts initialScripts={initialScripts} canvas={canvas} />
      </div>
      <div hidden={tab !== "notes"}>
        <IdeationNotes initialNotes={initialNotes} />
      </div>
      <div hidden={tab !== "inspirations"}>
        <IdeationInspirations initialInspirations={initialInspirations} />
      </div>
    </div>
  );
}

function Count({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
        background: active ? "rgba(224,30,30,0.25)" : "rgba(245,237,237,0.1)",
        color: active ? "#F5EDED" : "rgba(245,237,237,0.4)",
      }}
    >
      {n}
    </span>
  );
}
