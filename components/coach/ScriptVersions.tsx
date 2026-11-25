"use client";

import { useEffect, useState, useTransition } from "react";
import { FileText, Lightbulb, ListChecks, NotebookPen, Plus, StickyNote } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { fetchWritingInspiration, updateScript, type WritingInspiration } from "@/app/dashboard/coach/studio/actions";
import { bulletsToText, pointsFromText, type ScriptBullets } from "@/lib/script-bullets";

// Studio (25/11, demande d'Emmanuel) : un script a deux versions.
// « Script » = le texte mot pour mot (affiché par IdeationScripts).
// « Points clés » = l'idée principale (ou la question, ou le cas à résoudre),
// les points à développer à l'oral, puis l'appel à l'action.
// Plus un brouillon, pour réfléchir avant d'écrire, avec les dernières idées
// et notes du coach à côté.

export type ScriptVersionMode = "script" | "points";

const box: React.CSSProperties = {
  marginTop: 10,
  background: "rgba(var(--ep-accent-rgb),0.06)",
  border: "1px solid rgba(var(--ep-accent-rgb),0.2)",
  borderRadius: 10,
  padding: "10px 12px",
};

const field: React.CSSProperties = {
  width: "100%",
  borderRadius: 8,
  border: "1px solid rgba(var(--ep-ink-rgb),0.15)",
  background: "rgba(var(--ep-shade-rgb),0.25)",
  color: "var(--ep-ink)",
  padding: "8px 10px",
  fontSize: 13,
  fontFamily: "inherit",
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "rgba(var(--ep-ink-rgb),0.45)",
  marginBottom: 4,
};

function pill(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 800,
    cursor: "pointer",
    border: active ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-ink-rgb),0.15)",
    background: active ? "rgba(var(--ep-accent-rgb),0.16)" : "transparent",
    color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)",
  };
}

const primaryBtn: React.CSSProperties = {
  background: "var(--ep-accent)",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: "var(--radius-lg)",
  fontWeight: 800,
  fontSize: 12.5,
  border: "none",
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "rgba(var(--ep-ink-rgb),0.55)",
  padding: "8px 16px",
  borderRadius: "var(--radius-lg)",
  fontWeight: 700,
  fontSize: 12.5,
  border: "1px solid rgba(var(--ep-ink-rgb),0.15)",
  cursor: "pointer",
};

/** Bascule Script / Points clés, plus le bouton du brouillon. */
export function ScriptVersionToggle({
  mode,
  onMode,
  draftOpen,
  onDraft,
  hasBullets,
  hasDraft,
}: {
  mode: ScriptVersionMode;
  onMode: (m: ScriptVersionMode) => void;
  draftOpen: boolean;
  onDraft: () => void;
  hasBullets: boolean;
  hasDraft: boolean;
}) {
  const tr = useT();
  return (
    <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <div role="radiogroup" aria-label={tr("Version du script")} style={{ display: "inline-flex", gap: 4 }}>
        <button type="button" role="radio" aria-checked={mode === "script"} onClick={() => onMode("script")} style={pill(mode === "script")}>
          <FileText size={12} /> {tr("Script")}
        </button>
        <button type="button" role="radio" aria-checked={mode === "points"} onClick={() => onMode("points")} style={pill(mode === "points")}>
          <ListChecks size={12} /> {tr("Points clés")}
          {!hasBullets && <span style={{ fontSize: 9, opacity: 0.6 }}>({tr("vide")})</span>}
        </button>
      </div>
      <button type="button" onClick={onDraft} aria-expanded={draftOpen} style={{ ...pill(draftOpen), marginLeft: "auto" }}>
        <NotebookPen size={12} /> {tr("Brouillon")}
        {hasDraft && !draftOpen && <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "var(--ep-accent)" }} />}
      </button>
    </div>
  );
}

/** Version « Points clés » : lecture, puis édition au clic. */
export function BulletsPanel({
  scriptId,
  bullets,
  onSaved,
}: {
  scriptId: string;
  bullets: ScriptBullets | null;
  onSaved: (b: ScriptBullets | null) => void;
}) {
  const tr = useT();
  const [editing, setEditing] = useState(false);
  const [main, setMain] = useState("");
  const [points, setPoints] = useState("");
  const [cta, setCta] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function open() {
    setMain(bullets?.main ?? "");
    setPoints((bullets?.points ?? []).join("\n"));
    setCta(bullets?.cta ?? "");
    setError(null);
    setEditing(true);
  }

  function save() {
    const next: ScriptBullets = { main: main.trim(), points: pointsFromText(points), cta: cta.trim() };
    const empty = !next.main && next.points.length === 0 && !next.cta;
    startTransition(async () => {
      const res = await updateScript(scriptId, { bullets: empty ? null : next });
      if (res.error) {
        setError(res.error);
        return;
      }
      onSaved(empty ? null : next);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div style={box}>
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={label}>{tr("Idée principale, question ou cas à résoudre")}</span>
          <input value={main} onChange={(e) => setMain(e.target.value)} style={field} placeholder={tr("Ex. : Tu sautes ta séance ou t'y vas ?")} autoFocus />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={label}>{tr("Points à développer, un par ligne")}</span>
          <textarea
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            rows={6}
            style={{ ...field, resize: "vertical" }}
            placeholder={tr("T'as dormi 4 h : version courte\nT'as juste la flemme : tu y vas\nT'as mal au genou : autre exercice, et tu en parles")}
          />
        </label>
        <label style={{ display: "block", marginBottom: 10 }}>
          <span style={label}>{tr("Appel à l'action")}</span>
          <input value={cta} onChange={(e) => setCta(e.target.value)} style={field} placeholder={tr("Ex. : Commente 588 et je t'envoie le guide")} />
        </label>
        {error && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--ep-bad)" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={save} disabled={isPending} style={{ ...primaryBtn, opacity: isPending ? 0.6 : 1 }}>
            {isPending ? tr("Enregistrement…") : tr("Enregistrer")}
          </button>
          <button type="button" onClick={() => setEditing(false)} style={ghostBtn}>
            {tr("Annuler")}
          </button>
        </div>
      </div>
    );
  }

  if (!bullets) {
    return (
      <div style={box}>
        <button type="button" onClick={open} style={{ ...ghostBtn, width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, borderStyle: "dashed" }}>
          <Plus size={13} /> {tr("Écrire les points clés : l'idée, les points, le CTA")}
        </button>
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(bulletsToText(bullets)).catch(() => {})}
          style={{ fontSize: 11, fontWeight: 800, color: "var(--ep-accent)", background: "none", border: "none", cursor: "pointer" }}
        >
          {tr("Copier")}
        </button>
      </div>
      <div onClick={open} style={{ cursor: "text" }}>
        {bullets.main && <p style={{ margin: "0 0 8px", fontSize: 14.5, fontWeight: 900, color: "var(--ep-ink)", lineHeight: 1.35 }}>{bullets.main}</p>}
        {bullets.points.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 5 }}>
            {bullets.points.map((p, i) => (
              <li key={i} style={{ fontSize: 13.5, lineHeight: 1.45, color: "var(--ep-ink)" }}>
                {p}
              </li>
            ))}
          </ul>
        )}
        {bullets.cta && (
          <p style={{ margin: "10px 0 0", fontSize: 12.5, fontWeight: 800, color: "var(--ep-accent)" }}>→ {bullets.cta}</p>
        )}
      </div>
    </div>
  );
}

const DRAFT_PLACEHOLDER = `Pour qui ? (ex. une fille qui débute et n'ose pas aller aux machines)
Son problème, avec ses mots :
Ce que je veux qu'elle retienne :
Mes exemples ou situations :
La fin (CTA) :`;

/** Brouillon du script, avec les dernières idées et notes du coach à côté. */
export function DraftPanel({
  scriptId,
  draft,
  onSaved,
}: {
  scriptId: string;
  draft: string | null;
  onSaved: (d: string | null) => void;
}) {
  const tr = useT();
  const [text, setText] = useState(draft ?? "");
  const [inspiration, setInspiration] = useState<WritingInspiration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Chargé à l'ouverture du panneau.
  useEffect(() => {
    let cancelled = false;
    fetchWritingInspiration()
      .then((data) => {
        if (!cancelled) setInspiration(data);
      })
      .catch(() => {
        if (!cancelled) setInspiration({ ideas: [], notes: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function insert(line: string) {
    setText((t) => (t.trim() ? `${t.trimEnd()}\n${line}` : line));
    setSaved(false);
  }

  function save() {
    startTransition(async () => {
      const res = await updateScript(scriptId, { draft: text });
      if (res.error) {
        setError(res.error);
        return;
      }
      setError(null);
      setSaved(true);
      onSaved(text.trim() || null);
    });
  }

  const items = [
    ...(inspiration?.ideas ?? []).map((i) => ({ key: `i-${i.id}`, kind: "idée" as const, title: i.title, body: i.notes })),
    ...(inspiration?.notes ?? []).map((n) => ({ key: `n-${n.id}`, kind: "note" as const, title: n.title, body: n.body })),
  ];

  return (
    <div style={{ ...box, background: "rgba(var(--ep-shade-rgb),0.2)", borderColor: "rgba(var(--ep-ink-rgb),0.12)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <span style={label}>{tr("Brouillon : réfléchis ici avant d'écrire")}</span>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            rows={10}
            aria-label={tr("Brouillon du script")}
            placeholder={tr(DRAFT_PLACEHOLDER)}
            style={{ ...field, resize: "vertical", lineHeight: 1.5 }}
          />
          {error && <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ep-bad)" }}>{error}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <button type="button" onClick={save} disabled={isPending} style={{ ...primaryBtn, opacity: isPending ? 0.6 : 1 }}>
              {isPending ? tr("Enregistrement…") : tr("Enregistrer le brouillon")}
            </button>
            {saved && <span style={{ fontSize: 11.5, color: "var(--ep-ok)", fontWeight: 700 }}>{tr("Enregistré")}</span>}
          </div>
        </div>
        <aside aria-label={tr("Mes dernières idées et notes")} style={{ minWidth: 0 }}>
          <span style={label}>{tr("Mes dernières idées et notes")}</span>
          {loading ? (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{tr("Chargement…")}</p>
          ) : items.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.45)", lineHeight: 1.45 }}>
              {tr("Aucune idée ni note pour l'instant. Note-les dans l'onglet Idées ou Notes du Studio, elles apparaîtront ici.")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {items.map((it) => (
                <li key={it.key}>
                  <button
                    type="button"
                    onClick={() => insert(`• ${it.title}${it.body ? ` : ${it.body.replace(/\s+/g, " ").slice(0, 160)}` : ""}`)}
                    title={tr("Ajouter au brouillon")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                      padding: "7px 9px",
                      borderRadius: 8,
                      cursor: "pointer",
                      border: "1px solid rgba(var(--ep-ink-rgb),0.1)",
                      background: "rgba(var(--ep-shade-rgb),0.25)",
                      color: "var(--ep-ink)",
                      fontFamily: "inherit",
                    }}
                  >
                    {it.kind === "idée" ? <Lightbulb size={13} style={{ flexShrink: 0, marginTop: 2, color: "var(--ep-yellow)" }} /> : <StickyNote size={13} style={{ flexShrink: 0, marginTop: 2, color: "var(--ep-accent)" }} />}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, lineHeight: 1.3 }}>{it.title}</span>
                      {it.body && (
                        <span style={{ display: "block", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {it.body}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
