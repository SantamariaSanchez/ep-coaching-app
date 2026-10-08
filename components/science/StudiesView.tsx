"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useEffect } from "react";
import { FlaskConical, Plus, X, Pencil, Trash2, Lock, Users, LogOut, Lightbulb } from "lucide-react";
import { STUDY_STATUS_LABELS, type ScienceStudy } from "@/utils/science-types";
import { FEATURE_UNLOCK_POINTS } from "@/lib/gamification-types";
import type { StudyInput } from "@/app/dashboard/client/science/actions";

// Pas de faux protocole en base pour amorcer la liste (une étude engage la
// crédibilité du coach, ça ne se devine pas) — juste des pistes concrètes
// pour montrer ce qu'on peut faire d'un questionnement de coach une fois
// formalisé en protocole testable sur la communauté.
const EXAMPLE_PROMPTS = [
  "Mes clients qui font du cardio à jeun perdent-ils du gras plus vite que ceux qui mangent avant ?",
  "Une semaine de décharge toutes les 6 semaines change-t-elle vraiment la progression à 3 mois ?",
  "Le suivi du sommeil via tracker améliore-t-il la récupération perçue, ou juste l'attention qu'on y porte ?",
];

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
  // MASTERCLASS.md Axe B : Promise<void> empêchait d'afficher une erreur
  // serveur ici malgré l'état `error` déjà présent dans ce formulaire.
  onSave: (input: StudyInput) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const t = useT();
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
    const result = await onSave({
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
    if (result.error) setError(result.error);
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <div>
        <label className={labelCls}>{t("Titre de l'étude")}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("Ex. Impact du volume d'entraînement sur la prise de masse à 8 semaines")} aria-label={t("Titre de l'étude")} className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>{t("Hypothèse")}</label>
        <textarea aria-label={t("Hypothèse")} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} rows={2} className={`${inputCls} resize-none`} />
      </div>
      <div>
        <label className={labelCls}>{t("Protocole / méthodologie")}</label>
        <textarea aria-label={t("Protocole / méthodologie")} value={protocol} onChange={(e) => setProtocol(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>{t("Statut")}</label>
          <select aria-label={t("Statut")} value={status} onChange={(e) => setStatus(e.target.value as ScienceStudy["status"])} className={inputCls}>
            {Object.entries(STUDY_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>{t("Participants")}</label>
          <input aria-label={t("Participants")} type="number" min="0" value={participantCount} onChange={(e) => setParticipantCount(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("Date de début")}</label>
          <input aria-label={t("Date de début")} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{t("Date de fin")}</label>
          <input aria-label={t("Date de fin")} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>{t("Résultats (optionnel)")}</label>
        <textarea aria-label={t("Résultats (optionnel)")} value={results} onChange={(e) => setResults(e.target.value)} rows={3} className={`${inputCls} resize-none`} />
      </div>

      {error && <p className="text-xs text-red-400">{t(error)}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? t("Enregistrement…") : initial ? t("Mettre à jour") : t("Créer l'étude")}
        </button>
        <button onClick={onCancel} aria-label={t("Annuler")} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function StudyCard({ study, isCoach, participationUnlocked, onUpdate, onDelete, onJoin, onLeave }: {
  study: ScienceStudy;
  isCoach: boolean;
  participationUnlocked: boolean;
  onUpdate: (input: StudyInput) => Promise<{ error?: string }>;
  onDelete: () => Promise<void>;
  onJoin: () => Promise<void>;
  onLeave: () => Promise<void>;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [joining, setJoining] = useState(false);

  if (editing) {
    return (
      <StudyForm
        initial={study}
        onSave={async (input) => {
          const result = await onUpdate(input);
          if (!result.error) setEditing(false);
          return result;
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-4 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
          <span className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[study.status]}`}>
            {STUDY_STATUS_LABELS[study.status]}
          </span>
          {study.is_joined && (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-green-500/10 border border-green-500/25 text-green-300">
              <Users size={9} />{" "}{t("Tu participes")}
            </span>
          )}
        </div>
        <p className="text-sm font-bold text-white leading-snug">{study.title}</p>
        <p className="text-[10px] text-[#F5EDED]/35 mt-1">
          {study.joined_count}{" "}{t("inscrit")}{study.joined_count > 1 ? "s" : ""}
          {study.participant_count != null ? ` · objectif ${study.participant_count}` : ""}
        </p>
      </button>
      {!isCoach && (
        <div className="px-4 pb-3">
          {!participationUnlocked ? (
            <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-300/80">
              <Lock size={11} />{" "}{t("Participation débloquée à")}{" "}{FEATURE_UNLOCK_POINTS.study_participation}{" "}{t("pts ou avec l'abonnement")}
            </p>
          ) : study.is_joined ? (
            <button
              onClick={async () => { setJoining(true); await onLeave(); setJoining(false); }}
              disabled={joining}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-red-400 transition-colors disabled:opacity-50"
            >
              <LogOut size={11} />{" "}{t("Quitter l'étude")}
            </button>
          ) : (
            <button
              onClick={async () => { setJoining(true); await onJoin(); setJoining(false); }}
              disabled={joining}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Users size={11} /> {joining ? "…" : t("Rejoindre l'étude")}
            </button>
          )}
        </div>
      )}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-2">
          {study.hypothesis && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-0.5">{t("Hypothèse")}</p>
              <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{study.hypothesis}</p>
            </div>
          )}
          {study.protocol && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-0.5">{t("Protocole")}</p>
              <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{study.protocol}</p>
            </div>
          )}
          {study.results && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-0.5">{t("Résultats")}</p>
              <p className="text-sm text-[#F5EDED]/60 leading-relaxed">{study.results}</p>
            </div>
          )}
          {isCoach && (
            <div className="flex gap-2 pt-2 border-t border-[#890404]/10">
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
                <Pencil size={11} />{" "}{t("Modifier")}
              </button>
              {confirmDelete ? (
                <button onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest text-red-400">{t("Confirmer la suppression")}</button>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors ml-auto">
                  <Trash2 size={11} />{" "}{t("Supprimer")}
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
  participationUnlocked = false,
  createStudy,
  updateStudy,
  deleteStudy,
  joinStudy,
  leaveStudy,
}: {
  studies: ScienceStudy[];
  isCoach: boolean;
  participationUnlocked?: boolean;
  createStudy: (input: StudyInput) => Promise<{ error?: string; id?: string }>;
  updateStudy: (id: string, input: Partial<StudyInput>) => Promise<{ error?: string }>;
  deleteStudy: (id: string) => Promise<{ error?: string }>;
  joinStudy?: (studyId: string) => Promise<{ error?: string }>;
  leaveStudy?: (studyId: string) => Promise<{ error?: string }>;
}) {
  const t = useT();
  const [studies, setStudies] = useState(initial);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initial change (même piège que todayLogs dans ClientNutritionView —
  // useState ne reprend jamais un nouveau prop après le premier rendu).
  useEffect(() => {
    setStudies(initial);
  }, [initial]);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-4">
      <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
        <p className="text-sm text-[#F5EDED]/55 leading-relaxed">
          {t("Nos propres études, menées à l'échelle de la communauté EP Coaching : on teste des protocoles sur nos membres pour valider (ou réfuter) ce que dit la littérature dans des conditions réelles.")}
        </p>
      </div>

      {isCoach && (
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg transition-colors"
        >
          <Plus size={13} /> {showCreate ? t("Fermer") : t("Nouvelle étude")}
        </button>
      )}

      {showCreate && (
        <StudyForm
          onSave={async (input) => {
            const result = await createStudy(input);
            if (!result.error) {
              setStudies((prev) => [
                {
                  ...input,
                  id: result.id ?? `optimistic-${Date.now()}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  joined_count: 0,
                  is_joined: false,
                } as ScienceStudy,
                ...prev,
              ]);
              setShowCreate(false);
            }
            return result;
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
            participationUnlocked={participationUnlocked}
            onUpdate={async (input) => {
              const result = await updateStudy(s.id, input);
              if (!result.error) {
                setStudies((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...input } : x)));
              }
              return result;
            }}
            onDelete={async () => {
              await deleteStudy(s.id);
              setStudies((prev) => prev.filter((x) => x.id !== s.id));
            }}
            onJoin={async () => {
              if (!joinStudy) return;
              const res = await joinStudy(s.id);
              if (!res.error) {
                setStudies((prev) =>
                  prev.map((x) => (x.id === s.id ? { ...x, is_joined: true, joined_count: x.joined_count + 1 } : x))
                );
              }
            }}
            onLeave={async () => {
              if (!leaveStudy) return;
              const res = await leaveStudy(s.id);
              if (!res.error) {
                setStudies((prev) =>
                  prev.map((x) => (x.id === s.id ? { ...x, is_joined: false, joined_count: Math.max(0, x.joined_count - 1) } : x))
                );
              }
            }}
          />
        ))}
        {studies.length === 0 && (
          <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-10 px-6 text-center">
            <FlaskConical size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm text-[#F5EDED]/40 max-w-md mx-auto">
              {isCoach
                ? t("Aucune étude interne pour l'instant. Une question précise sur tes clients, formalisée en protocole, vaut souvent plus qu'une méta-analyse générique.")
                : t("Ton coach n'a pas encore lancé d'étude interne.")}
            </p>
            {isCoach && (
              <div className="mt-5 max-w-lg mx-auto text-left space-y-2">
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">
                  <Lightbulb size={11} />{" "}{t("Pour t'inspirer")}
                </p>
                {EXAMPLE_PROMPTS.map((p) => (
                  <p key={p} className="text-xs text-[#F5EDED]/45 italic leading-relaxed">
                    &ldquo;{p}&rdquo;
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
