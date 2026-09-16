"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
} from "lucide-react";
import type {
  CoachNote,
  KeyDecision,
  CoachNoteInput,
  KeyDecisionInput,
} from "@/utils/notes";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

// ── Constants ────────────────────────────────────────────────────────────────

const PHASES = ["déficit", "maintenance", "surplus"] as const;

const PHASE_COLORS: Record<string, string> = {
  déficit: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  maintenance: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  surplus: "bg-green-500/15 text-green-400 border-green-500/25",
};

const DECISION_TYPES = ["nutrition", "programme", "stratégie", "autre"] as const;

const DECISION_TYPE_COLORS: Record<string, string> = {
  nutrition: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  programme: "bg-green-500/15 text-green-400 border-green-500/25",
  "stratégie": "bg-purple-500/15 text-purple-400 border-purple-500/25",
  autre: "bg-[#F5EDED]/10 text-[#F5EDED]/40 border-[#F5EDED]/15",
};

const RATING_COLORS: Record<number, string> = {
  1: "bg-red-700", 2: "bg-red-600", 3: "bg-red-500", 4: "bg-orange-500",
  5: "bg-amber-500", 6: "bg-yellow-500", 7: "bg-lime-500",
  8: "bg-green-500", 9: "bg-green-600", 10: "bg-emerald-500",
};

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls =
  "text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 block";
const textareaCls = inputCls + " resize-none";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

function PhaseBadge({ phase }: { phase: string | null }) {
  if (!phase) return null;
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${PHASE_COLORS[phase] ?? "bg-[#F5EDED]/10 text-[#F5EDED]/40 border-[#F5EDED]/15"}`}
    >
      {phase}
    </span>
  );
}

function RatingBadge({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span
      className={`text-[9px] font-black px-2 py-0.5 rounded-full text-white ${RATING_COLORS[rating] ?? "bg-[#F5EDED]/20"}`}
    >
      {rating}/10
    </span>
  );
}

// ── Weekly Note Form ──────────────────────────────────────────────────────────

interface NoteFormState {
  phase: string;
  weight: string;
  weight_variation: string;
  observations: string;
  nutrition_adjustments: string;
  program_adjustments: string;
  next_actions: string;
  rating: number | null;
}

function emptyNoteForm(note?: CoachNote | null): NoteFormState {
  if (!note) {
    return {
      phase: "maintenance",
      weight: "",
      weight_variation: "",
      observations: "",
      nutrition_adjustments: "",
      program_adjustments: "",
      next_actions: "",
      rating: null,
    };
  }
  return {
    phase: note.phase ?? "maintenance",
    weight: note.weight != null ? String(note.weight) : "",
    weight_variation: note.weight_variation != null ? String(note.weight_variation) : "",
    observations: note.observations ?? "",
    nutrition_adjustments: note.nutrition_adjustments ?? "",
    program_adjustments: note.program_adjustments ?? "",
    next_actions: note.next_actions ?? "",
    rating: note.rating,
  };
}

function WeeklyNoteForm({
  clientId,
  weekStart,
  weekNumber,
  currentNote,
  prevNoteWeight,
  saveNote,
}: {
  clientId: string;
  weekStart: string;
  weekNumber: number;
  currentNote: CoachNote | null;
  prevNoteWeight: number | null;
  saveNote: (clientId: string, noteId: string | null, data: CoachNoteInput) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<NoteFormState>(() => emptyNoteForm(currentNote));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof NoteFormState>(key: K, value: NoteFormState[K]) {
    setForm((p) => {
      const next = { ...p, [key]: value };
      // Auto-calculate variation when weight changes
      if (key === "weight" && prevNoteWeight != null) {
        const w = parseFloat(value as string);
        if (!isNaN(w)) {
          next.weight_variation = (w - prevNoteWeight).toFixed(1);
        }
      }
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    const data: CoachNoteInput = {
      week_start: weekStart,
      week_number: weekNumber,
      phase: form.phase || null,
      weight: form.weight ? parseFloat(form.weight) : null,
      weight_variation: form.weight_variation ? parseFloat(form.weight_variation) : null,
      observations: form.observations.trim() || null,
      nutrition_adjustments: form.nutrition_adjustments.trim() || null,
      program_adjustments: form.program_adjustments.trim() || null,
      next_actions: form.next_actions.trim() || null,
      rating: form.rating,
    };

    const result = await saveNote(clientId, currentNote?.id ?? null, data);
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  }

  const isEditing = !!currentNote;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
          Semaine {weekNumber} : {formatDate(weekStart)}
        </p>
        {isEditing && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] bg-[#E01E1E]/10 border border-[#E01E1E]/25 px-2 py-0.5 rounded-full">
            Édition
          </span>
        )}
      </div>

      {/* Phase + Poids */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Phase</label>
          <select aria-label="Phase"
            value={form.phase}
            onChange={(e) => set("phase", e.target.value)}
            className={inputCls}
          >
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Poids observé (kg)</label>
          <input
            type="number"
            step="0.1"
            value={form.weight}
            onChange={(e) => set("weight", e.target.value)}
            placeholder="80.0" aria-label="80.0"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Variation vs S-1</label>
          <input aria-label="Variation vs S-1"
            type="number"
            step="0.1"
            value={form.weight_variation}
            onChange={(e) => set("weight_variation", e.target.value)}
            placeholder={prevNoteWeight ? `réf. ${prevNoteWeight} kg` : "±0.0"}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Note globale /10</label>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => set("rating", form.rating === n ? null : n)}
                className={`w-7 h-7 rounded text-[10px] font-black transition-colors ${
                  form.rating === n
                    ? `${RATING_COLORS[n]} text-white`
                    : "bg-[#150000] border border-[#890404]/30 text-[#F5EDED]/40 hover:text-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Textareas */}
      {(
        [
          { key: "observations" as const, label: "Observations générales" },
          { key: "nutrition_adjustments" as const, label: "Ajustements nutrition" },
          { key: "program_adjustments" as const, label: "Ajustements programme" },
          { key: "next_actions" as const, label: "Actions semaine prochaine" },
        ] as const
      ).map(({ key, label }) => (
        <div key={key}>
          <label className={labelCls}>{label}</label>
          <textarea
            rows={3}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
            placeholder="…" aria-label="…"
            className={textareaCls}
          />
        </div>
      ))}

      {error && (
        <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-lg px-4 py-2.5">
          <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`inline-flex items-center gap-2 text-white text-xs font-bold uppercase tracking-widest px-6 py-2.5 rounded-lg transition-colors ${
            saved
              ? "bg-green-800/60 border border-green-600/30"
              : "bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-60"
          }`}
        >
          {saved ? <><Check size={13} /> Enregistré</> : saving ? "Enregistrement…" : "Enregistrer la note"}
        </button>
      </div>
    </div>
  );
}

// ── Note History ──────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: CoachNote }) {
  const [expanded, setExpanded] = useState(false);

  const fields = [
    { label: "Observations", value: note.observations },
    { label: "Ajustements nutrition", value: note.nutrition_adjustments },
    { label: "Ajustements programme", value: note.program_adjustments },
    { label: "Actions prochaine semaine", value: note.next_actions },
  ].filter((f) => f.value);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#890404]/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">
            S{note.week_number ?? "?"}
          </span>
          <span className="text-xs text-[#F5EDED]/40">
            {formatDate(note.week_start)}
          </span>
          {note.weight != null && (
            <span className="text-[10px] text-[#F5EDED]/50">
              {note.weight} kg
              {note.weight_variation != null && (
                <span
                  className={`ml-1 font-semibold ${note.weight_variation < 0 ? "text-blue-400" : note.weight_variation > 0 ? "text-amber-400" : "text-[#F5EDED]/40"}`}
                >
                  ({note.weight_variation > 0 ? "+" : ""}
                  {note.weight_variation})
                </span>
              )}
            </span>
          )}
          <PhaseBadge phase={note.phase} />
          <RatingBadge rating={note.rating} />
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[#F5EDED]/30 flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-[#F5EDED]/30 flex-shrink-0" />
        )}
      </button>

      {expanded && fields.length > 0 && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#890404]/15">
          {fields.map(({ label, value }) => (
            <div key={label}>
              <p className={labelCls + " mt-3"}>{label}</p>
              <p className="text-sm text-[#F5EDED]/75 whitespace-pre-wrap leading-relaxed">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Key Decision Form ─────────────────────────────────────────────────────────

function KeyDecisionForm({
  clientId,
  saveDecision,
}: {
  clientId: string;
  saveDecision: (clientId: string, data: KeyDecisionInput) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    decision_date: today,
    type: "nutrition",
    decision: "",
    reason: "",
    result: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function set(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    if (!form.decision.trim()) {
      setError("La décision est obligatoire.");
      return;
    }
    setError(null);
    setSaving(true);

    const result = await saveDecision(clientId, {
      decision_date: form.decision_date,
      type: form.type || null,
      decision: form.decision.trim(),
      reason: form.reason.trim() || null,
      result: form.result.trim() || null,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setForm({ decision_date: today, type: "nutrition", decision: "", reason: "", result: "" });
      setOpen(false);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={13} />
          Ajouter une décision
        </button>
      ) : (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5 space-y-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
            Nouvelle décision clé
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Date</label>
              <input aria-label="Date"
                type="date"
                value={form.decision_date}
                onChange={(e) => set("decision_date", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select aria-label="Type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                className={inputCls}
              >
                {DECISION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Décision *</label>
            <textarea
              rows={2}
              value={form.decision}
              onChange={(e) => set("decision", e.target.value)}
              placeholder="Ex. Passer de 2000 à 1800 kcal/j suite à plateau" aria-label="Décision"
              className={textareaCls}
            />
          </div>
          <div>
            <label className={labelCls}>Raison</label>
            <textarea
              rows={2}
              value={form.reason}
              onChange={(e) => set("reason", e.target.value)}
              placeholder="Pourquoi cette décision ?" aria-label="Pourquoi cette décision ?"
              className={textareaCls}
            />
          </div>
          <div>
            <label className={labelCls}>Résultat observé (facultatif)</label>
            <textarea
              rows={2}
              value={form.result}
              onChange={(e) => set("result", e.target.value)}
              placeholder="Résultat après mise en place…" aria-label="Résultat après mise en place…"
              className={textareaCls}
            />
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 px-4 py-2 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg disabled:opacity-60 transition-colors"
            >
              {saved ? <><Check size={13} /> Ajouté</> : saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Decision Card ─────────────────────────────────────────────────────────────

function DecisionCard({
  decision,
  clientId,
  deleteDecision,
}: {
  decision: KeyDecision;
  clientId: string;
  deleteDecision: (clientId: string, id: string) => Promise<{ error?: string }>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (!(await confirm("Supprimer cette décision ?"))) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteDecision(clientId, decision.id);
    setDeleting(false);
    if (result.error) {
      setDeleteError(result.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3">
        <button
          onClick={() => setExpanded((e) => !e)}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-[#F5EDED]/35">
              {formatDate(decision.decision_date)}
            </span>
            {decision.type && (
              <span
                className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${DECISION_TYPE_COLORS[decision.type] ?? ""}`}
              >
                {decision.type}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white leading-snug">
            {decision.decision}
          </p>
          {expanded && decision.reason && (
            <div className="mt-2">
              <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold mb-0.5">
                Raison
              </p>
              <p className="text-xs text-[#F5EDED]/60">{decision.reason}</p>
            </div>
          )}
          {expanded && decision.result && (
            <div className="mt-2">
              <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest font-semibold mb-0.5">
                Résultat observé
              </p>
              <p className="text-xs text-[#F5EDED]/60">{decision.result}</p>
            </div>
          )}
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Réduire" : "Développer"}
            aria-expanded={expanded}
            className="text-[#F5EDED]/25 hover:text-[#F5EDED]/60 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            aria-label="Supprimer"
            className="text-[#F5EDED]/20 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {deleteError && (
        <p className="px-4 pb-3 text-xs text-red-400">{deleteError}</p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const INITIAL_NOTES_SHOWN = 5;

interface Props {
  clientId: string;
  weekStart: string;
  weekNumber: number;
  notes: CoachNote[];
  decisions: KeyDecision[];
  currentWeekNote: CoachNote | null;
  prevNoteWeight: number | null;
  saveNote: (clientId: string, noteId: string | null, data: CoachNoteInput) => Promise<{ error?: string }>;
  saveDecision: (clientId: string, data: KeyDecisionInput) => Promise<{ error?: string }>;
  deleteDecision: (clientId: string, decisionId: string) => Promise<{ error?: string }>;
}

export default function CoachNotesView({
  clientId,
  weekStart,
  weekNumber,
  notes,
  decisions,
  currentWeekNote,
  prevNoteWeight,
  saveNote,
  saveDecision,
  deleteDecision,
}: Props) {
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<"journal" | "decisions">("journal");

  const pastNotes = notes.filter((n) => n.week_start !== weekStart);
  const visibleNotes = showAllNotes
    ? pastNotes
    : pastNotes.slice(0, INITIAL_NOTES_SHOWN);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#890404]/20">
        {(["journal", "decisions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px ${
              activeTab === tab
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {tab === "journal"
              ? `Journal (${notes.length})`
              : `Décisions (${decisions.length})`}
          </button>
        ))}
      </div>

      {/*
        `hidden` plutôt qu'un rendu conditionnel `{activeTab === "x" && ...}`
        sur les deux onglets ci-dessous : même bug de démontage React que
        MASTERCLASS.md Axe CB. WeeklyNoteForm et KeyDecisionForm sont des
        formulaires multi-champs (texte libre inclus) qu'on peut remplir en
        cours de rédaction ; basculer entre "Journal" et "Décisions"
        démontait celui resté ouvert et perdait la saisie. Pas de fetch
        réseau au montage de ces deux composants.
      */}
      {/* ── JOURNAL TAB ────────────────────────────────────────────────── */}
      <div hidden={activeTab !== "journal"}>
        <div className="space-y-6">
          {/* Current week form */}
          <WeeklyNoteForm
            clientId={clientId}
            weekStart={weekStart}
            weekNumber={weekNumber}
            currentNote={currentWeekNote}
            prevNoteWeight={prevNoteWeight}
            saveNote={saveNote}
          />

          {/* Past notes */}
          {pastNotes.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
                Historique
              </p>
              <div className="space-y-2">
                {visibleNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
              {pastNotes.length > INITIAL_NOTES_SHOWN && (
                <button
                  onClick={() => setShowAllNotes((s) => !s)}
                  className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
                >
                  {showAllNotes ? (
                    <><ChevronUp size={13} /> Réduire</>
                  ) : (
                    <><ChevronDown size={13} /> Voir tout ({pastNotes.length} semaines)</>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── DECISIONS TAB ──────────────────────────────────────────────── */}
      <div hidden={activeTab !== "decisions"}>
        <div className="space-y-4">
          <KeyDecisionForm
            clientId={clientId}
            saveDecision={saveDecision}
          />

          {decisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-12 px-6 bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl text-center">
              <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
                Aucune décision enregistrée
              </p>
              {/* Item 40 : le formulaire juste au-dessus suffit à comprendre
                  quoi faire, mais un mot sur l'utilité évite de se demander
                  si "décision" a un sens précis ici. */}
              <p className="text-[11px] text-[#F5EDED]/22 max-w-xs leading-relaxed">
                Sert à garder une trace des choix structurants pour ce client (changement de phase, ajustement
                majeur...), pas un journal de suivi au quotidien.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {decisions.map((d) => (
                <DecisionCard
                  key={d.id}
                  decision={d}
                  clientId={clientId}
                  deleteDecision={deleteDecision}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
