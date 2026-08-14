"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, AlertCircle, Check, Wand2, CalendarRange, Target } from "lucide-react";
import { uid, inputCls } from "@/components/ui/ProgramEditor";
import { PHASE_COLORS, OBJECTIVE_TERM_COLORS } from "@/lib/roadmap-colors";
import type {
  RoadmapTemplateWithDetails,
  RoadmapTemplateInput,
} from "@/utils/roadmap-templates";

// ── Local form types (mêmes conventions que ProgramTemplateEditor : champs
// numériques en string pour des inputs contrôlés, parsés à la sauvegarde) ──

interface PhaseRow {
  localId: string;
  type: string;
  label: string;
  start_week_offset: string;
  end_week_offset: string;
  notes: string;
}

interface MilestoneRow {
  localId: string;
  type: string;
  term: "short" | "medium" | "long";
  label: string;
  week_offset: string;
  target_value: string;
  target_unit: string;
  description: string;
}

const PHASE_TYPES = Object.entries(PHASE_COLORS).map(([key, val]) => ({
  value: key,
  label: val.label,
  icon: val.icon,
  solid: val.solid,
}));

const MILESTONE_TYPES = [
  { value: "weight", label: "Poids", unit: "kg" },
  { value: "measurement", label: "Mensuration", unit: "cm" },
  { value: "performance", label: "Performance", unit: "kg" },
  { value: "competition", label: "Compétition", unit: "" },
  { value: "phase_change", label: "Changement de phase", unit: "" },
  { value: "custom", label: "Personnalisé", unit: "" },
];

const TERM_OPTIONS = [
  { value: "short", label: "Court terme" },
  { value: "medium", label: "Moyen terme" },
  { value: "long", label: "Long terme" },
] as const;

function initFromTemplate(template: RoadmapTemplateWithDetails | null) {
  if (!template) {
    return {
      name: "",
      objective: "",
      duration_weeks: "12",
      notes: "",
      phases: [] as PhaseRow[],
      milestones: [] as MilestoneRow[],
    };
  }
  return {
    name: template.name,
    objective: template.objective ?? "",
    duration_weeks: template.duration_weeks != null ? String(template.duration_weeks) : "",
    notes: template.notes ?? "",
    phases: template.phases.map((p) => ({
      localId: uid(),
      type: p.type,
      label: p.label,
      start_week_offset: String(p.start_week_offset),
      end_week_offset: String(p.end_week_offset),
      notes: p.notes ?? "",
    })),
    milestones: template.milestones.map((m) => ({
      localId: uid(),
      type: m.type,
      term: m.term,
      label: m.label,
      week_offset: String(m.week_offset),
      target_value: m.target_value != null ? String(m.target_value) : "",
      target_unit: m.target_unit ?? "",
      description: m.description ?? "",
    })),
  };
}

export default function RoadmapTemplateEditor({
  templateId,
  template,
  saveRoadmapTemplate,
}: {
  templateId: string | null;
  template: RoadmapTemplateWithDetails | null;
  saveRoadmapTemplate: (
    templateId: string | null,
    input: RoadmapTemplateInput
  ) => Promise<{ id?: string; error?: string }>;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => initFromTemplate(template));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function updateMeta(field: "name" | "objective" | "duration_weeks" | "notes", value: string) {
    setState((s) => ({ ...s, [field]: value }));
  }

  // Génère un point de départ concret plutôt qu'un formulaire vide : une
  // phase couvrant toute la durée choisie, plus un jalon final à la dernière
  // semaine (l'objectif de fin de modèle). Le coach affine ensuite librement.
  function applyScaffold() {
    const weeks = Math.max(1, parseInt(state.duration_weeks) || 12);
    setState((s) => ({
      ...s,
      phases: [
        {
          localId: uid(),
          type: "custom",
          label: "Phase 1",
          start_week_offset: "0",
          end_week_offset: String(weeks),
          notes: "",
        },
      ],
      milestones: [
        {
          localId: uid(),
          type: "custom",
          term: "medium",
          label: "Objectif final",
          week_offset: String(weeks),
          target_value: "",
          target_unit: "",
          description: "",
        },
      ],
    }));
  }

  // ── Phase operations ─────────────────────────────────────────────────────

  function addPhase() {
    const weeks = Math.max(1, parseInt(state.duration_weeks) || 12);
    const lastEnd = state.phases[state.phases.length - 1]?.end_week_offset ?? "0";
    setState((s) => ({
      ...s,
      phases: [
        ...s.phases,
        {
          localId: uid(),
          type: "maintenance",
          label: "Nouvelle phase",
          start_week_offset: lastEnd,
          end_week_offset: String(Math.max(parseInt(lastEnd) || 0, weeks)),
          notes: "",
        },
      ],
    }));
  }

  function updatePhase(localId: string, patch: Partial<PhaseRow>) {
    setState((s) => ({
      ...s,
      phases: s.phases.map((p) => (p.localId === localId ? { ...p, ...patch } : p)),
    }));
  }

  function removePhase(localId: string) {
    setState((s) => ({ ...s, phases: s.phases.filter((p) => p.localId !== localId) }));
  }

  // ── Milestone operations ─────────────────────────────────────────────────

  function addMilestone() {
    const weeks = Math.max(1, parseInt(state.duration_weeks) || 12);
    setState((s) => ({
      ...s,
      milestones: [
        ...s.milestones,
        {
          localId: uid(),
          type: "custom",
          term: "medium",
          label: "",
          week_offset: String(weeks),
          target_value: "",
          target_unit: "",
          description: "",
        },
      ],
    }));
  }

  function updateMilestone(localId: string, patch: Partial<MilestoneRow>) {
    setState((s) => ({
      ...s,
      milestones: s.milestones.map((m) => (m.localId === localId ? { ...m, ...patch } : m)),
    }));
  }

  function removeMilestone(localId: string) {
    setState((s) => ({ ...s, milestones: s.milestones.filter((m) => m.localId !== localId) }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!state.name.trim()) {
      setError("Le nom du modèle est requis.");
      return;
    }

    const input: RoadmapTemplateInput = {
      name: state.name.trim(),
      objective: state.objective.trim() || null,
      duration_weeks: state.duration_weeks ? parseInt(state.duration_weeks) : null,
      notes: state.notes.trim() || null,
      phases: state.phases
        .filter((p) => p.label.trim() !== "")
        .map((p) => ({
          type: p.type,
          label: p.label.trim(),
          start_week_offset: parseInt(p.start_week_offset) || 0,
          end_week_offset: parseInt(p.end_week_offset) || 0,
          notes: p.notes.trim() || null,
        })),
      milestones: state.milestones
        .filter((m) => m.label.trim() !== "")
        .map((m) => ({
          type: m.type,
          term: m.term,
          label: m.label.trim(),
          week_offset: parseInt(m.week_offset) || 0,
          target_value: m.target_value !== "" ? parseFloat(m.target_value) : null,
          target_unit: m.target_unit.trim() || null,
          description: m.description.trim() || null,
        })),
    };

    setError(null);
    setSaving(true);
    const result = await saveRoadmapTemplate(templateId, input);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => {
        router.push("/dashboard/coach/programmation");
        router.refresh();
      }, 700);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Structure — phase de réflexion avant de lister le moindre jalon */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          1. Structure du modèle
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Nom du modèle
            </label>
            <input
              value={state.name}
              onChange={(e) => updateMeta("name", e.target.value)}
              placeholder="Ex. Prépa compétition 12 semaines" aria-label="Ex. Prépa compétition 12 semaines"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
              Durée totale (semaines)
            </label>
            <input
              type="number"
              min="1"
              max="104"
              value={state.duration_weeks}
              onChange={(e) => updateMeta("duration_weeks", e.target.value)}
              placeholder="Ex. 12" aria-label="Ex. 12"
              className={inputCls}
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Objectif du modèle
          </label>
          <input
            value={state.objective}
            onChange={(e) => updateMeta("objective", e.target.value)}
            placeholder="Ex. Perte de poids progressive, débutant · Prépa compétition physique" aria-label="Ex. Perte de poids progressive, débutant · Prépa compétition physique"
            className={inputCls}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block">
            Notes de conception <span className="text-[#F5EDED]/25 font-normal">(privé, jamais montré au client)</span>
          </label>
          <textarea
            value={state.notes}
            onChange={(e) => updateMeta("notes", e.target.value)}
            rows={2}
            placeholder="Ex. adapter la durée de la phase de cut selon le point de départ du client…" aria-label="Ex. adapter la durée de la phase de cut selon le point de départ du client…"
            className={`${inputCls} resize-none`}
          />
        </div>

        {state.phases.length === 0 && (
          <button
            onClick={applyScaffold}
            className="mt-4 inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            <Wand2 size={13} />
            Générer une phase de départ sur toute la durée
          </button>
        )}
      </div>

      {/* Phases */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 flex items-center gap-1.5">
            <CalendarRange size={12} />
            2. Phases <span className="text-[#F5EDED]/25">({state.phases.length})</span>
          </p>
          <button
            onClick={addPhase}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
          >
            <Plus size={12} /> Ajouter une phase
          </button>
        </div>

        {state.phases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl gap-2 text-center px-6">
            <p className="text-xs text-[#F5EDED]/35">
              Aucune phase pour l&apos;instant. Génère un point de départ ci-dessus ou ajoute une phase vide.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.phases.map((phase, i) => {
              const colors = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
              return (
                <div key={phase.localId} className="bg-[#1f0101] border rounded-xl p-4" style={{ borderColor: colors.border }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">{colors.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.solid }}>
                      Phase {i + 1}
                    </span>
                    <button
                      onClick={() => removePhase(phase.localId)}
                      className="ml-auto text-[#F5EDED]/25 hover:text-red-500 transition-colors"
                      title="Supprimer la phase" aria-label="Supprimer la phase"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Type
                      </label>
                      <select aria-label="Type"
                        value={phase.type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          const newLabel =
                            PHASE_COLORS[newType as keyof typeof PHASE_COLORS]?.label ?? phase.label;
                          updatePhase(phase.localId, { type: newType, label: newLabel });
                        }}
                        className={inputCls}
                      >
                        {PHASE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.icon} {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Label
                      </label>
                      <input aria-label="Label"
                        value={phase.label}
                        onChange={(e) => updatePhase(phase.localId, { label: e.target.value })}
                        placeholder={colors.label}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Semaine de début
                      </label>
                      <input aria-label="Semaine de début"
                        type="number"
                        min="0"
                        value={phase.start_week_offset}
                        onChange={(e) => updatePhase(phase.localId, { start_week_offset: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Semaine de fin
                      </label>
                      <input aria-label="Semaine de fin"
                        type="number"
                        min="0"
                        value={phase.end_week_offset}
                        onChange={(e) => updatePhase(phase.localId, { end_week_offset: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <textarea
                    value={phase.notes}
                    onChange={(e) => updatePhase(phase.localId, { notes: e.target.value })}
                    placeholder="Notes (optionnel)" aria-label="Notes (optionnel)"
                    rows={1}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Milestones (jalons / objectifs) */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 flex items-center gap-1.5">
            <Target size={12} />
            3. Jalons <span className="text-[#F5EDED]/25">({state.milestones.length})</span>
          </p>
          <button
            onClick={addMilestone}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
          >
            <Plus size={12} /> Ajouter un jalon
          </button>
        </div>

        {state.milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl gap-2 text-center px-6">
            <p className="text-xs text-[#F5EDED]/35">Aucun jalon pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.milestones.map((m) => {
              const typeConfig = MILESTONE_TYPES.find((t) => t.value === m.type);
              return (
                <div key={m.localId} className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4">
                  <div className="flex gap-1.5 mb-3">
                    {TERM_OPTIONS.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => updateMilestone(m.localId, { term: t.value })}
                        className="flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-colors"
                        style={{
                          borderColor: m.term === t.value ? OBJECTIVE_TERM_COLORS[t.value] : "rgba(137,4,4,0.2)",
                          background: m.term === t.value ? `${OBJECTIVE_TERM_COLORS[t.value]}18` : "transparent",
                          color: m.term === t.value ? OBJECTIVE_TERM_COLORS[t.value] : "rgba(245,237,237,0.35)",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                    <button
                      onClick={() => removeMilestone(m.localId)}
                      className="px-2 text-[#F5EDED]/25 hover:text-red-500 transition-colors"
                      title="Supprimer le jalon" aria-label="Supprimer le jalon"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Type
                      </label>
                      <select aria-label="Type"
                        value={m.type}
                        onChange={(e) => {
                          const t = MILESTONE_TYPES.find((x) => x.value === e.target.value);
                          updateMilestone(m.localId, { type: e.target.value, target_unit: t?.unit ?? "" });
                        }}
                        className={inputCls}
                      >
                        {MILESTONE_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Semaine cible
                      </label>
                      <input aria-label="Semaine cible"
                        type="number"
                        min="0"
                        value={m.week_offset}
                        onChange={(e) => updateMilestone(m.localId, { week_offset: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                        Label
                      </label>
                      <input aria-label="Label"
                        value={m.label}
                        onChange={(e) => updateMilestone(m.localId, { label: e.target.value })}
                        placeholder={typeConfig?.label ?? "Jalon"}
                        className={inputCls}
                      />
                    </div>
                    {typeConfig?.unit && (
                      <div>
                        <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                          Valeur cible ({typeConfig.unit})
                        </label>
                        <div className="flex gap-1.5">
                          <input
                            type="number"
                            value={m.target_value}
                            onChange={(e) => updateMilestone(m.localId, { target_value: e.target.value })}
                            placeholder="0" aria-label="0"
                            className={inputCls}
                          />
                          <input
                            value={m.target_unit || typeConfig.unit}
                            onChange={(e) => updateMilestone(m.localId, { target_unit: e.target.value })}
                            aria-label="Unité"
                            className={`${inputCls} w-16 flex-shrink-0`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <textarea
                    value={m.description}
                    onChange={(e) => updateMilestone(m.localId, { description: e.target.value })}
                    placeholder="Description (optionnel)" aria-label="Description (optionnel)"
                    rows={1}
                    className={`${inputCls} resize-none`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2.5 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#890404]/15">
        <button
          onClick={() => router.back()}
          className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 px-4 py-2.5 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved ? "bg-green-800/60 border border-green-600/30" : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60"
          }`}
        >
          {saved ? (
            <>
              <Check size={13} />
              Sauvegardé
            </>
          ) : saving ? (
            "Sauvegarde…"
          ) : (
            "Sauvegarder le modèle"
          )}
        </button>
      </div>
    </div>
  );
}
