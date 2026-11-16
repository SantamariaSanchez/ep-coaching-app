"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useState } from "react";
import { Lightbulb, StickyNote, Clapperboard, Sparkles, Send } from "lucide-react";
import WrittenPosts from "@/components/coach/WrittenPosts";
import { isWrittenPlatform } from "@/lib/written-content";
import ContentTargetsCard from "@/components/coach/ContentTargetsCard";
import { CONTENT_TARGET_DEFS, progressByTarget, type ContentTargets, type ProductionTime } from "@/lib/content-targets";
import ContentStudio from "@/components/coach/ContentStudio";
import { Suspense } from "react";
import NotesApp from "@/components/notes/NotesApp";
import type { Note, NoteTag } from "@/lib/notes";
import IdeationScripts from "@/components/coach/IdeationScripts";
import SocialGenerator from "@/components/coach/SocialGenerator";
import type { ContentIdea } from "@/lib/content-ideas";
import type { ScriptStatus } from "@/lib/coach-ideation";
import type { CoachScript } from "@/lib/coach-ideation";
import type { BusinessCanvas } from "@/lib/coach-business-canvas";
import type { LeadTracking, SlugLeadCounts } from "@/lib/content-leads-tracking";

type Tab = "idees" | "scripts" | "posts" | "notes" | "generateur";

// Plateformes écrites : source unique dans lib/written-content.ts.
const WRITTEN = { has: (p: string) => isWrittenPlatform(p) };

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "idees", label: "Idées", icon: Lightbulb },
  { id: "generateur", label: "Générateur", icon: Sparkles },
  { id: "scripts", label: "Scripts", icon: Clapperboard },
  { id: "posts", label: "Posts", icon: Send },
  { id: "notes", label: "Notes", icon: StickyNote },
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
  notes,
  noteTags,
  initialScripts,
  canvas,
  realLeadsByScriptId,
  leadTracking,
  platforms,
  montageProcesses,
  initialTab,
  focusScriptId,
  focusIdeaId,
  publishedToday,
  contentTargets = {},
  productionTime = null,
}: {
  initialIdeas: ContentIdea[];
  /** Le bloc-notes unique de l'appli (table notes), affiché aussi ici. */
  notes: Note[];
  noteTags: NoteTag[];
  initialScripts: CoachScript[];
  canvas: BusinessCanvas | null;
  realLeadsByScriptId: Record<string, SlugLeadCounts>;
  leadTracking?: LeadTracking;
  platforms?: string[];
  montageProcesses?: Record<string, string>;
  /** Onglet ouvert à l'arrivée (?onglet=, lien depuis la recherche globale). */
  initialTab?: string;
  focusScriptId?: string;
  focusIdeaId?: string;
  /** Contenus publiés aujourd'hui, par plateforme (objectifs du jour). */
  publishedToday?: Record<string, number>;
  /** Objectifs du jour fixés par le coach. */
  contentTargets?: ContentTargets;
  productionTime?: ProductionTime | null;
}) {
  const tr = useT();
  // Posts écrits (stories et posts Insta, LinkedIn, Threads) à part : ils se copient et se postent,
  // ils ne se tournent pas.
  const writtenPosts = useMemo(() => initialScripts.filter((s) => WRITTEN.has(s.platform)), [initialScripts]);
  const videoScripts = useMemo(() => initialScripts.filter((s) => !WRITTEN.has(s.platform)), [initialScripts]);
  const tabFromLink = (): Tab =>
    initialTab === "inspirations" ? "notes" : TABS.some((t) => t.id === initialTab) ? (initialTab as Tab) : focusScriptId ? "scripts" : "idees";
  const [tab, setTab] = useState<Tab>(tabFromLink);
  // Nouvelle recherche alors qu'on est déjà sur Studio : même page, donc
  // l'état reste ; on suit le nouveau lien (ajustement pendant le rendu).
  const linkKey = `${initialTab ?? ""}|${focusScriptId ?? ""}|${focusIdeaId ?? ""}`;
  const [seenLinkKey, setSeenLinkKey] = useState(linkKey);
  if (linkKey !== seenLinkKey) {
    setSeenLinkKey(linkKey);
    if (initialTab || focusScriptId || focusIdeaId) setTab(tabFromLink());
  }
  // Perf (retour direct 2026-09-18, voir studio/page.tsx et
  // SocialGenerator.tsx) : le texte intégral des guides ne se charge plus
  // qu'à la demande, la première fois que cet onglet est réellement ouvert
  // — jamais au chargement de la page. Reste vrai (`true`, jamais retiré)
  // une fois passé à `true`, pour ne déclencher qu'un seul chargement même
  // si on quitte puis revient sur l'onglet (même doctrine que le montage
  // permanent des 5 sous-espaces ci-dessous : ne jamais perdre un état déjà
  // acquis).
  // Parcours de création : idée → à tourner → tourné → publié. Chaque étape
  // est cliquable et ouvre la bonne liste.
  const [presetStatus, setPresetStatus] = useState<{ value: ScriptStatus | "all"; n: number }>({ value: "all", n: 0 });
  const count = (st: ScriptStatus) => videoScripts.filter((x) => x.status === st).length;
  const steps: { label: string; n: number; go: () => void }[] = [
    { label: "Idées", n: initialIdeas.length, go: () => setTab("idees") },
    { label: "À tourner", n: count("a_tourner"), go: () => { setPresetStatus((p) => ({ value: "a_tourner", n: p.n + 1 })); setTab("scripts"); } },
    { label: "Tourné", n: count("tourne"), go: () => { setPresetStatus((p) => ({ value: "tourne", n: p.n + 1 })); setTab("scripts"); } },
    { label: "Publié", n: count("publie"), go: () => { setPresetStatus((p) => ({ value: "publie", n: p.n + 1 })); setTab("scripts"); } },
  ];
  const [hasOpenedGenerator, setHasOpenedGenerator] = useState(initialTab === "generateur");

  // Objectifs du jour : ce qui est prêt (à tourner, tourné ou à publier)
  // et ce qui est déjà publié, par type d'objectif.
  const doneToday = useMemo(() => progressByTarget(publishedToday ?? {}), [publishedToday]);
  const stock = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of CONTENT_TARGET_DEFS) {
      out[d.key] = initialScripts.filter((s) => d.platforms.includes(s.platform) && s.status !== "publie").length;
    }
    return out;
  }, [initialScripts]);
  // Types proposés : ceux des plateformes du coach (réglage « Mon appli »).
  const targetKeys = useMemo(() => {
    if (!platforms?.length) return CONTENT_TARGET_DEFS.map((d) => d.key);
    const setting: Record<string, string | null> = { reel: null, youtube: "youtube", story_insta: "instagram", post_insta: "instagram", linkedin: "linkedin", threads: "threads" };
    return CONTENT_TARGET_DEFS.map((d) => d.key).filter((k) => !setting[k] || platforms.includes(setting[k]!));
  }, [platforms]);

  return (
    <div>
      {/* Parcours de création sur une seule ligne (2026-11-15, « trop de
          scroll ») : idées → à tourner → tourné → publié. */}
      <div className="flex gap-1.5 overflow-x-auto mb-3" aria-label={tr("Parcours de création")}>
        {steps.map((st) => (
          <button
            key={st.label}
            type="button"
            onClick={st.go}
            className="flex-shrink-0 inline-flex items-baseline gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-bold"
            style={{ border: "1px solid rgba(var(--ep-ink-rgb),0.12)", cursor: "pointer", color: "rgba(var(--ep-ink-rgb),0.6)" }}
          >
            {tr(st.label)} <b className="text-[13px] font-black text-(--ep-ink)">{st.n}</b>
          </button>
        ))}
      </div>
      <div
        role="tablist"
        aria-label={tr("Sections Idéation")}
        className="flex gap-1.5 overflow-x-auto mb-3 border-b border-(--ep-line)/20 pb-0.5"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setTab(id);
                if (id === "generateur") setHasOpenedGenerator(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-[12.5px] font-extrabold whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                border: "none",
                borderBottom: active ? "2px solid var(--ep-accent)" : "2px solid transparent",
                background: active ? "rgba(var(--ep-accent-rgb),0.1)" : "transparent",
                color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.4)",
              }}
            >
              <Icon size={13} />
              {label}
              {id === "idees" && initialIdeas.length > 0 && <Count n={initialIdeas.length} active={active} />}
              {id === "scripts" && videoScripts.length > 0 && <Count n={videoScripts.length} active={active} />}
              {id === "posts" && writtenPosts.length > 0 && <Count n={writtenPosts.length} active={active} />}
              {id === "notes" && notes.length > 0 && <Count n={notes.length} active={active} />}
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
      {(tab === "scripts" || tab === "posts") && (
        <ContentTargetsCard initialTargets={contentTargets} initialTime={productionTime} doneToday={doneToday} stock={stock} keys={targetKeys} />
      )}
      <div hidden={tab !== "idees"}>
        <ContentStudio initialIdeas={initialIdeas} platforms={platforms} focusIdeaId={focusIdeaId} />
      </div>
      <div hidden={tab !== "generateur"}>
        <SocialGenerator active={hasOpenedGenerator} />
      </div>
      <div hidden={tab !== "scripts"}>
        <IdeationScripts montageProcesses={montageProcesses} presetStatus={presetStatus} initialScripts={videoScripts} focusScriptId={focusScriptId} canvas={canvas} realLeadsByScriptId={realLeadsByScriptId} leadTracking={leadTracking} platforms={platforms} />
      </div>
      <div hidden={tab !== "posts"}>
        <WrittenPosts initialPosts={writtenPosts} publishedToday={publishedToday} targets={contentTargets} platforms={platforms} />
      </div>
      <div hidden={tab !== "notes"}>
        {/* Un seul bloc-notes dans toute l'appli (audit 2026-11-13) : le même
            que la page Notes, avec tags, épingles, tâches, liens et recherche. */}
        <Suspense>
          <NotesApp initialNotes={notes} tags={noteTags} />
        </Suspense>
      </div>
    </div>
  );
}

function Count({ n, active }: { n: number; active: boolean }) {
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
        background: active ? "rgba(var(--ep-accent-rgb),0.25)" : "rgba(var(--ep-ink-rgb),0.1)",
        color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.4)",
      }}
    >
      {n}
    </span>
  );
}
