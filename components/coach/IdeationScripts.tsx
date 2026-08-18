"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Copy, Check, FileText, Lightbulb, Sparkles, Megaphone, Clapperboard, Search } from "lucide-react";
import { createScript, updateScript, deleteScript } from "@/app/dashboard/coach/studio/actions";
import { CONTENT_PROMPTS, HOOK_BANK, CTA_EXAMPLES, TECHNICAL_SHEETS } from "@/lib/content-library";
import type { CoachScript, ScriptFormat } from "@/lib/coach-ideation";

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
export default function IdeationScripts({ initialScripts }: { initialScripts: CoachScript[] }) {
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
      {subTab === "prompts" && <PromptLibrary />}
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
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scripts.map((script) => (
            <div key={script.id} className="ep-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                    padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.15)", color: "#E01E1E",
                  }}
                >
                  {script.format}
                </span>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#F5EDED", flex: 1 }}>{script.title}</p>
                {script.content && <CopyButton text={script.content} />}
                <button
                  type="button"
                  onClick={() => remove(script.id)}
                  aria-label="Supprimer"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {openId === script.id ? (
                <div style={{ marginTop: 10 }}>
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
                  style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.6, whiteSpace: "pre-wrap", cursor: "text", maxHeight: 80, overflow: "hidden" }}
                >
                  {script.content || <span style={{ color: "rgba(245,237,237,0.25)" }}>Vide, clique pour écrire.</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
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

function PromptLibrary() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CONTENT_PROMPTS;
    return CONTENT_PROMPTS.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <LibrarySearch query={query} onChange={setQuery} placeholder="Chercher un prompt..." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((p, i) => (
          <div key={i} className="ep-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.15)", color: "#E01E1E" }}>
                {p.category}
              </span>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED", flex: 1 }}>{p.title}</p>
              <CopyButton text={p.prompt} />
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
