"use client";

// Affichage d'un script selon son format de contenu (2026-10-21, voir
// lib/content-formats.ts) : dialogue A/B en bulles, tableau B-roll, tier
// list en grille S/A/B/C, paires question/réponse ou mythe/réalité, étapes
// numérotées, carrousel en slides. Le texte reste une seule colonne en base :
// si sa forme n'est pas reconnue, on affiche le texte brut comme avant.
// Plus le mode tournage (texte en grand, défilement, plans B-roll à cocher).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Check, ChevronDown, Clapperboard, Mic, Minus, Pause, Play, Plus, Type, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { withAlpha } from "@/lib/theme-color";
import { CONTENT_FORMATS, getContentFormat, parseScript, prompterText, type ContentFormat, type ParsedScript } from "@/lib/content-formats";

const TIER_COLORS: Record<string, string> = {
  S: "var(--ep-bad)",
  A: "var(--ep-orange)",
  B: "var(--ep-yellow)",
  C: "var(--ep-ok)",
  D: "var(--ep-info)",
  F: "var(--ep-violet)",
};

const muted = "rgba(var(--ep-ink-rgb),0.5)";
const faint = "rgba(var(--ep-ink-rgb),0.35)";
const microLabel: React.CSSProperties = { fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em" };

// ── Badge ────────────────────────────────────────────────────────────────

export function ContentFormatBadge({ formatId, title }: { formatId: string | null | undefined; title?: string }) {
  const tr = useT();
  const f = getContentFormat(formatId);
  const Icon = f.icon;
  return (
    <span
      title={title ?? tr(f.description)}
      style={{
        ...microLabel,
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 8px", borderRadius: 999,
        background: withAlpha(f.color, "1f"), color: f.color, border: `1px solid ${withAlpha(f.color, "44")}`,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={10} strokeWidth={2.5} />
      {tr(f.short ?? f.label)}
    </span>
  );
}

// ── Choix du format ──────────────────────────────────────────────────────

export function ContentFormatPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const tr = useT();
  return (
    <div role="radiogroup" aria-label={tr("Format du contenu")} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {CONTENT_FORMATS.map((f) => {
        const active = f.id === value;
        const Icon = f.icon;
        return (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(f.id)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              fontSize: 11.5, fontWeight: 700, padding: "7px 11px", borderRadius: 999, cursor: "pointer",
              border: `1px solid ${active ? f.color : "rgba(var(--ep-ink-rgb),0.15)"}`,
              background: active ? withAlpha(f.color, "24") : "rgba(var(--ep-shade-rgb),0.25)",
              color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)",
            }}
          >
            <Icon size={12} style={{ color: f.color }} />
            {tr(f.label)}
          </button>
        );
      })}
    </div>
  );
}

/** Ce qu'est le format, sa structure type, ses conseils de tournage. */
export function FormatGuide({ formatId, defaultOpen = false }: { formatId: string; defaultOpen?: boolean }) {
  const tr = useT();
  const f = getContentFormat(formatId);
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: withAlpha(f.color, "0f"), border: `1px solid ${withAlpha(f.color, "33")}`, borderRadius: 12, padding: "10px 12px" }}>
      <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.7)", lineHeight: 1.5 }}>{tr(f.description)}</p>
      {f.rule && (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, fontWeight: 800, color: "var(--ep-warn)", lineHeight: 1.45 }}>{tr(f.rule)}</p>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 800, color: f.color }}
      >
        {tr("Structure et conseils de tournage")}
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 160ms ease" }} />
      </button>
      {open && (
        <div style={{ marginTop: 8, display: "grid", gap: 10 }} className="sm:grid-cols-2">
          <div>
            <p style={{ ...microLabel, margin: "0 0 4px", color: faint }}>{tr("Structure")}</p>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.7)", lineHeight: 1.55 }}>
              {f.structure.map((s) => <li key={s}>{tr(s)}</li>)}
            </ol>
          </div>
          <div>
            <p style={{ ...microLabel, margin: "0 0 4px", color: faint }}>{f.filmed ? tr("Conseils de tournage") : tr("Conseils")}</p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.7)", lineHeight: 1.55 }}>
              {f.tips.map((s) => <li key={s}>{tr(s)}</li>)}
            </ul>
          </div>
          <div className="sm:col-span-2">
            <p style={{ ...microLabel, margin: "0 0 4px", color: faint }}>{tr("Forme du script")}</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.7)", lineHeight: 1.5 }}>{tr(f.shapeHint)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Corps du script selon la forme ───────────────────────────────────────

function Para({ text, style }: { text: string; style?: React.CSSProperties }) {
  if (!text) return null;
  return <p style={{ margin: 0, fontSize: 13, color: "var(--ep-ink)", lineHeight: 1.6, whiteSpace: "pre-wrap", ...style }}>{text}</p>;
}

function Labeled({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ ...microLabel, color }}>{label}</span>
      <div style={{ marginTop: 2 }}>{children}</div>
    </div>
  );
}

export function ScriptBody({ formatId, content }: { formatId: string | null | undefined; content: string | null | undefined }) {
  const tr = useT();
  const parsed = useMemo(() => parseScript(formatId, content), [formatId, content]);
  const f = getContentFormat(formatId);
  return <ParsedView parsed={parsed} format={f} tr={tr} />;
}

function ParsedView({ parsed, format, tr }: { parsed: ParsedScript; format: ContentFormat; tr: (s: string) => string }) {
  switch (parsed.shape) {
    case "texte":
      return <Para text={parsed.text} />;

    case "points":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parsed.intro && <Labeled label={tr("Accroche, dite telle quelle")} color={format.color}><Para text={parsed.intro} style={{ fontWeight: 700 }} /></Labeled>}
          <div>
            <span style={{ ...microLabel, color: faint }}>{tr("Points à dérouler, sans lire")}</span>
            <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
              {parsed.points.map((p, i) => (
                <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: "var(--ep-ink)", lineHeight: 1.5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: format.color, marginTop: 7, flexShrink: 0 }} />
                  <span style={{ whiteSpace: "pre-wrap" }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
          {parsed.outro && <Labeled label={tr("Fin")} color={faint}><Para text={parsed.outro} /></Labeled>}
        </div>
      );

    case "dialogue": {
      const nameA = parsed.roles.A ? `A · ${parsed.roles.A}` : "A";
      const nameB = parsed.roles.B ? `B · ${parsed.roles.B}` : "B";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {(parsed.roles.A || parsed.roles.B) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 2 }}>
              {parsed.roles.A && <span style={{ ...microLabel, padding: "3px 8px", borderRadius: 999, background: "rgba(var(--ep-accent-rgb),0.14)", color: "var(--ep-accent)" }}>{nameA}</span>}
              {parsed.roles.B && <span style={{ ...microLabel, padding: "3px 8px", borderRadius: 999, background: "rgba(var(--ep-info-rgb),0.14)", color: "var(--ep-info)" }}>{nameB}</span>}
            </div>
          )}
          {parsed.lines.map((l, i) =>
            l.who === null ? (
              <p key={i} style={{ margin: 0, fontSize: 11.5, fontStyle: "italic", color: muted, textAlign: "center" }}>{l.text}</p>
            ) : (
              <div key={i} style={{ display: "flex", justifyContent: l.who === "A" ? "flex-start" : "flex-end" }}>
                <div
                  style={{
                    maxWidth: "86%", padding: "8px 11px", borderRadius: 14,
                    borderTopLeftRadius: l.who === "A" ? 4 : 14, borderTopRightRadius: l.who === "B" ? 4 : 14,
                    background: l.who === "A" ? "rgba(var(--ep-accent-rgb),0.12)" : "rgba(var(--ep-info-rgb),0.12)",
                    border: `1px solid ${l.who === "A" ? "rgba(var(--ep-accent-rgb),0.3)" : "rgba(var(--ep-info-rgb),0.3)"}`,
                  }}
                >
                  <span style={{ ...microLabel, color: l.who === "A" ? "var(--ep-accent)" : "var(--ep-info)" }}>{l.who === "A" ? nameA : nameB}</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--ep-ink)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{l.text}</p>
                </div>
              </div>
            )
          )}
        </div>
      );
    }

    case "broll":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parsed.intro && <Para text={parsed.intro} />}
          <div className="hidden sm:grid" style={{ gridTemplateColumns: "28px 1fr 1fr 1.3fr", gap: 10, padding: "0 10px" }}>
            <span />
            <span style={{ ...microLabel, color: faint }}>{tr("Plan à filmer")}</span>
            <span style={{ ...microLabel, color: faint }}>{tr("Texte à l'écran")}</span>
            <span style={{ ...microLabel, color: faint }}>{tr("Voix off")}</span>
          </div>
          {parsed.rows.map((r, i) => (
            <div
              key={i}
              className="grid sm:grid-cols-[28px_1fr_1fr_1.3fr]"
              style={{ gap: 8, padding: "9px 10px", borderRadius: 10, background: "rgba(var(--ep-shade-rgb),0.3)", border: "1px solid rgba(var(--ep-line-rgb),0.2)" }}
            >
              <span style={{ width: 22, height: 22, borderRadius: 999, background: withAlpha(format.color, "26"), color: format.color, fontSize: 11, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <BrollCell icon={<Camera size={11} />} label={tr("Plan à filmer")} text={r.plan} />
              <BrollCell icon={<Type size={11} />} label={tr("Texte à l'écran")} text={r.ecran} strong />
              <BrollCell icon={<Mic size={11} />} label={tr("Voix off")} text={r.voix} />
            </div>
          ))}
          {parsed.outro && <Para text={parsed.outro} />}
        </div>
      );

    case "tier": {
      const tiers = Array.from(new Set(parsed.items.map((i) => i.tier))).sort((a, b) => "SABCDF".indexOf(a) - "SABCDF".indexOf(b));
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parsed.intro && <Para text={parsed.intro} style={{ fontWeight: 700 }} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(var(--ep-line-rgb),0.25)" }}>
            {tiers.map((t) => {
              const color = TIER_COLORS[t] ?? "var(--ep-ink)";
              return (
                <div key={t} style={{ display: "flex", alignItems: "stretch", background: "rgba(var(--ep-shade-rgb),0.3)" }}>
                  <div style={{ width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: withAlpha(color, "33"), color, fontSize: 20, fontWeight: 900 }}>{t}</div>
                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexWrap: "wrap", gap: 6, padding: 8 }}>
                    {parsed.items.filter((i) => i.tier === t).map((i, k) => (
                      <div key={k} style={{ padding: "6px 9px", borderRadius: 9, background: "var(--ep-s2)", border: `1px solid ${withAlpha(color, "44")}`, maxWidth: "100%" }}>
                        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: "var(--ep-ink)" }}>{i.item}</p>
                        {i.why && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: muted, lineHeight: 1.4 }}>{i.why}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {parsed.outro && <Para text={parsed.outro} />}
        </div>
      );
    }

    case "paires": {
      const [la, lb] = parsed.labels;
      const isMyth = format.id === "mythe_realite";
      const colorA = isMyth ? "var(--ep-bad)" : format.id === "reaction" ? "var(--ep-pink)" : "var(--ep-info)";
      const colorB = isMyth ? "var(--ep-ok)" : "var(--ep-accent)";
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parsed.intro && <Para text={parsed.intro} />}
          {parsed.pairs.map((p, i) => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(var(--ep-line-rgb),0.25)" }}>
              {p.a && (
                <div style={{ padding: "9px 11px", background: withAlpha(colorA, "14"), borderLeft: `3px solid ${colorA}` }}>
                  <span style={{ ...microLabel, color: colorA }}>{tr(la)}</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: "var(--ep-ink)", lineHeight: 1.5, whiteSpace: "pre-wrap", fontStyle: format.id === "question_reponse" || format.id === "reponse_commentaire" ? "italic" : "normal" }}>
                    {format.id === "question_reponse" || format.id === "reponse_commentaire" ? `« ${p.a} »` : p.a}
                  </p>
                </div>
              )}
              {p.b && (
                <div style={{ padding: "9px 11px", background: "rgba(var(--ep-shade-rgb),0.3)", borderLeft: `3px solid ${colorB}` }}>
                  <span style={{ ...microLabel, color: colorB }}>{tr(lb)}</span>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--ep-ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{p.b}</p>
                </div>
              )}
            </div>
          ))}
          {parsed.outro && <Para text={parsed.outro} />}
        </div>
      );
    }

    case "sections":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {parsed.intro && <Para text={parsed.intro} style={{ marginBottom: 8 }} />}
          {parsed.sections.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: format.color, marginTop: 4 }} />
                {i < parsed.sections.length - 1 && <span style={{ flex: 1, width: 2, background: withAlpha(format.color, "33"), margin: "2px 0" }} />}
              </div>
              <div style={{ paddingBottom: 10, minWidth: 0 }}>
                <span style={{ ...microLabel, color: format.color }}>{tr(s.label)}</span>
                <Para text={s.text} style={{ marginTop: 1 }} />
              </div>
            </div>
          ))}
        </div>
      );

    case "etapes":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {parsed.intro && <Para text={parsed.intro} style={{ fontWeight: 700 }} />}
          {parsed.steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 999, background: format.color, color: "var(--ep-bg)", fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <Para text={s} style={{ paddingTop: 2 }} />
            </div>
          ))}
          {parsed.outro && <Para text={parsed.outro} />}
        </div>
      );

    case "slides":
      return (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 4 }}>
          {parsed.slides.map((s, i) => (
            <div
              key={i}
              style={{
                flex: "0 0 auto", width: 150, aspectRatio: "4 / 5", scrollSnapAlign: "start",
                borderRadius: 12, padding: 12, display: "flex", flexDirection: "column",
                background: i === 0 ? withAlpha(format.color, "22") : "rgba(var(--ep-shade-rgb),0.35)",
                border: `1px solid ${i === 0 ? withAlpha(format.color, "55") : "rgba(var(--ep-line-rgb),0.25)"}`,
              }}
            >
              <span style={{ ...microLabel, color: i === 0 ? format.color : faint }}>{tr("Slide")} {s.n}</span>
              <p style={{ margin: "6px 0 0", fontSize: i === 0 ? 14 : 12.5, fontWeight: i === 0 ? 900 : 600, color: "var(--ep-ink)", lineHeight: 1.35, whiteSpace: "pre-wrap", overflow: "hidden" }}>{s.text}</p>
            </div>
          ))}
        </div>
      );
  }
}

function BrollCell({ icon, label, text, strong }: { icon: React.ReactNode; label: string; text: string; strong?: boolean }) {
  if (!text) return <span className="hidden sm:block" />;
  return (
    <div style={{ minWidth: 0 }}>
      <span className="sm:hidden" style={{ ...microLabel, color: faint, display: "inline-flex", alignItems: "center", gap: 4 }}>{icon}{label}</span>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: strong ? 800 : 500, color: "var(--ep-ink)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{text}</p>
    </div>
  );
}

// ── Mode tournage ────────────────────────────────────────────────────────

const SPEEDS = [
  { id: "lent", label: "Lent", px: 22 },
  { id: "moyen", label: "Moyen", px: 38 },
  { id: "rapide", label: "Rapide", px: 60 },
];

function readChecked(id: string): number[] {
  try {
    const raw = window.localStorage.getItem(`ep-studio-plans-${id}`);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((n): n is number => typeof n === "number") : [];
  } catch {
    return [];
  }
}

function writeChecked(id: string, list: number[]) {
  try {
    window.localStorage.setItem(`ep-studio-plans-${id}`, JSON.stringify(list));
  } catch {
    // Stockage indisponible (navigation privée) : la liste marche quand même,
    // elle ne sera juste pas retrouvée au prochain passage.
  }
}

/**
 * Mode tournage (« à tourner ») : le script en grand, défilement réglable,
 * et selon le format les plans B-roll à cocher au fil du tournage ou les
 * répliques d'un seul rôle du clone (on filme tout A, puis tout B).
 */
export function ShootingMode({
  scriptId,
  title,
  formatId,
  content,
  onClose,
  onOpenPrompter,
  onShot,
}: {
  scriptId: string;
  title: string;
  formatId: string | null | undefined;
  content: string;
  onClose: () => void;
  /** Ouvre le prompteur caméra avec le texte à lire (déjà adapté au format). */
  onOpenPrompter?: (text: string) => void;
  /** « J'ai tourné » : passe le script en tourné. */
  onShot?: () => void;
}) {
  const tr = useT();
  const f = getContentFormat(formatId);
  const parsed = useMemo(() => parseScript(formatId, content), [formatId, content]);
  const isBroll = parsed.shape === "broll";
  const isDialogue = parsed.shape === "dialogue";
  const [tab, setTab] = useState<"plans" | "texte">(isBroll ? "plans" : "texte");
  const [role, setRole] = useState<"tous" | "A" | "B">("tous");
  const [fontSize, setFontSize] = useState(26);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(SPEEDS[1].px);
  const [checked, setChecked] = useState<number[]>(() => (typeof window === "undefined" ? [] : readChecked(scriptId)));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Défilement continu piloté par requestAnimationFrame (même principe que
  // le prompteur caméra, Teleprompter.tsx), réglable en direct.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last: number | null = null;
    let acc = 0;
    const step = (t: number) => {
      const el = scrollRef.current;
      if (el) {
        if (last !== null) {
          acc += ((t - last) / 1000) * speed;
          const whole = Math.floor(acc);
          if (whole > 0) {
            el.scrollTop += whole;
            acc -= whole;
          }
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
            setPlaying(false);
            return;
          }
        }
        last = t;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function toggleShot(i: number) {
    setChecked((prev) => {
      const next = prev.includes(i) ? prev.filter((n) => n !== i) : [...prev, i];
      writeChecked(scriptId, next);
      return next;
    });
  }

  const readText = prompterText(formatId, content, isDialogue && role !== "tous" ? role : undefined);
  const rows = isBroll ? parsed.rows : [];
  const doneCount = rows.filter((_, i) => checked.includes(i)).length;

  const chip = (active: boolean, color = "var(--ep-accent)"): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap",
    border: `1px solid ${active ? color : "rgba(var(--ep-ink-rgb),0.15)"}`,
    background: active ? withAlpha(color, "22") : "transparent",
    color: active ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)",
  });
  const iconBtn: React.CSSProperties = {
    width: 38, height: 38, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center",
    border: "1px solid rgba(var(--ep-ink-rgb),0.15)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "var(--ep-ink)", cursor: "pointer", flexShrink: 0,
  };

  const overlay = (
    <div role="dialog" aria-modal="true" aria-label={tr("Mode tournage")} className="fixed inset-0 z-[998] flex flex-col" style={{ background: "var(--ep-bg)", color: "var(--ep-ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "calc(env(safe-area-inset-top, 0px) + 12px) 16px 10px", borderBottom: "1px solid rgba(var(--ep-line-rgb),0.2)" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <Clapperboard size={12} style={{ color: "var(--ep-accent)" }} />
            <span style={{ ...microLabel, color: "var(--ep-accent)" }}>{tr("Mode tournage")}</span>
            <ContentFormatBadge formatId={f.id} />
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={tr("Fermer")} style={iconBtn}>
          <X size={17} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", overflowX: "auto", borderBottom: "1px solid rgba(var(--ep-line-rgb),0.12)" }}>
        {isBroll && (
          <>
            <button type="button" onClick={() => setTab("plans")} style={chip(tab === "plans", "var(--ep-info)")} aria-pressed={tab === "plans"}>
              <Camera size={13} /> {tr("Plans")} {doneCount}/{rows.length}
            </button>
            <button type="button" onClick={() => setTab("texte")} style={chip(tab === "texte", "var(--ep-info)")} aria-pressed={tab === "texte"}>
              <Mic size={13} /> {tr("Voix off")}
            </button>
          </>
        )}
        {isDialogue && (["tous", "A", "B"] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)} style={chip(role === r, r === "B" ? "var(--ep-info)" : "var(--ep-accent)")} aria-pressed={role === r}>
            {r === "tous" ? tr("Tout le dialogue") : `${tr("Rôle")} ${r}`}
          </button>
        ))}
        {(!isBroll || tab === "texte") && (
          <>
            <button type="button" onClick={() => setPlaying((v) => !v)} style={chip(playing)} aria-pressed={playing}>
              {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? tr("Pause") : tr("Défiler")}
            </button>
            {SPEEDS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSpeed(s.px)} style={chip(speed === s.px)} aria-pressed={speed === s.px}>
                {tr(s.label)}
              </button>
            ))}
            <button type="button" onClick={() => setFontSize((v) => Math.max(16, v - 3))} aria-label={tr("Texte plus petit")} style={iconBtn}>
              <Minus size={15} />
            </button>
            <button type="button" onClick={() => setFontSize((v) => Math.min(48, v + 3))} aria-label={tr("Texte plus grand")} style={iconBtn}>
              <Plus size={15} />
            </button>
          </>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "18px 16px 40px", scrollBehavior: "auto" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{ marginBottom: 18 }}>
            <FormatGuide formatId={f.id} />
          </div>

          {isBroll && tab === "plans" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ height: 6, borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.08)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{ height: "100%", width: `${rows.length ? (doneCount / rows.length) * 100 : 0}%`, background: "var(--ep-ok)", transition: "width 200ms ease" }} />
              </div>
              {rows.map((r, i) => {
                const done = checked.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleShot(i)}
                    aria-pressed={done}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 12, textAlign: "left", width: "100%", cursor: "pointer",
                      padding: "12px 14px", borderRadius: 14,
                      border: `1px solid ${done ? "rgba(var(--ep-ok-rgb),0.45)" : "rgba(var(--ep-line-rgb),0.25)"}`,
                      background: done ? "rgba(var(--ep-ok-rgb),0.08)" : "rgba(var(--ep-shade-rgb),0.3)",
                      color: "var(--ep-ink)",
                    }}
                  >
                    <span
                      style={{
                        width: 26, height: 26, borderRadius: 8, flexShrink: 0, marginTop: 1,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: `2px solid ${done ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.3)"}`,
                        background: done ? "var(--ep-ok)" : "transparent", color: "var(--ep-bg)",
                      }}
                    >
                      {done && <Check size={16} strokeWidth={3} />}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ ...microLabel, color: faint }}>{tr("Plan")} {i + 1}</span>
                      <span style={{ display: "block", fontSize: 18, fontWeight: 800, lineHeight: 1.35, textDecoration: done ? "line-through" : "none", opacity: done ? 0.6 : 1 }}>
                        {r.plan || tr("Plan à définir")}
                      </span>
                      {r.ecran && <span style={{ display: "block", marginTop: 4, fontSize: 13, color: muted }}>{tr("Écran :")} {r.ecran}</span>}
                    </span>
                  </button>
                );
              })}
              {doneCount === rows.length && rows.length > 0 && (
                <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 800, color: "var(--ep-ok)", textAlign: "center" }}>
                  {tr("Tous les plans sont filmés. Passe à la voix off.")}
                </p>
              )}
            </div>
          ) : isDialogue && role === "tous" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {parsed.lines.filter((l) => l.who).map((l, i) => (
                <p key={i} style={{ margin: 0, fontSize, fontWeight: 800, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                  <span style={{ color: l.who === "A" ? "var(--ep-accent)" : "var(--ep-info)" }}>{l.who} </span>
                  {l.text}
                </p>
              ))}
            </div>
          ) : (
            <BigText text={readText} fontSize={fontSize} />
          )}
          <div style={{ height: "40vh" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "10px 16px calc(env(safe-area-inset-bottom, 0px) + 12px)", borderTop: "1px solid rgba(var(--ep-line-rgb),0.2)", flexWrap: "wrap" }}>
        {f.filmed && onOpenPrompter && (
          <button
            type="button"
            onClick={() => onOpenPrompter(readText)}
            style={{ flex: 1, minWidth: 150, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(var(--ep-accent-rgb),0.45)", background: "rgba(var(--ep-accent-rgb),0.14)", color: "var(--ep-ink)", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            <Camera size={15} /> {isBroll ? tr("Enregistrer la voix off") : tr("Filmer avec le prompteur")}
          </button>
        )}
        {onShot && (
          <button
            type="button"
            onClick={onShot}
            style={{ flex: 1, minWidth: 130, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 14px", borderRadius: 12, border: "none", background: "var(--ep-info)", color: "var(--ep-bg)", fontSize: 13, fontWeight: 900, cursor: "pointer" }}
          >
            <Clapperboard size={15} /> {tr("J'ai tourné")}
          </button>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}

/** Texte en grand, libellés en tête de ligne (« Mythe : », « S : ») mis en couleur. */
function BigText({ text, fontSize }: { text: string; fontSize: number }) {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: fontSize * 0.7 }} />;
        const m = line.match(/^\s*([^:：|]{1,22}?)\s*[:：]\s*(.*)$/);
        const tier = m ? TIER_COLORS[m[1].trim()] : undefined;
        return (
          <p key={i} style={{ margin: 0, fontSize, fontWeight: 800, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
            {m ? (
              <>
                <span style={{ color: tier ?? "var(--ep-accent)" }}>{m[1].trim()} : </span>
                {m[2]}
              </>
            ) : (
              line
            )}
          </p>
        );
      })}
    </div>
  );
}
