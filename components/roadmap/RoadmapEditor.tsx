"use client";

import { useEffect, useState, isValidElement, cloneElement } from "react";
import { Plus, Trash2, Save, Eye, EyeOff, Target, CalendarRange, ChevronDown, AlertCircle } from "lucide-react";
import { PHASE_COLORS, OBJECTIVE_TERM_COLORS } from "@/lib/roadmap-colors";
import RoadmapCalendar from "@/components/roadmap/RoadmapCalendar";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";

// ── Local form types ──────────────────────────────────────────────────────────

interface PhaseForm extends Omit<RoadmapPhase, "id" | "roadmap_id"> {
  localId: string;
}

interface ObjectiveForm extends Omit<RoadmapObjective, "id" | "roadmap_id"> {
  localId: string;
}

function uid() {
  return Math.random().toString(36).slice(2);
}

const PHASE_TYPES = Object.entries(PHASE_COLORS).map(([key, val]) => ({
  value: key,
  label: val.label,
  icon: val.icon,
  solid: val.solid,
}));

const OBJECTIVE_TYPES = [
  { value: "weight", label: "Poids", unit: "kg" },
  { value: "measurement", label: "Mensuration", unit: "cm" },
  { value: "performance", label: "Performance", unit: "kg" },
  { value: "competition", label: "Compétition", unit: "" },
  { value: "phase_change", label: "Changement de phase", unit: "" },
  { value: "custom", label: "Personnalisé", unit: "" },
];

const TERM_OPTIONS = [
  { value: "short",  label: "Court terme",  sub: "semaine" },
  { value: "medium", label: "Moyen terme",  sub: "mois" },
  { value: "long",   label: "Long terme",   sub: "année" },
] as const;

// ── Components ────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.15)",
  borderRadius: 8,
  color: "#F5EDED",
  padding: "10px 14px",
  fontSize: 13,
  width: "100%",
  fontFamily: "var(--font-montserrat,'Montserrat'),sans-serif",
  fontWeight: 500,
  outline: "none",
  transition: "border-color 0.15s",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  color: "rgba(224,30,30,0.7)",
  marginBottom: 6,
  display: "block",
};

// Le <span> visuel n'a aucun lien programmatique avec son champ (pas de
// <label>/htmlFor) — un lecteur d'écran n'annonce que "champ de texte",
// sans dire lequel. On clone le champ pour lui injecter le texte du label
// en aria-label plutôt que de restructurer le DOM (risque zéro sur la
// mise en page existante, contrairement à englober le champ dans le span).
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const field =
    isValidElement(children) && !(children.props as { "aria-label"?: string })["aria-label"]
      ? cloneElement(children as React.ReactElement<{ "aria-label"?: string }>, { "aria-label": label })
      : children;
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {field}
    </div>
  );
}

// ── Phase card ────────────────────────────────────────────────────────────────

function PhaseCard({
  phase,
  index,
  onChange,
  onDelete,
  open,
  onToggle,
}: {
  phase: PhaseForm;
  index: number;
  onChange: (patch: Partial<PhaseForm>) => void;
  onDelete: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const colors = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;

  return (
    <div style={{
      background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: 16,
      position: "relative",
    }}>
      {/* Top accent */}
      <div style={{
        position: "absolute",
        top: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, transparent, ${colors.solid}, transparent)`,
        borderRadius: "12px 12px 0 0",
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: open ? 14 : 0 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          style={{
            display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1,
            background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
          }}
        >
          <span style={{ fontSize: 16, flexShrink: 0 }}>{colors.icon}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
            textTransform: "uppercase", color: colors.solid, flexShrink: 0,
          }}>
            Phase {index + 1}
          </span>
          {/* Résumé visible même repliée (2026-08-19, accordéon demandé sur
              les pages "tout empilé") : label + dates, pour ne pas perdre le
              repère d'ensemble en refermant une phase déjà remplie. */}
          {!open && (
            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
              {phase.label || colors.label}
              {phase.start_date && phase.end_date ? ` · ${phase.start_date} → ${phase.end_date}` : ""}
            </span>
          )}
          <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: "auto", color: "rgba(245,237,237,0.3)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(224,30,30,0.4)", padding: 4, flexShrink: 0 }}
          title="Supprimer la phase"
          aria-label="Supprimer la phase"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Type">
              <select
                value={phase.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  const newLabel = PHASE_COLORS[newType as keyof typeof PHASE_COLORS]?.label ?? phase.label;
                  onChange({ type: newType, label: newLabel });
                }}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {PHASE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Label personnalisé">
              <input
                type="text"
                value={phase.label}
                onChange={(e) => onChange({ label: e.target.value })}
                style={inputStyle}
                placeholder={colors.label}
              />
            </Field>

            <Field label="Date de début">
              <input
                type="date"
                value={phase.start_date}
                onChange={(e) => onChange({ start_date: e.target.value })}
                style={inputStyle}
              />
            </Field>

            <Field label="Date de fin">
              <input
                type="date"
                value={phase.end_date}
                min={phase.start_date}
                onChange={(e) => onChange({ end_date: e.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Notes (facultatif)">
            <textarea
              value={phase.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Objectifs spécifiques à cette phase…" aria-label="Objectifs spécifiques à cette phase…"
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
            />
          </Field>
        </>
      )}
    </div>
  );
}

// ── Objective card ────────────────────────────────────────────────────────────

function ObjectiveCard({
  obj,
  onChange,
  onDelete,
  open,
  onToggle,
}: {
  obj: ObjectiveForm;
  onChange: (patch: Partial<ObjectiveForm>) => void;
  onDelete: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const typeConfig = OBJECTIVE_TYPES.find((t) => t.value === obj.type);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
      border: "1px solid rgba(224,30,30,0.15)",
      borderRadius: 12,
      padding: 16,
    }}>
      {/* En-tête toujours visible : titre + résumé replié + bascule */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: open ? 14 : 0 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          style={{
            display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1,
            background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left",
          }}
        >
          <Target size={13} style={{ flexShrink: 0, color: OBJECTIVE_TERM_COLORS[obj.term] ?? "rgba(245,237,237,0.4)" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {obj.label || typeConfig?.label || "Objectif"}
          </span>
          {obj.is_achieved && (
            <span style={{ fontSize: 9, fontWeight: 800, color: "#4ade80", textTransform: "uppercase", flexShrink: 0 }}>✓ Atteint</span>
          )}
          <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: "auto", color: "rgba(245,237,237,0.3)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer l'objectif"
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(224,30,30,0.4)", padding: "0 4px", flexShrink: 0 }}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {open && (
        <>
          {/* Term selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {TERM_OPTIONS.map((t) => (
              <button
                key={t.value}
                onClick={() => onChange({ term: t.value })}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: `1px solid ${obj.term === t.value ? OBJECTIVE_TERM_COLORS[t.value] : "rgba(224,30,30,0.15)"}`,
                  background: obj.term === t.value ? `${OBJECTIVE_TERM_COLORS[t.value]}15` : "transparent",
                  color: obj.term === t.value ? OBJECTIVE_TERM_COLORS[t.value] : "rgba(245,237,237,0.3)",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <div>{t.label}</div>
                <div style={{ fontSize: 8, opacity: 0.7 }}>{t.sub}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <Field label="Type">
              <select
                value={obj.type}
                onChange={(e) => {
                  const t = OBJECTIVE_TYPES.find((x) => x.value === e.target.value);
                  onChange({ type: e.target.value, target_unit: t?.unit ?? "" });
                }}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                {OBJECTIVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Date cible">
              <input
                type="date"
                value={obj.target_date}
                onChange={(e) => onChange({ target_date: e.target.value })}
                style={inputStyle}
              />
            </Field>

            <Field label="Label">
              <input
                type="text"
                value={obj.label}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder={typeConfig?.label ?? "Objectif"}
                style={inputStyle}
              />
            </Field>

            {typeConfig?.unit && (
              <Field label={`Valeur cible (${typeConfig.unit})`}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="number"
                    value={obj.target_value ?? ""}
                    onChange={(e) => onChange({ target_value: parseFloat(e.target.value) || null })}
                    placeholder="0"
                    aria-label={`Valeur cible (${typeConfig.unit})`}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    value={obj.target_unit ?? typeConfig.unit}
                    onChange={(e) => onChange({ target_unit: e.target.value })}
                    aria-label="Unité"
                    style={{ ...inputStyle, width: 60 }}
                  />
                </div>
              </Field>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Description (facultatif)">
              <textarea
                value={obj.description ?? ""}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={2}
                style={{ ...inputStyle, resize: "none" }}
              />
            </Field>
            <div>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={obj.is_achieved}
                  onChange={(e) => onChange({
                    is_achieved: e.target.checked,
                    achieved_at: e.target.checked ? new Date().toISOString().split("T")[0] : null,
                  })}
                  style={{ accentColor: "#4ade80" }}
                />
                Objectif atteint
              </label>
              {obj.is_achieved && (
                <input
                  type="date"
                  value={obj.achieved_at ?? ""}
                  onChange={(e) => onChange({ achieved_at: e.target.value })}
                  aria-label="Date d'atteinte de l'objectif"
                  style={{ ...inputStyle, marginTop: 6 }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Duration helper ───────────────────────────────────────────────────────────

function durationLabel(start: string, end: string): string {
  if (!start || !end) return "";
  const days = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 86400000
  );
  if (days < 0) return "Dates invalides";
  const weeks = Math.round(days / 7);
  const months = (days / 30.44).toFixed(1);
  return `${days} jours · ~${weeks} semaines · ~${months} mois`;
}

// Local inline PhaseTimelineBar
//
// Idée "onglet Moi, Road Map" (2026-09-09) : sur une roadmap qui s'étend
// sur plusieurs mois voire années, rien n'indiquait où "aujourd'hui" tombe
// sur la frise — impossible de savoir en un coup d'oeil dans quelle phase
// on est sans comparer les dates à la main. Repère "aujourd'hui" ajouté en
// plus des segments de phase déjà là.
function PhaseTimelineBar({ phases, startDate, endDate }: {
  phases: Array<{ type: string; label: string; start_date: string; end_date: string; localId: string }>;
  startDate: string;
  endDate: string;
}) {
  // MASTERCLASS.md Axe E : lazy useState(Date.now()) plutôt que Date.now()
  // direct au rendu (impur) — un repère "aujourd'hui" n'a de toute façon
  // pas besoin d'être plus frais que le rendu initial de l'écran.
  const [now] = useState(() => Date.now());
  if (!startDate || !endDate || phases.length === 0) return null;
  const totalDays = Math.max(
    1,
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  );
  const todayOffset = (now - new Date(startDate).getTime()) / 86400000;
  const todayPct = todayOffset >= 0 && todayOffset <= totalDays ? (todayOffset / totalDays) * 100 : null;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", height: 24, borderRadius: 6, overflow: "hidden" }}>
        {phases.map((phase) => {
          const pStart = Math.max(
            0,
            (new Date(phase.start_date).getTime() - new Date(startDate).getTime()) / 86400000
          );
          const pEnd = Math.min(
            totalDays,
            (new Date(phase.end_date).getTime() - new Date(startDate).getTime()) / 86400000
          );
          const width = Math.max(0, ((pEnd - pStart) / totalDays) * 100);
          const c = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
          return (
            <div key={phase.localId} title={`${c.icon} ${phase.label}`} style={{
              width: `${width}%`, background: c.solid, opacity: 0.8,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, color: "#fff", overflow: "hidden",
              whiteSpace: "nowrap", borderRight: "1px solid rgba(0,0,0,0.2)",
            }}>
              {width > 8 ? `${c.icon}` : ""}
            </div>
          );
        })}
      </div>
      {todayPct != null && (
        <div
          title="Aujourd'hui"
          style={{
            position: "absolute", top: -3, bottom: -3, left: `${todayPct}%`,
            width: 2, background: "#fff", boxShadow: "0 0 4px rgba(255,255,255,0.8)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

// ── Editor body — shared by the coach editor and the client self-serve editor ──

export default function RoadmapEditor({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Vue globale visible par defaut — avant, la vraie vision multi-mois
  // (blocs de phase sur les semaines) etait cachee derriere un toggle et
  // seule la liste plate des cartes de phase etait visible d'emblee.
  const [showCalendar, setShowCalendar] = useState(true);
  const [existingRoadmap, setExistingRoadmap] = useState<Roadmap | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phases, setPhases] = useState<PhaseForm[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveForm[]>([]);

  // Accordéon (2026-08-19, retour direct : "regarde sur toute l'appli si tu
  // trouve des endroit où c'est mieux de mettre un bouton... pour pas que ya
  // trop de truc d'un coup"). Une phase/objectif fraîchement ajouté s'ouvre
  // automatiquement (voir addPhase/addObjective), les autres restent repliés
  // par défaut sur une roadmap déjà avancée plutôt que tout dérouler.
  const [openPhaseId, setOpenPhaseId] = useState<string | null>(null);
  const [openObjectiveId, setOpenObjectiveId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/roadmap/${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.roadmap) {
          setExistingRoadmap(data.roadmap);
          setStartDate(data.roadmap.start_date);
          setEndDate(data.roadmap.end_date);
          setPhases(
            (data.phases ?? []).map((p: RoadmapPhase) => ({ ...p, localId: p.id }))
          );
          setObjectives(
            (data.objectives ?? []).map((o: RoadmapObjective) => ({ ...o, localId: o.id }))
          );
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  function addPhase() {
    const lastEnd = phases[phases.length - 1]?.end_date ?? startDate;
    const nextStart = lastEnd
      ? new Date(new Date(lastEnd).getTime() + 86400000).toISOString().split("T")[0]
      : startDate;

    const localId = uid();
    setPhases((prev) => [
      ...prev,
      {
        localId,
        type: "maintenance",
        label: "Maintenance",
        start_date: nextStart,
        end_date: endDate || nextStart,
        notes: null,
        position: prev.length,
      },
    ]);
    setOpenPhaseId(localId);
  }

  function addObjective() {
    const localId = uid();
    setObjectives((prev) => [
      ...prev,
      {
        localId,
        type: "weight",
        term: "medium",
        label: "",
        target_date: endDate || new Date().toISOString().split("T")[0],
        target_value: null,
        target_unit: "kg",
        description: null,
        is_achieved: false,
        achieved_at: null,
      },
    ]);
    setOpenObjectiveId(localId);
  }

  async function handleSave() {
    setSaveError(null);
    if (!startDate || !endDate) {
      setSaveError("Renseigne les dates de début et de fin.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/roadmap/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          phases: phases.map(({ localId: _l, ...p }) => p),
          objectives: objectives.map(({ localId: _l, ...o }) => o),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setSaveError(data.error ?? "Erreur inconnue.");
      }
    } catch (e) {
      console.error(e);
      setSaveError("Erreur de sauvegarde.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <div style={{ animation: "shimmer 1.5s ease infinite", background: "#1A0101", borderRadius: 12, height: 40, marginBottom: 16 }} />
        <div style={{ animation: "shimmer 1.5s ease infinite", background: "#1A0101", borderRadius: 12, height: 200 }} />
      </div>
    );
  }

  const calendarRoadmap: Roadmap = existingRoadmap ?? {
    id: "preview",
    client_id: clientId,
    created_by: null,
    start_date: startDate,
    end_date: endDate,
    created_at: "",
    updated_at: "",
  };

  // Retour direct 2026-09-02 : "si je vais sur roadmap je veux pas le truc
  // de creation mais juste la roadmap" — dès qu'une roadmap existe déjà, la
  // vue d'ensemble (calendrier) passe en premier et devient ce qu'on voit en
  // ouvrant l'onglet ; le formulaire dates/phases/objectifs passe dans un
  // bloc repliable en dessous (même schéma que "Changer de programme").
  // Rien à cacher tant qu'il n'y a encore aucune roadmap : le formulaire de
  // création doit alors rester visible directement, il n'y a rien d'autre à
  // montrer.
  const hasRoadmap = !!existingRoadmap;

  const editForm = (
    <>
      {/* Section 1 — Global dates */}
      <section style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 12 }}>
          <CalendarRange size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Période globale
        </p>
        <div className="ep-card" style={{ padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
            <Field label="Date de début">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Date de fin">
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>
          {startDate && endDate && (
            <p style={{ fontSize: 12, color: "rgba(245,237,237,0.4)", fontWeight: 500 }}>
              📅 {durationLabel(startDate, endDate)}
            </p>
          )}
        </div>
      </section>

      {/* Calendar preview, seulement utile ici quand il n'y a pas encore de
          roadmap existante (sinon elle est déjà affichée en premier,
          au-dessus, voir plus bas) */}
      {!hasRoadmap && showCalendar && startDate && endDate && (
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 12 }}>
            Vue d&apos;ensemble : les phases sur les mois et les semaines
          </p>
          <div className="ep-card" style={{ padding: 20 }}>
            <RoadmapCalendar
              roadmap={calendarRoadmap}
              phases={phases.map((p, i) => ({ ...p, id: p.localId, roadmap_id: "", position: i }))}
              objectives={objectives.map((o) => ({ ...o, id: o.localId, roadmap_id: "" }))}
              clientId={clientId}
            />
          </div>
        </section>
      )}

      {/* Section 2 — Phases */}
      <section style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", margin: 0 }}>
            Phases d&apos;entraînement
            <span style={{ color: "rgba(245,237,237,0.3)", marginLeft: 8 }}>({phases.length})</span>
          </p>
          <button onClick={addPhase} className="ep-btn-primary" style={{ fontSize: 12 }}>
            <Plus size={13} /> Ajouter une phase
          </button>
        </div>

        {phases.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <PhaseTimelineBar phases={phases} startDate={startDate || phases[0]?.start_date} endDate={endDate || phases[phases.length - 1]?.end_date} />
          </div>
        )}

        {phases.length === 0 && (
          <div className="ep-card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ color: "rgba(245,237,237,0.3)", fontSize: 13 }}>
              Aucune phase. Clique sur « Ajouter une phase »
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {phases.map((phase, i) => (
            <PhaseCard
              key={phase.localId}
              phase={phase}
              index={i}
              onChange={(patch) =>
                setPhases((prev) =>
                  prev.map((p) => (p.localId === phase.localId ? { ...p, ...patch } : p))
                )
              }
              onDelete={() =>
                setPhases((prev) => prev.filter((p) => p.localId !== phase.localId))
              }
              open={openPhaseId === phase.localId}
              onToggle={() => setOpenPhaseId((prev) => (prev === phase.localId ? null : phase.localId))}
            />
          ))}
        </div>
      </section>

      {/* Section 3 — Objectives */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", margin: 0 }}>
            <Target size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            Objectifs
            <span style={{ color: "rgba(245,237,237,0.3)", marginLeft: 8 }}>({objectives.length})</span>
          </p>
          <button onClick={addObjective} className="ep-btn-primary" style={{ fontSize: 12 }}>
            <Plus size={13} /> Ajouter un objectif
          </button>
        </div>

        {objectives.length === 0 && (
          <div className="ep-card" style={{ padding: 32, textAlign: "center" }}>
            <p style={{ color: "rgba(245,237,237,0.3)", fontSize: 13 }}>
              Aucun objectif défini
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {objectives.map((obj) => (
            <ObjectiveCard
              key={obj.localId}
              obj={obj}
              onChange={(patch) =>
                setObjectives((prev) =>
                  prev.map((o) => (o.localId === obj.localId ? { ...o, ...patch } : o))
                )
              }
              onDelete={() =>
                setObjectives((prev) => prev.filter((o) => o.localId !== obj.localId))
              }
              open={openObjectiveId === obj.localId}
              onToggle={() => setOpenObjectiveId((prev) => (prev === obj.localId ? null : obj.localId))}
            />
          ))}
        </div>
      </section>

      {/* Save footer */}
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {saveError && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(224,30,30,0.08)", border: "1px solid rgba(224,30,30,0.25)",
              borderRadius: 8, padding: "10px 14px",
            }}
          >
            <AlertCircle size={13} style={{ color: "#E01E1E", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: "#FDC4C4" }}>{saveError}</p>
          </div>
        )}
        <button onClick={handleSave} disabled={saving} className="ep-btn-primary" style={{ fontSize: 14, padding: "14px 32px" }}>
          <Save size={16} />
          {saved ? "Sauvegardé !" : saving ? "Sauvegarde en cours…" : "Sauvegarder la road map"}
        </button>
      </div>
    </>
  );

  return (
    <div>
      {hasRoadmap && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="ep-btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
            >
              {showCalendar ? <EyeOff size={14} /> : <Eye size={14} />}
              {showCalendar ? "Masquer la vue d'ensemble" : "Vue d'ensemble"}
            </button>
          </div>

          {showCalendar && startDate && endDate && (
            <section style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 12 }}>
                Ma roadmap : les phases sur les mois et les semaines
              </p>
              <div className="ep-card" style={{ padding: 20 }}>
                <RoadmapCalendar
                  roadmap={calendarRoadmap}
                  phases={phases.map((p, i) => ({ ...p, id: p.localId, roadmap_id: "", position: i }))}
                  objectives={objectives.map((o) => ({ ...o, id: o.localId, roadmap_id: "" }))}
                  clientId={clientId}
                />
              </div>
            </section>
          )}

          <CollapsibleSection title="Modifier ma roadmap" defaultOpen={false}>
            {editForm}
          </CollapsibleSection>
        </>
      )}

      {!hasRoadmap && editForm}
    </div>
  );
}
