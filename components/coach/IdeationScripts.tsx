"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Copy, Check, FileText, Lightbulb, Sparkles, Megaphone, Clapperboard, Search, ChevronDown } from "lucide-react";
import { createScript, updateScript, deleteScript } from "@/app/dashboard/coach/studio/actions";
import { CONTENT_PROMPTS, HOOK_BANK, CTA_EXAMPLES, TECHNICAL_SHEETS } from "@/lib/content-library";
import type { CoachScript, ScriptFormat, ScriptStatus } from "@/lib/coach-ideation";
import type { BusinessCanvas } from "@/lib/coach-business-canvas";
import Link from "next/link";

const STATUS_LABELS: Record<ScriptStatus, { label: string; color: string }> = {
  a_tourner: { label: "À tourner", color: "#facc15" },
  tourne: { label: "Tourné", color: "#60a5fa" },
  publie: { label: "Publié", color: "#4ade80" },
};
// Cycle de vie confirmé le 2026-09-10 : écrire (déjà géré par le formulaire/
// les routines) → tourner → poster, et une fois posté le script est FINI
// (voir plus bas, section "Publiés" repliée, séparée des scripts encore à
// produire). Le retour publie -> a_tourner reste volontairement possible en
// reclicant, comme un "rouvrir si je me suis trompé", pas un vrai 4e état.
const STATUS_CYCLE: Record<ScriptStatus, ScriptStatus> = { a_tourner: "tourne", tourne: "publie", publie: "a_tourner" };
const STATUS_TITLES: Record<ScriptStatus, string> = {
  a_tourner: "Cliquer une fois tourné",
  tourne: "Cliquer une fois posté",
  publie: "Terminé — cliquer pour rouvrir si erreur",
};

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${min}min${rest}` : `${min}min`;
}

// Plateformes affichables — objet plutôt qu'un simple texte brut, pour que
// "youtube" (et tout futur "linkedin"/"tiktok") ait son propre badge visible
// au lieu de se fondre dans le badge "format" (voir Axe BJ, MASTERCLASS.md :
// les scripts YouTube produits par la routine quotidienne étaient jusque-là
// visuellement identiques à des scripts Instagram dans cette liste).
const PLATFORM_LABELS: Record<string, { label: string; color: string }> = {
  instagram: { label: "Instagram", color: "#E1306C" },
  youtube: { label: "YouTube", color: "#FF0000" },
  linkedin: { label: "LinkedIn", color: "#0A66C2" },
};

type Tab = "mes-scripts" | "prompts" | "hooks" | "cta" | "technique";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "mes-scripts", label: "Mes scripts", icon: FileText },
  { id: "prompts", label: "Prompts", icon: Sparkles },
  { id: "hooks", label: "Hooks", icon: Lightbulb },
  { id: "cta", label: "CTA", icon: Megaphone },
  { id: "technique", label: "Montage", icon: Clapperboard },
];

// Espace Scripts (Idéation) — demande explicite du 2026-08-15 : un vrai
// espace de production de contenu, pas juste une liste d'idées. Deux
// natures de contenu bien distinctes ici : "Mes scripts" est un espace de
// travail (CRUD, propre à chaque coach), le reste (Prompts/Hooks/CTA/
// Montage) est une bibliothèque de référence statique (lib/content-library.ts)
// partagée par tous, à copier-coller plutôt qu'à modifier.
export default function IdeationScripts({ initialScripts, canvas }: { initialScripts: CoachScript[]; canvas: BusinessCanvas | null }) {
  const [subTab, setSubTab] = useState<Tab>("mes-scripts");

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "6px 12px", borderRadius: 999,
              fontSize: 11, fontWeight: 700,
              border: subTab === id ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
              background: subTab === id ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
              color: subTab === id ? "#F5EDED" : "rgba(245,237,237,0.55)",
              cursor: "pointer",
            }}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {subTab === "mes-scripts" && <MyScripts initialScripts={initialScripts} />}
      {subTab === "prompts" && <PromptLibrary canvas={canvas} />}
      {subTab === "hooks" && <HookLibrary />}
      {subTab === "cta" && <CTALibrary />}
      {subTab === "technique" && <TechnicalLibrary />}
    </div>
  );
}

// ── Copie presse-papier générique ──────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Presse-papier indisponible (permission refusée, contexte non
          // sécurisé) — pas grave, le texte reste sélectionnable/copiable
          // à la main juste en dessous.
        }
      }}
      aria-label="Copier"
      style={{
        display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
        background: copied ? "rgba(74,222,128,0.15)" : "rgba(0,0,0,0.3)",
        border: `1px solid ${copied ? "rgba(74,222,128,0.4)" : "rgba(245,237,237,0.15)"}`,
        borderRadius: 8, padding: "6px 10px", fontSize: 10.5, fontWeight: 700,
        color: copied ? "#4ade80" : "rgba(245,237,237,0.5)", cursor: "pointer",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

// ── Mes scripts (workspace) ──────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: "var(--radius-lg)",
  color: "#F5EDED",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};

function MyScripts({ initialScripts }: { initialScripts: CoachScript[] }) {
  const [scripts, setScripts] = useState(initialScripts);
  useEffect(() => {
    setScripts(initialScripts);
  }, [initialScripts]);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("court");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Tracking de performance (2026-09-10) — édition d'un seul script à la
  // fois, même schéma que openId/draft ci-dessus pour le contenu.
  const [perfEditId, setPerfEditId] = useState<string | null>(null);
  const [perfViews, setPerfViews] = useState("");
  const [perfLikes, setPerfLikes] = useState("");
  const [perfComments, setPerfComments] = useState("");

  // Moyenne des vues sur les scripts déjà loggés, pour repérer "au-dessus
  // de la moyenne" automatiquement plutôt que de demander au coach de le
  // signaler lui-même à part (ce que faisait la page Notion "Suivi
  // Performance", jamais alimentée en pratique — voir MASTERCLASS.md Axe BJ).
  const avgViews = useMemo(() => {
    const withViews = scripts.filter((s): s is CoachScript & { views: number } => s.views != null);
    if (withViews.length < 2) return null; // pas assez de données pour qu'une "moyenne" veuille dire quelque chose
    return withViews.reduce((sum, s) => sum + s.views, 0) / withViews.length;
  }, [scripts]);

  function openPerfEdit(script: CoachScript) {
    setPerfEditId(script.id);
    setPerfViews(script.views != null ? String(script.views) : "");
    setPerfLikes(script.likes != null ? String(script.likes) : "");
    setPerfComments(script.comments_count != null ? String(script.comments_count) : "");
  }

  function savePerf(id: string) {
    const views = perfViews.trim() ? Number(perfViews) : null;
    const likes = perfLikes.trim() ? Number(perfLikes) : null;
    const commentsCount = perfComments.trim() ? Number(perfComments) : null;
    if ([views, likes, commentsCount].some((v) => v != null && (!Number.isFinite(v) || v < 0))) {
      setError("Chiffres invalides.");
      return;
    }
    setError(null);
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, views, likes, comments_count: commentsCount } : s)));
    setPerfEditId(null);
    startTransition(async () => {
      const result = await updateScript(id, { views, likes, commentsCount });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  // Cycle de vie à tourner → tourné → publié (retour direct 2026-09-10) :
  // une fois publié, le script est terminé, replié par défaut plutôt que de
  // rester mélangé aux scripts encore à produire (voir avgViews plus haut,
  // qui s'appuie déjà sur ce même statut).
  const [showPublished, setShowPublished] = useState(false);
  const activeScripts = scripts.filter((s) => s.status !== "publie");
  const publishedScripts = scripts.filter((s) => s.status === "publie");

  function submitNew() {
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Titre requis.");
      return;
    }
    startTransition(async () => {
      const result = await createScript({ title: t, format });
      if (result.error) {
        setError(result.error);
        return;
      }
      const newScript: CoachScript = {
        id: result.id ?? `tmp-${Date.now()}`,
        coach_id: "",
        title: t,
        format,
        content: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        duration_seconds: null,
        hook: null,
        pillar: null,
        source_reference: null,
        cta: null,
        instagram_caption: null,
        platform: "instagram",
        status: "a_tourner",
        views: null,
        likes: null,
        comments_count: null,
      };
      setScripts((prev) => [newScript, ...prev]);
      setTitle("");
      setShowForm(false);
      setOpenId(newScript.id);
      setDraft("");
    });
  }

  // MASTERCLASS.md Axe B (rattrapé le 2026-08-19) : résultat jamais
  // vérifié — un échec serveur laissait l'écran afficher un état faux
  // sans retour en arrière, jusqu'au prochain rechargement complet.
  function saveContent(id: string) {
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, content: draft || null } : s)));
    setOpenId(null);
    startTransition(async () => {
      const result = await updateScript(id, { content: draft });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  function cycleStatus(id: string, current: ScriptStatus) {
    const next = STATUS_CYCLE[current];
    const backup = scripts;
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, status: next } : s)));
    startTransition(async () => {
      const result = await updateScript(id, { status: next });
      if (result.error) {
        setScripts(backup);
        setError(result.error);
      }
    });
  }

  function remove(id: string) {
    const idx = scripts.findIndex((s) => s.id === id);
    const backup = scripts[idx];
    setScripts((prev) => prev.filter((s) => s.id !== id));
    if (openId === id) setOpenId(null);
    startTransition(async () => {
      const result = await deleteScript(id);
      if (result.error && backup) {
        setScripts((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#E01E1E", color: "#fff", padding: "8px 14px",
            borderRadius: 999, fontWeight: 800, fontSize: 12, border: "none", cursor: "pointer",
          }}
        >
          <Plus size={14} /> Nouveau script
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre du script"
            aria-label="Titre du script"
            style={inputStyle}
            autoFocus
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {(["court", "long"] as ScriptFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                style={{
                  fontSize: 11.5, fontWeight: 700, padding: "7px 14px", borderRadius: 999, cursor: "pointer",
                  border: format === f ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
                  background: format === f ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
                  color: format === f ? "#F5EDED" : "rgba(245,237,237,0.55)",
                }}
              >
                Format {f}
              </button>
            ))}
          </div>
          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
          <button
            type="button"
            onClick={submitNew}
            disabled={isPending}
            style={{
              marginTop: 10, background: "#E01E1E", color: "#fff", padding: "9px 18px",
              borderRadius: "var(--radius-lg)", fontWeight: 800, fontSize: 12.5, border: "none",
              cursor: "pointer", opacity: isPending ? 0.6 : 1,
            }}
          >
            {isPending ? "..." : "Créer"}
          </button>
        </div>
      )}

      {scripts.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <FileText size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun script pour l&apos;instant. Pioche un prompt ou un hook dans les onglets à côté pour démarrer.</p>
        </div>
      ) : (
        <>
          {/* Cycle de vie (retour direct 2026-09-10) : écrire → tourner →
              poster, et une fois posté le script est FINI — il ne doit plus
              se mélanger visuellement avec ceux encore à produire. Séparés
              en deux groupes plutôt qu'une seule liste plate qui grossit vite
              (5 reels/jour + 1 YouTube/jour, voir Axe BJ) : "publiés" replié
              par défaut, pas supprimé (le tracking de performance juste en
              dessous reste consultable dedans). */}
          {activeScripts.length === 0 && publishedScripts.length > 0 ? (
            <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 text-center mb-3">
              <p className="text-sm text-[#F5EDED]/35">Tout ce qui était à produire est posté. 🎉</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeScripts.map(renderScript)}
            </div>
          )}

          {publishedScripts.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setShowPublished((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%",
                  background: "none", border: "none", cursor: "pointer", padding: "8px 0",
                  borderTop: "1px solid rgba(245,237,237,0.08)",
                }}
              >
                <Check size={12} style={{ color: "#4ade80" }} strokeWidth={3} />
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.4)" }}>
                  Publiés, terminés ({publishedScripts.length})
                </span>
                <ChevronDown
                  size={13}
                  style={{ color: "rgba(245,237,237,0.3)", marginLeft: "auto", transform: showPublished ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }}
                />
              </button>
              {showPublished && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                  {publishedScripts.map(renderScript)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  function renderScript(script: CoachScript) {
    const statusInfo = STATUS_LABELS[script.status] ?? STATUS_LABELS.a_tourner;
    const duration = formatDuration(script.duration_seconds);
    const platformInfo = PLATFORM_LABELS[script.platform] ?? null;
    return (
            <div key={script.id} className="ep-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {platformInfo && (
                  <span
                    style={{
                      fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                      padding: "3px 8px", borderRadius: 999,
                      background: `${platformInfo.color}22`, color: platformInfo.color,
                      border: `1px solid ${platformInfo.color}44`,
                    }}
                  >
                    {platformInfo.label}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.15)", color: "#E01E1E",
                  }}
                >
                  {script.format}
                </span>
                {duration && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(245,237,237,0.45)" }}>{duration}</span>
                )}
                {script.pillar && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(245,237,237,0.4)", padding: "3px 8px", borderRadius: 999, border: "1px solid rgba(245,237,237,0.12)" }}>
                    {script.pillar}
                  </span>
                )}
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#F5EDED", flex: 1, minWidth: 120 }}>{script.title}</p>
                <button
                  type="button"
                  onClick={() => cycleStatus(script.id, script.status)}
                  title={STATUS_TITLES[script.status]}
                  style={{
                    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
                    padding: "3px 8px", borderRadius: 999, cursor: "pointer", border: `1px solid ${statusInfo.color}55`,
                    background: "transparent", color: statusInfo.color,
                  }}
                >
                  {statusInfo.label}
                </button>
                <button
                  type="button"
                  onClick={() => remove(script.id)}
                  aria-label="Supprimer"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Script mot pour mot — retour direct 2026-09-02 : "le script
                  que je dois lire mot pour mot y'a pas encore" — c'était déjà
                  là en base, mais noyé sous la description Instagram et
                  tronqué à 80px sans le moindre libellé. Maintenant en
                  premier, en entier, clairement identifié. */}
              <div style={{ marginTop: 10, background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.2)", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#E01E1E" }}>
                    Script (mot pour mot)
                  </span>
                  {script.content && <CopyButton text={script.content} />}
                </div>
                {openId === script.id ? (
                  <div>
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={8}
                      aria-label="Contenu du script"
                      style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                      autoFocus
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => saveContent(script.id)}
                        style={{
                          background: "#E01E1E", color: "#fff", padding: "9px 18px", borderRadius: "var(--radius-lg)",
                          fontWeight: 800, fontSize: 12.5, border: "none", cursor: "pointer",
                        }}
                      >
                        Enregistrer
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenId(null)}
                        style={{
                          background: "transparent", color: "rgba(245,237,237,0.5)", padding: "9px 18px",
                          borderRadius: "var(--radius-lg)", fontWeight: 700, fontSize: 12.5,
                          border: "1px solid rgba(245,237,237,0.15)", cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    onClick={() => {
                      setOpenId(script.id);
                      setDraft(script.content ?? "");
                    }}
                    style={{ margin: 0, fontSize: 13, color: "#F5EDED", lineHeight: 1.6, whiteSpace: "pre-wrap", cursor: "text" }}
                  >
                    {script.content || <span style={{ color: "rgba(245,237,237,0.25)" }}>Vide, clique pour écrire.</span>}
                  </p>
                )}
              </div>

              {(script.hook || script.cta || script.source_reference) && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                  {script.hook && (
                    <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)" }}>
                      <span style={{ fontWeight: 800, color: "rgba(245,237,237,0.35)" }}>Hook </span>{script.hook}
                    </p>
                  )}
                  {script.cta && (
                    <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)" }}>
                      <span style={{ fontWeight: 800, color: "rgba(245,237,237,0.35)" }}>CTA parlé </span>{script.cta}
                    </p>
                  )}
                  {script.source_reference && (
                    <p style={{ margin: 0, fontSize: 10.5, color: "rgba(245,237,237,0.35)", fontStyle: "italic" }}>
                      Source : {script.source_reference}
                    </p>
                  )}
                </div>
              )}

              {/* Description à poster avec la vidéo — distincte du script
                  parlé ci-dessus. Même colonne "instagram_caption" réutilisée
                  pour toute plateforme (YouTube inclus) : le libellé
                  s'adapte, la donnée reste une seule colonne texte libre. */}
              {script.instagram_caption && (
                <div style={{ marginTop: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "#60a5fa" }}>
                      Description {platformInfo?.label ?? ""}
                    </span>
                    <CopyButton text={script.instagram_caption} />
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {script.instagram_caption}
                  </p>
                </div>
              )}

              {/* Tracking de performance (2026-09-10) — seulement une fois
                  publié, jamais avant : loguer des vues sur un script pas
                  encore posté n'a pas de sens. Un seul champ obligatoire
                  (vues) pour rester rapide au quotidien, likes/commentaires
                  repliés en options plutôt qu'imposés. */}
              {script.status === "publie" && (
                <div style={{ marginTop: 10, background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 10, padding: "10px 12px" }}>
                  {perfEditId === script.id ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfViews} onChange={(e) => setPerfViews(e.target.value)}
                          placeholder="Vues" aria-label="Vues"
                          style={{ ...inputStyle, width: 90, padding: "8px 10px" }}
                          autoFocus
                        />
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfLikes} onChange={(e) => setPerfLikes(e.target.value)}
                          placeholder="Likes (optionnel)" aria-label="Likes"
                          style={{ ...inputStyle, width: 130, padding: "8px 10px" }}
                        />
                        <input
                          type="number" min="0" inputMode="numeric"
                          value={perfComments} onChange={(e) => setPerfComments(e.target.value)}
                          placeholder="Commentaires (optionnel)" aria-label="Commentaires"
                          style={{ ...inputStyle, width: 150, padding: "8px 10px" }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button" onClick={() => savePerf(script.id)}
                          style={{ background: "#4ade80", color: "#0a1f0a", padding: "7px 14px", borderRadius: 8, fontWeight: 800, fontSize: 11.5, border: "none", cursor: "pointer" }}
                        >
                          Enregistrer
                        </button>
                        <button
                          type="button" onClick={() => setPerfEditId(null)}
                          style={{ background: "transparent", color: "rgba(245,237,237,0.4)", padding: "7px 14px", borderRadius: 8, fontWeight: 700, fontSize: 11.5, border: "1px solid rgba(245,237,237,0.15)", cursor: "pointer" }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : script.views != null ? (
                    <button
                      type="button"
                      onClick={() => openPerfEdit(script)}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%", textAlign: "left" }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#4ade80" }}>{script.views.toLocaleString("fr-FR")} vues</span>
                      {script.likes != null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{script.likes.toLocaleString("fr-FR")} likes</span>}
                      {script.comments_count != null && <span style={{ fontSize: 11, color: "rgba(245,237,237,0.45)" }}>{script.comments_count.toLocaleString("fr-FR")} commentaires</span>}
                      {avgViews != null && script.views > avgViews && (
                        <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#facc15", background: "rgba(250,204,21,0.12)", padding: "2px 7px", borderRadius: 999 }}>
                          🔥 Au-dessus de la moyenne
                        </span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: 10, color: "rgba(245,237,237,0.25)", fontWeight: 700 }}>Modifier</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPerfEdit(script)}
                      style={{ fontSize: 11.5, fontWeight: 700, color: "#4ade80", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    >
                      + Loguer les résultats (vues)
                    </button>
                  )}
                </div>
              )}
            </div>
    );
  }
}

// ── Recherche générique pour les bibliothèques ──────────────────────────

function LibrarySearch({ query, onChange, placeholder }: { query: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
      <input
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{ ...inputStyle, paddingLeft: 32 }}
      />
    </div>
  );
}

// ── Bibliothèque de prompts ───────────────────────────────────────────────

// Personnalisation automatique (retour direct 2026-09-10 : "hyper
// personnalisé à eux, leur business, leur niche, leur client") — plutôt que
// de dupliquer les infos du Business Model Canvas dans chacun des ~25
// prompts (impossible à tenir à jour), un seul paragraphe de contexte est
// composé ici à partir du canvas déjà rempli par le coach (lib/coach-
// business-canvas.ts) et préfixé devant CHAQUE prompt au moment de la
// copie. Le prompt copié colle dans Claude/ChatGPT avec le contexte déjà
// dedans, sans que le coach ait à le retaper à chaque fois.
function buildCoachContext(canvas: BusinessCanvas | null): string | null {
  if (!canvas) return null;
  const parts: string[] = [];
  if (canvas.customer_segments) parts.push(`Mon client cible : ${canvas.customer_segments}`);
  if (canvas.value_proposition) parts.push(`Ma proposition de valeur, ce qui me différencie : ${canvas.value_proposition}`);
  if (canvas.customer_relationships) parts.push(`Comment je suis mes clients : ${canvas.customer_relationships}`);
  if (parts.length === 0) return null;
  return `Contexte sur mon activité de coach (garde-le en tête pour toute la suite de cette conversation) :\n${parts.join("\n")}\n\n---\n\n`;
}

function PromptLibrary({ canvas }: { canvas: BusinessCanvas | null }) {
  const [query, setQuery] = useState("");
  const context = useMemo(() => buildCoachContext(canvas), [canvas]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONTENT_PROMPTS;
    return CONTENT_PROMPTS.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      {context ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <Sparkles size={13} style={{ color: "#4ade80", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.6)", lineHeight: 1.5 }}>
            Ces prompts sont personnalisés avec ton Business Model Canvas : le contexte sur ton activité est
            automatiquement ajouté quand tu cliques Copier.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.18)", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          <Sparkles size={13} style={{ color: "#E01E1E", flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.55)", lineHeight: 1.5, flex: 1 }}>
            Remplis ton{" "}
            <Link href="/dashboard/coach/business" style={{ color: "#E01E1E", fontWeight: 700, textDecoration: "underline" }}>
              Business Model Canvas
            </Link>{" "}
            (au moins ta clientèle cible et ta proposition de valeur) pour que ces prompts se personnalisent
            automatiquement à ta situation au lieu de rester génériques.
          </p>
        </div>
      )}
      <LibrarySearch query={query} onChange={setQuery} placeholder="Chercher un prompt..." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p, i) => (
          <div key={i} className="ep-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.15)", color: "#E01E1E" }}>
                {p.category}
              </span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED", flex: 1 }}>{p.title}</p>
              <CopyButton text={context ? context + p.prompt : p.prompt} />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.6 }}>{p.prompt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Banque de hooks ────────────────────────────────────────────────────────

function HookLibrary() {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "visuel" | "texte">("all");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOOK_BANK.filter((h) => {
      if (kindFilter !== "all" && h.kind !== kindFilter) return false;
      if (!q) return true;
      return h.text.toLowerCase().includes(q) || h.category.toLowerCase().includes(q);
    });
  }, [query, kindFilter]);

  return (
    <div>
      <LibrarySearch query={query} onChange={setQuery} placeholder="Chercher un hook..." />
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["all", "texte", "visuel"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            style={{
              fontSize: 11, fontWeight: 700, padding: "6px 12px", borderRadius: 999, cursor: "pointer",
              border: kindFilter === k ? "1px solid #E01E1E" : "1px solid rgba(245,237,237,0.15)",
              background: kindFilter === k ? "rgba(224,30,30,0.16)" : "rgba(0,0,0,0.25)",
              color: kindFilter === k ? "#F5EDED" : "rgba(245,237,237,0.55)",
            }}
          >
            {k === "all" ? "Tous" : k === "texte" ? "Texte" : "Visuel"}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10.5, color: "rgba(245,237,237,0.3)", alignSelf: "center" }}>
          {filtered.length} hook{filtered.length > 1 ? "s" : ""}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((h, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(137,4,4,0.15)", borderRadius: 10, padding: "10px 12px" }}>
            <span style={{ fontSize: 8.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.3)", flexShrink: 0, width: 46 }}>
              {h.kind}
            </span>
            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.75)", flex: 1, lineHeight: 1.5 }}>{h.text}</p>
            <CopyButton text={h.text} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exemples de CTA ────────────────────────────────────────────────────────

function CTALibrary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {CTA_EXAMPLES.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.25)", border: "1px solid rgba(137,4,4,0.15)", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.75)", lineHeight: 1.5 }}>{c.text}</p>
            <p style={{ margin: "3px 0 0", fontSize: 10, color: "rgba(245,237,237,0.3)" }}>{c.goal}</p>
          </div>
          <CopyButton text={c.text} />
        </div>
      ))}
    </div>
  );
}

// ── Fiches techniques de montage ───────────────────────────────────────────

function TechnicalLibrary() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {TECHNICAL_SHEETS.map((sheet, i) => (
        <div key={i} className="ep-card" style={{ padding: 18 }}>
          <p style={{ margin: "0 0 4px", fontSize: 14.5, fontWeight: 800, color: "#F5EDED" }}>{sheet.title}</p>
          <p style={{ margin: "0 0 12px", fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>{sheet.summary}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sheet.steps.map((step, j) => (
              <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span
                  style={{
                    flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#E01E1E", color: "#fff",
                    fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1,
                  }}
                >
                  {j + 1}
                </span>
                <p style={{ margin: 0, fontSize: 12.5, color: "rgba(245,237,237,0.65)", lineHeight: 1.6 }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
