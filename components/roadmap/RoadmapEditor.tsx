"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Save, Eye, EyeOff, Target, CalendarRange } from "lucide-react";
import { PHASE_COLORS, OBJECTIVE_TERM_COLORS } from "@/lib/roadmap-colors";
import RoadmapCalendar from "@/components/roadmap/RoadmapCalendar";
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={labelStyle}>{label}</span>
      {children}
    </div>
  );
}

// ── Phase card ────────────────────────────────────────────────────────────────

function PhaseCard({
  phase,
  index,
  onChange,
  onDelete,
}: {
  phase: PhaseForm;
  index: number;
  onChange: (patch: Partial<PhaseForm>) => void;
  onDelete: () => void;
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{colors.icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
          textTransform: "uppercase", color: colors.solid,
        }}>
          Phase {index + 1}
        </span>
        <button
          onClick={onDelete}
          style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(224,30,30,0.4)", padding: 4 }}
          title="Supprimer la phase"
        >
          <Trash2 size={14} />
        </button>
      </div>

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
          placeholder="Objectifs spécifiques à cette phase…"
          rows={2}
          style={{ ...inputStyle, resize: "none" }}
        />
      </Field>
    </div>
  );
}

// ── Objective card ────────────────────────────────────────────────────────────

function ObjectiveCard({
  obj,
  onChange,
  onDelete,
}: {
  obj: ObjectiveForm;
  onChange: (patch: Partial<ObjectiveForm>) => void;
  onDelete: () => void;
}) {
  const typeConfig = OBJECTIVE_TYPES.find((t) => t.value === obj.type);

  return (
    <div style={{
      background: "linear-gradient(135deg, #1A0101 0%, #0D0000 100%)",
      border: "1px solid rgba(224,30,30,0.15)",
      borderRadius: 12,
      padding: 16,
    }}>
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
        <button
          onClick={onDelete}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(224,30,30,0.4)", padding: "0 4px" }}
        >
          <Trash2 size={13} />
        </button>
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
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="text"
                value={obj.target_unit ?? typeConfig.unit}
                onChange={(e) => onChange({ target_unit: e.target.value })}
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
              style={{ ...inputStyle, marginTop: 6 }}
            />
          )}
        </div>
      </div>
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
function PhaseTimelineBar({ phases, startDate, endDate }: {
  phases: Array<{ type: string; label: string; start_date: string; end_date: string; localId: string }>;
  startDate: string;
  endDate: string;
}) {
  if (!startDate || !endDate || phases.length === 0) return null;
  const totalDays = Math.max(
    1,
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
  );
  return (
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
  );
}

// ── Editor body — shared by the coach editor and the client self-serve editor ──

export default function RoadmapEditor({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Vue globale visible par defaut — avant, la vraie vision multi-mois
  // (blocs de phase sur les semaines) etait cachee derriere un toggle et
  // seule la liste plate des cartes de phase etait visible d'emblee.
  const [showCalendar, setShowCalendar] = useState(true);
  const [existingRoadmap, setExistingRoadmap] = useState<Roadmap | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phases, setPhases] = useState<PhaseForm[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveForm[]>([]);

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

    setPhases((prev) => [
      ...prev,
      {
        localId: uid(),
        type: "maintenance",
        label: "Maintenance",
        start_date: nextStart,
        end_date: endDate || nextStart,
        notes: null,
        position: prev.length,
      },
    ]);
  }

  function addObjective() {
    setObjectives((prev) => [
      ...prev,
      {
        localId: uid(),
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
  }

  async function handleSave() {
    if (!startDate || !endDate) {
      alert("Renseigne les dates de début et de fin.");
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
        alert("Erreur : " + (data.error ?? "inconnue"));
      }
    } catch (e) {
      console.error(e);
      alert("Erreur de sauvegarde.");
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setShowCalendar((v) => !v)}
          className="ep-btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
        >
          {showCalendar ? <EyeOff size={14} /> : <Eye size={14} />}
          {showCalendar ? "Masquer la vue d'ensemble" : "Vue d'ensemble"}
        </button>
        <button onClick={handleSave} disabled={saving} className="ep-btn-primary">
          <Save size={14} />
          {saved ? "Sauvegardé !" : saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
      </div>

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

      {/* Calendar preview */}
      {showCalendar && startDate && endDate && (
        <section style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(224,30,30,0.6)", marginBottom: 12 }}>
            Vue d&apos;ensemble — les phases sur les mois et les semaines
          </p>
          <div className="ep-card" style={{ padding: 20 }}>
            <RoadmapCalendar
              roadmap={calendarRoadmap}
              phases={phases.map((p, i) => ({ ...p, id: p.localId, roadmap_id: "", position: i }))}
              objectives={objectives.map((o) => ({ ...o, id: o.localId, roadmap_id: "" }))}
              clientId={clientId}
              readOnly={false}
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
            />
          ))}
        </div>
      </section>

      {/* Save footer */}
      <div style={{ marginTop: 32, display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSave} disabled={saving} className="ep-btn-primary" style={{ fontSize: 14, padding: "14px 32px" }}>
          <Save size={16} />
          {saved ? "Sauvegardé !" : saving ? "Sauvegarde en cours…" : "Sauvegarder la road map"}
        </button>
      </div>
    </div>
  );
}
