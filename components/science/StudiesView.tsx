"use client";

import { useState } from "react";
import { FlaskConical, Plus, X, Pencil, Trash2 } from "lucide-react";
import { STUDY_STATUS_LABELS, type ScienceStudy } from "@/utils/science-types";
import type { StudyInput } from "@/app/dashboard/client/science/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

const STATUS_COLORS: Record<ScienceStudy["status"], string> = {
  idee: "bg-[#150000] border-[#890404]/25 text-[#F5EDED]/45",
  en_cours: "bg-amber-500/10 border-amber-500/25 text-amber-300",
  terminee: "bg-green-500/10 border-green-500/25 text-green-300",
};

function StudyForm({ initial, onSave, onCancel }: {
  initial?: ScienceStudy;
  onSave: (input: StudyInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [hypothesis, setHypothesis] = useState(initial?.hypothesis ?? "");
  const [protocol, setProtocol] = useState(initial?.protocol ?? "");
  const [status, setStatus] = useState<ScienceStudy["status"]>(initial?.status ?? "idee");
  const [participantCount, setParticipantCount] = useState(initial?.participant_count?.toString() ?? "");
  const [startDate, setStartDate] = useState(initial?.start_date ?? "");
  const [endDate, setEndDate] = useState(initial?.end_date ?? "");
  const [results, setResults] = useState(initial?.results ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim()) { setError("Le titre est requis."); return; }
    setSaving(true);
    setError(null);
    await onSave({
      title: title.trim(),
      hypothesis: hypothesis.trim() || null,
      protocol: protocol.trim() || null,
      status,
      participant_count: participantCount ? parseInt(participantCount, 10) : null,
      start_date: startDate || null,
      end_date: endDate || null,
      results: results.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <div>
        <label className={labelCls}>Titre de l&apos;étude</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Impact du volume d'entraînement sur la prise de masse à 8 semaines" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Hypothèse</label>
        <textarea value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label className={labelCls}>Protocole / méthodologie</label>
        <textarea value={protocol} onChange={(e) => setProtocol(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Statut</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as ScienceStudy["status"])} className={inputCls}>
            {Object.entries(STUDY_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Participants</label>
          <input type="number" min="0" value={participantCount} onChange={(e) => setParticipantCount(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date de début</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Date de fin</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Résultats (optionnel)</label>
        <textarea value={results} onChange={(e) => setResults(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Créer l'étude"}
        </button>
        <button onClick={onCancel} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function StudyCard({ study, isCoach, onUpdate, onDelete }: {
  study: ScienceStudy;
  isCoach: boolean;
  onUpdate: (input: StudyInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return <StudyForm initial={study} onSave={async (input) => { await onUpdate(input); setEditing(false); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-4 py-3.5">
        <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border mb-1.5 ${STATUS_COLORS[study.status]}`}>
          {STUDY_STATUS_LABELS[study.status]}
        </span>
        <p className="text-sm font-bold text-white leading-snug">{study.title}</p>
        {study.participant_count != null && (
          <p className="text-[10px] text-[#F5EDED]/35 mt-1">{study.participant_count} participant{study.participant_count > 1 ? "s" : ""}</p>
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-2">
          {study.hypothesis && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-0.5">Hypothèse</p>
              <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{study.hypothesis}</p>
            </div>
          )}
          {study.protocol && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-0.5">Protocole</p>
              <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{study.protocol}</p>
            </div>
          )}
          {study.results && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-0.5">Résultats</p>
              <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{study.results}</p>
            </div>
          )}
          {isCoach && (
            <div className="flex gap-2 pt-2 border-t border-[#890404]/10">
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
                <Pencil size={11} /> Modifier
              </button>
              {confirmDelete ? (
                <button onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest text-red-400">Confirmer la suppression</button>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors ml-auto">
                  <Trash2 size={11} /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudiesView({
  studies: initial,
  isCoach,
  createStudy,
  updateStudy,
  deleteStudy,
}: {
  studies: ScienceStudy[];
  isCoach: boolean;
  createStudy: (input: StudyInput) => Promise<{ error?: string; id?: string }>;
  updateStudy: (id: string, input: Partial<StudyInput>) => Promise<{ error?: string }>;
  deleteStudy: (id: string) => Promise<{ error?: string }>;
}) {
  const [studies, setStudies] = useState(initial);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
        <p className="text-sm text-[#F5EDED]/55 leading-relaxed">
          Nos propres études, menées à l&apos;échelle de la communauté EP Coaching : on teste des protocoles
          sur nos membres pour valider (ou réfuter) ce que dit la littérature dans des conditions réelles.
        </p>
      </div>

      {isCoach && (
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg transition-colors"
        >
          <Plus size={13} /> {showCreate ? "Fermer" : "Nouvelle étude"}
        </button>
      )}

      {showCreate && (
        <StudyForm
          onSave={async (input) => {
            const result = await createStudy(input);
            if (!result.error) {
              setStudies((prev) => [
                { ...input, id: result.id ?? `optimistic-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as ScienceStudy,
                ...prev,
              ]);
              setShowCreate(false);
            }
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="space-y-2">
        {studies.map((s) => (
          <StudyCard
            key={s.id}
            study={s}
            isCoach={isCoach}
            onUpdate={async (input) => {
              await updateStudy(s.id, input);
              setStudies((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...input } : x)));
            }}
            onDelete={async () => {
              await deleteStudy(s.id);
              setStudies((prev) => prev.filter((x) => x.id !== s.id));
            }}
          />
        ))}
        {studies.length === 0 && (
          <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
            <FlaskConical size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#F5EDED]/35">Aucune étude interne pour l&apos;instant.</p>
          </div>
        )}
      </div>
    </div>
  );
}
