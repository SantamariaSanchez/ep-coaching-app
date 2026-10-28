"use client";

// Studio YouTube (2026-10-28) : le panneau d'une vidéo longue. Structure et
// audit de rétention, titres notés, description au modèle d'Emmanuel,
// miniatures A/B, chapitres horodatés (plan de production), clips pour les
// reels, checklist de publication et de recyclage. Toute la logique vit dans
// lib/youtube-studio.ts (pure, testée) ; ce composant ne fait qu'afficher et
// enregistrer le plan (coach_scripts.video_plan).

import { useMemo, useState } from "react";
import { Check, ChevronDown, Copy, Film, Loader2, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { safeAction } from "@/lib/safe-action";
import { saveVideoPlan, updateScript } from "@/app/dashboard/coach/studio/actions";
import type { CoachScript } from "@/lib/coach-ideation";
import {
  CHECKLIST_GROUPS, HOOK_TYPES, PUBLISH_CHECKLIST, TITLE_ANGLES, TITLE_MAX_CHARS, YT_STRUCTURES,
  analyzeYoutubeScript, autoChecklist, buildVideoBlueprint, checkDescription, cleanVideoPlan, deriveClips,
  formatChapters, fmtTime, generateTitles, getYtStructure, journalRow, scoreTitle, thumbnailIdeas,
  type TitleInput, type VideoPlan,
} from "@/lib/youtube-studio";

type Tab = "structure" | "titres" | "description" | "miniatures" | "clips" | "publication";

const TABS: { id: Tab; label: string }[] = [
  { id: "structure", label: "Structure" },
  { id: "titres", label: "Titres" },
  { id: "description", label: "Description" },
  { id: "miniatures", label: "Miniatures" },
  { id: "clips", label: "Clips" },
  { id: "publication", label: "Publication" },
];

const ink = (a: number) => `rgba(var(--ep-ink-rgb),${a})`;
const label: React.CSSProperties = { fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: ink(0.4) };
const field: React.CSSProperties = {
  width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: `1px solid ${ink(0.12)}`, borderRadius: 8,
  padding: "8px 10px", fontSize: 12.5, color: "var(--ep-ink)", fontFamily: "inherit",
};

function scoreColor(n: number): string {
  return n >= 75 ? "var(--ep-ok)" : n >= 50 ? "var(--ep-warn)" : "var(--ep-bad)";
}

function CopyMini({ text }: { text: string }) {
  const tr = useT();
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); }).catch(() => undefined);
      }}
      aria-label={tr("Copier")}
      style={{ background: "none", border: "none", cursor: "pointer", color: done ? "var(--ep-ok)" : ink(0.45), padding: 4, display: "inline-flex" }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: ok ? "var(--ep-ok)" : "var(--ep-bad)", fontWeight: 700 }}>
      {ok ? <Check size={12} /> : <X size={12} />}
      {children}
    </span>
  );
}

export default function YoutubeStudio({ script, onPatch }: { script: CoachScript; onPatch: (patch: Partial<CoachScript>) => void }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("structure");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plan = useMemo(() => cleanVideoPlan(script.video_plan), [script.video_plan]);

  async function savePlan(next: VideoPlan) {
    setBusy(true);
    setError(null);
    onPatch({ video_plan: next });
    const res = await safeAction(() => saveVideoPlan(script.id, next));
    setBusy(false);
    if (res.error) {
      setError(res.error);
      onPatch({ video_plan: plan });
    }
  }

  async function applyField(patch: { title?: string; caption?: string }) {
    setBusy(true);
    setError(null);
    const res = await safeAction(() => updateScript(script.id, patch));
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onPatch({ ...(patch.title !== undefined ? { title: patch.title } : {}), ...(patch.caption !== undefined ? { instagram_caption: patch.caption } : {}) });
  }

  const analysis = useMemo(() => (open ? analyzeYoutubeScript({ content: script.content, durationSec: script.duration_seconds }) : null), [open, script.content, script.duration_seconds]);

  return (
    <div style={{ marginTop: 10, border: `1px solid ${ink(0.1)}`, borderRadius: 10, background: "rgba(var(--ep-shade-rgb),0.25)" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "none", border: "none", cursor: "pointer", color: "var(--ep-ink)" }}
      >
        <Film size={14} style={{ color: "var(--ep-accent)" }} />
        <span style={{ fontSize: 12.5, fontWeight: 800, flex: 1, textAlign: "left" }}>{tr("Studio YouTube")}</span>
        {plan.structure && <span style={{ fontSize: 10, fontWeight: 800, color: "var(--ep-accent)" }}>{plan.structure}</span>}
        <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>

      {open && (
        <div style={{ padding: "0 12px 12px" }}>
          <div role="tablist" style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 8 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  flexShrink: 0, padding: "6px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 800, cursor: "pointer",
                  border: `1px solid ${tab === t.id ? "var(--ep-accent)" : ink(0.12)}`,
                  background: tab === t.id ? "rgba(var(--ep-accent-rgb),0.12)" : "transparent",
                  color: tab === t.id ? "var(--ep-accent)" : ink(0.6),
                }}
              >
                {tr(t.label)}
              </button>
            ))}
            {busy && <Loader2 size={14} style={{ alignSelf: "center", color: ink(0.4) }} />}
          </div>
          {error && <p role="alert" style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ep-bad)" }}>{error}</p>}

          {tab === "structure" && analysis && <StructureTab script={script} plan={plan} analysis={analysis} savePlan={savePlan} />}
          {tab === "titres" && <TitlesTab script={script} plan={plan} savePlan={savePlan} applyTitle={(title) => applyField({ title })} />}
          {tab === "description" && <DescriptionTab script={script} applyCaption={(caption) => applyField({ caption })} />}
          {tab === "miniatures" && <ThumbnailsTab script={script} plan={plan} savePlan={savePlan} />}
          {tab === "clips" && <ClipsTab script={script} />}
          {tab === "publication" && <PublicationTab script={script} plan={plan} savePlan={savePlan} />}
        </div>
      )}
    </div>
  );
}

// ── Structure et rétention ───────────────────────────────────────────────

function StructureTab({ script, plan, analysis, savePlan }: { script: CoachScript; plan: VideoPlan; analysis: ReturnType<typeof analyzeYoutubeScript>; savePlan: (p: VideoPlan) => void }) {
  const tr = useT();
  const structure = getYtStructure(plan.structure);
  const blueprint = useMemo(() => buildVideoBlueprint({ durationMin: analysis.minutes || 12, parts: Math.max(3, analysis.chapters.length - 2) }), [analysis]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 900, color: scoreColor(analysis.score) }}>{analysis.score}</span>
        <span style={{ fontSize: 11.5, color: ink(0.55) }}>
          {tr("sur 100 en rétention et structure")} · {analysis.words} {tr("mots")} · {analysis.minutes} min
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {analysis.checks.map((c) => (
          <div key={c.id}>
            <Pill ok={c.ok}>{tr(c.label)}</Pill>
            {!c.ok && c.detail && <p style={{ margin: "2px 0 0 16px", fontSize: 11, color: ink(0.55) }}>{c.detail}</p>}
          </div>
        ))}
      </div>

      <div>
        <span style={label}>{tr("Structure de la vidéo")}</span>
        <select
          value={plan.structure ?? ""}
          onChange={(e) => savePlan({ ...plan, structure: e.target.value || undefined })}
          aria-label={tr("Structure de la vidéo")}
          style={{ ...field, marginTop: 4 }}
        >
          <option value="">{tr("Choisir une structure")}</option>
          {YT_STRUCTURES.map((s) => <option key={s.id} value={s.id}>{s.id} · {s.name}</option>)}
        </select>
        {structure && <p style={{ margin: "6px 0 0", fontSize: 11.5, color: ink(0.6) }}>{structure.steps.join(" → ")}</p>}
      </div>
      <div>
        <span style={label}>{tr("Type de hook")}</span>
        <select
          value={plan.hookType ?? ""}
          onChange={(e) => savePlan({ ...plan, hookType: e.target.value || undefined })}
          aria-label={tr("Type de hook")}
          style={{ ...field, marginTop: 4 }}
        >
          <option value="">{tr("Choisir un type")}</option>
          {HOOK_TYPES.map((h) => <option key={h.id} value={h.id}>{h.id} · {h.label}</option>)}
        </select>
      </div>

      <div>
        <span style={label}>{tr("Chapitres estimés (plan de production)")}</span>
        {analysis.chapters.length ? (
          <div style={{ marginTop: 4, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <pre style={{ margin: 0, flex: 1, fontSize: 12, whiteSpace: "pre-wrap", fontFamily: "inherit", color: ink(0.75) }}>{formatChapters(analysis.chapters)}</pre>
            <CopyMini text={formatChapters(analysis.chapters)} />
          </div>
        ) : (
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: ink(0.55) }}>{tr("Annonce tes parties à l'oral (« premier point », « deuxième point ») pour obtenir les chapitres.")}</p>
        )}
        <p style={{ margin: "4px 0 0", fontSize: 11, color: ink(0.45) }}>{tr("Les chapitres servent au montage. Ils ne sont jamais écrits dans le texte parlé ni dans la description publique.")}</p>
      </div>

      <details>
        <summary style={{ ...label, cursor: "pointer" }}>{tr("Chronologie type")} {fmtTime(blueprint.durationSec)}</summary>
        <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 11.5, color: ink(0.65), display: "flex", flexDirection: "column", gap: 3 }}>
          {blueprint.segments.map((s) => <li key={s.id}>{fmtTime(s.startSec)} · {s.label} (~{s.words} {tr("mots")})</li>)}
        </ul>
      </details>
      <p style={{ margin: 0, fontSize: 11, color: ink(0.45) }}>{script.title}</p>
    </div>
  );
}

// ── Titres ───────────────────────────────────────────────────────────────

function TitlesTab({ script, plan, savePlan, applyTitle }: { script: CoachScript; plan: VideoPlan; savePlan: (p: VideoPlan) => void; applyTitle: (t: string) => void }) {
  const tr = useT();
  const [input, setInput] = useState<TitleInput>({ count: 3 });
  const [custom, setCustom] = useState("");
  const candidates = useMemo(() => generateTitles(input), [input]);
  const current = scoreTitle(script.title);
  const set = (k: keyof TitleInput, v: string) => setInput((p) => ({ ...p, [k]: k === "count" ? Number(v) || undefined : v }));
  const fields: [keyof TitleInput, string, string][] = [
    ["subject", "Sujet", "ton ventre"],
    ["pain", "Douleur (à la 2e personne)", "tu fais des abdos tous les soirs"],
    ["result", "Résultat visé", "perdre ton ventre"],
    ["mistake", "Erreur à arrêter", "faire des abdos pour perdre du ventre"],
    ["myth", "Idée reçue", "manger le soir fait grossir"],
    ["truth", "La vérité", "ton total de la semaine décide"],
    ["count", "Nombre de raisons", "3"],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <span style={label}>{tr("Titre actuel")}</span>
        <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 700 }}>
          {script.title} <span style={{ color: scoreColor(current.score) }}>{current.score}/100</span>
          <span style={{ color: ink(0.45), fontWeight: 600 }}> · {Array.from(script.title).length}/{TITLE_MAX_CHARS}</span>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
          {current.criteria.filter((c) => !c.ok && c.hint).map((c) => <span key={c.id} style={{ fontSize: 11, color: ink(0.55) }}>{c.hint}</span>)}
        </div>
      </div>

      <details>
        <summary style={{ ...label, cursor: "pointer" }}>{tr("Générer des titres par angle")}</summary>
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {fields.map(([k, lab, ph]) => (
            <label key={k} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 11, color: ink(0.55) }}>{tr(lab)}</span>
              <input value={String(input[k] ?? "")} onChange={(e) => set(k, e.target.value)} placeholder={ph} style={field} inputMode={k === "count" ? "numeric" : undefined} />
            </label>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {candidates.length === 0 && <p style={{ margin: 0, fontSize: 11.5, color: ink(0.5) }}>{tr("Remplis au moins un champ pour obtenir des titres.")}</p>}
          {candidates.map((c) => (
            <div key={c.text} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 8, border: `1px solid ${ink(0.08)}` }}>
              <span style={{ fontSize: 12.5, flex: 1 }}>{c.text}</span>
              <span style={{ fontSize: 9, fontWeight: 800, color: ink(0.4), textTransform: "uppercase" }}>{TITLE_ANGLES.find((a) => a.id === c.angle)?.label}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: scoreColor(c.score) }}>{c.score}</span>
              <button type="button" onClick={() => applyTitle(c.text)} style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-accent)", background: "none", border: "none", cursor: "pointer" }}>{tr("Utiliser")}</button>
              <button type="button" onClick={() => savePlan({ ...plan, titles: Array.from(new Set([...(plan.titles ?? []), c.text])).slice(0, 10) })} style={{ fontSize: 11, color: ink(0.5), background: "none", border: "none", cursor: "pointer" }}>{tr("Garder")}</button>
            </div>
          ))}
        </div>
      </details>

      <div>
        <span style={label}>{tr("Tester un titre")}</span>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={tr("Écris un titre")} style={{ ...field, marginTop: 4 }} />
        {custom.trim() && (() => {
          const s = scoreTitle(custom);
          return (
            <div style={{ marginTop: 6 }}>
              <strong style={{ color: scoreColor(s.score) }}>{s.score}/100</strong>
              {s.criteria.filter((c) => !c.ok && c.hint).map((c) => <p key={c.id} style={{ margin: "2px 0 0", fontSize: 11, color: ink(0.55) }}>{c.hint}</p>)}
            </div>
          );
        })()}
      </div>

      {(plan.titles?.length ?? 0) > 0 && (
        <div>
          <span style={label}>{tr("Titres gardés pour le test")}</span>
          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12.5 }}>{plan.titles!.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ── Description ──────────────────────────────────────────────────────────

function DescriptionTab({ script, applyCaption }: { script: CoachScript; applyCaption: (c: string) => void }) {
  const tr = useT();
  const checks = checkDescription(script.instagram_caption);
  const chapters = analyzeYoutubeScript({ content: script.content, durationSec: script.duration_seconds }).chapters;
  const withChapters = chapters.length >= 3 && script.instagram_caption && !/\b\d{2}:\d{2}\b/.test(script.instagram_caption)
    ? script.instagram_caption.replace(/\n\n(Mon application, avec essai gratuit)/, `\n\n${formatChapters(chapters)}\n\n$1`)
    : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <span style={label}>{tr("Contrôle contre le modèle d'Emmanuel")}</span>
      {checks.map((c) => <Pill key={c.id} ok={c.ok}>{tr(c.text)}</Pill>)}
      <p style={{ margin: 0, fontSize: 11, color: ink(0.5) }}>
        {tr("Modèle : lien du guide en première ligne, faux problème et vrai problème, phrase règle, question en commentaire, abonnement, liens, qui je suis, hashtags. Les titres alternatifs et l'idée de miniature ne vont jamais dans la description.")}
      </p>
      {withChapters && (
        <button type="button" onClick={() => applyCaption(withChapters)} style={{ alignSelf: "flex-start", fontSize: 11.5, fontWeight: 800, color: "var(--ep-accent)", background: "none", border: `1px dashed ${ink(0.2)}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>
          {tr("Ajouter les chapitres estimés dans la description (optionnel)")}
        </button>
      )}
    </div>
  );
}

// ── Miniatures ───────────────────────────────────────────────────────────

function ThumbnailsTab({ script, plan, savePlan }: { script: CoachScript; plan: VideoPlan; savePlan: (p: VideoPlan) => void }) {
  const tr = useT();
  const ideas = useMemo(() => thumbnailIdeas({ title: script.title }), [script.title]);
  const describe = (c: (typeof ideas.concepts)[number]) => `${c.label} : ${c.composition} Émotion : ${c.emotion}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {ideas.concepts.map((c) => (
        <div key={c.id} style={{ border: `1px solid ${ink(0.1)}`, borderRadius: 8, padding: 10 }}>
          <strong style={{ fontSize: 12.5 }}>{tr(c.label)}</strong>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: ink(0.7) }}>{c.composition}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11.5, color: ink(0.55) }}>{tr("Émotion")} : {c.emotion}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, color: ink(0.55) }}>{tr("Contraste")} : {c.contrast}</p>
          {c.textOptions.length > 0 && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: ink(0.55) }}>{tr("Texte possible (2 à 4 mots)")} : {c.textOptions.join(" · ")}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" onClick={() => savePlan({ ...plan, thumbA: describe(c) })} style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-accent)", background: "none", border: "none", cursor: "pointer" }}>{tr("Choisir comme A")}</button>
            <button type="button" onClick={() => savePlan({ ...plan, thumbB: describe(c) })} style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-info)", background: "none", border: "none", cursor: "pointer" }}>{tr("Choisir comme B")}</button>
          </div>
        </div>
      ))}
      {(plan.thumbA || plan.thumbB) && (
        <div style={{ fontSize: 12 }}>
          {plan.thumbA && <p style={{ margin: 0 }}><strong>A</strong> · {plan.thumbA}</p>}
          {plan.thumbB && <p style={{ margin: "4px 0 0" }}><strong>B</strong> · {plan.thumbB}</p>}
        </div>
      )}
      <span style={label}>{tr("Test A/B")}</span>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: ink(0.65), display: "flex", flexDirection: "column", gap: 3 }}>{ideas.abTest.map((t) => <li key={t}>{t}</li>)}</ul>
      <span style={label}>{tr("Règles")}</span>
      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: ink(0.65), display: "flex", flexDirection: "column", gap: 3 }}>{ideas.rules.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}

// ── Clips ────────────────────────────────────────────────────────────────

function ClipsTab({ script }: { script: CoachScript }) {
  const tr = useT();
  const clips = useMemo(() => deriveClips(script.content, script.duration_seconds), [script.content, script.duration_seconds]);
  if (!clips.length) return <p style={{ margin: 0, fontSize: 12, color: ink(0.55) }}>{tr("Le script est trop court pour en tirer des clips.")}</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 11.5, color: ink(0.55) }}>{tr("Passages de 30 à 60 secondes à tourner en reels. Les titres hook ne reprennent que des mots du passage : relis-les avant de choisir. Appel à l'action fixe : Commente « VIDEO » pour recevoir la vidéo complète.")}</p>
      {clips.map((c) => (
        <div key={c.n} style={{ border: `1px solid ${ink(0.1)}`, borderRadius: 8, padding: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong style={{ fontSize: 12.5, flex: 1 }}>{tr("Clip")} {c.n} · {fmtTime(c.atSec)} · ~{c.seconds} s</strong>
            <CopyMini text={c.text} />
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: ink(0.7), whiteSpace: "pre-wrap" }}>{c.text.length > 360 ? `${c.text.slice(0, 360)}...` : c.text}</p>
          {c.hooks.length > 0 && (
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: 12 }}>{c.hooks.map((h) => <li key={h}>{h}</li>)}</ul>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
            <pre style={{ margin: 0, flex: 1, fontSize: 11.5, whiteSpace: "pre-wrap", fontFamily: "inherit", color: ink(0.6) }}>{c.description}</pre>
            <CopyMini text={c.description} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Publication et recyclage ─────────────────────────────────────────────

function PublicationTab({ script, plan, savePlan }: { script: CoachScript; plan: VideoPlan; savePlan: (p: VideoPlan) => void }) {
  const tr = useT();
  const auto = useMemo(() => autoChecklist({ title: script.title, description: script.instagram_caption, content: script.content, plan }), [script.title, script.instagram_caption, script.content, plan]);
  const done = (id: string) => plan.checklist?.[id] === true || auto[id] === true;
  const total = PUBLISH_CHECKLIST.length;
  const count = PUBLISH_CHECKLIST.filter((i) => done(i.id)).length;
  const row = journalRow({ id: script.id, title: script.title, pillar: script.pillar, contentFormat: script.content_format, sourceReference: script.source_reference, plan });
  const rowText = Object.entries(row).map(([k, v]) => `${k} : ${v}`).join("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 800 }}>{count}/{total}</p>
      {CHECKLIST_GROUPS.map((g) => (
        <div key={g.id}>
          <span style={label}>{tr(g.label)}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            {PUBLISH_CHECKLIST.filter((i) => i.group === g.id).map((i) => (
              <label key={i.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={done(i.id)}
                  disabled={auto[i.id] === true}
                  onChange={(e) => savePlan({ ...plan, checklist: { ...(plan.checklist ?? {}), [i.id]: e.target.checked } })}
                  style={{ marginTop: 2 }}
                />
                <span style={{ color: done(i.id) ? ink(0.5) : "var(--ep-ink)" }}>{tr(i.label)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={label}>{tr("Ligne du Journal de rotation")}</span>
          <CopyMini text={rowText} />
        </div>
        <pre style={{ margin: "4px 0 0", fontSize: 11, whiteSpace: "pre-wrap", fontFamily: "inherit", color: ink(0.6) }}>{rowText}</pre>
      </div>
    </div>
  );
}
