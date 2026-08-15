"use client";

import { useState } from "react";
import { Lightbulb, StickyNote, BookmarkPlus, Clapperboard } from "lucide-react";
import ContentStudio from "@/components/coach/ContentStudio";
import IdeationNotes from "@/components/coach/IdeationNotes";
import IdeationInspirations from "@/components/coach/IdeationInspirations";
import IdeationScripts from "@/components/coach/IdeationScripts";
import type { ContentIdea } from "@/lib/content-ideas";
import type { IdeationNote, Inspiration, CoachScript } from "@/lib/coach-ideation";

type Tab = "idees" | "scripts" | "notes" | "inspirations";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "idees", label: "Idées", icon: Lightbulb },
  { id: "scripts", label: "Scripts", icon: Clapperboard },
  { id: "notes", label: "Notes", icon: StickyNote },
  { id: "inspirations", label: "Inspirations", icon: BookmarkPlus },
];

// Idéation (ex "Idées & brouillons") — 2026-08-15, demande explicite d'un
// espace "hyper complet" plutôt qu'une seule liste : le pipeline de
// contenu (ContentStudio, déjà en place) reste le cœur, complété par la
// prise de notes libre et un swipe file de références externes.
export default function IdeationHub({
  initialIdeas,
  initialNotes,
  initialInspirations,
  initialScripts,
}: {
  initialIdeas: ContentIdea[];
  initialNotes: IdeationNote[];
  initialInspirations: Inspiration[];
  initialScripts: CoachScript[];
}) {
  const [tab, setTab] = useState<Tab>("idees");

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections Idéation"
        style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid rgba(137,4,4,0.2)", paddingBottom: 2 }}
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
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 16px", borderRadius: "10px 10px 0 0",
                fontSize: 12.5, fontWeight: 800,
                border: "none", borderBottom: active ? "2px solid #E01E1E" : "2px solid transparent",
                background: active ? "rgba(224,30,30,0.1)" : "transparent",
                color: active ? "#F5EDED" : "rgba(245,237,237,0.4)",
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
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

      {tab === "idees" && <ContentStudio initialIdeas={initialIdeas} />}
      {tab === "scripts" && <IdeationScripts initialScripts={initialScripts} />}
      {tab === "notes" && <IdeationNotes initialNotes={initialNotes} />}
      {tab === "inspirations" && <IdeationInspirations initialInspirations={initialInspirations} />}
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
