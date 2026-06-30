"use client";

import { useState } from "react";
import { Camera, Video, Trophy, CheckCircle2, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { POSING_CATEGORIES, TYPE_LABELS, type SubmissionType } from "@/lib/posing-data";
import type { Profile } from "@/utils/auth";
import type { PhotoUpdate } from "@/utils/photos";

const inputCls =
  "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/60 transition-colors";

const TYPES: { key: SubmissionType; label: string; icon: React.ElementType; desc: string }[] = [
  { key: "mandatory_poses", label: "Poses Obligatoires", icon: Camera, desc: "Photos des poses imposées par ta catégorie" },
  { key: "posing_routine", label: "Routine Posing", icon: Video, desc: "Vidéo de ta routine complète" },
  { key: "video_perf", label: "Performance / Autre", icon: Trophy, desc: "Vidéo d'exercice, perf ou contexte libre" },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr + "T12:00:00"));
}

// ── Submission form ──────────────────────────────────────────────────────────

function SubmissionForm({
  profile,
  onSubmit,
}: {
  profile: Profile;
  onSubmit: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}) {
  const [type, setType] = useState<SubmissionType>("mandatory_poses");
  const [driveLink, setDriveLink] = useState("");
  const [notes, setNotes] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [videoGoal, setVideoGoal] = useState("");
  const [duration, setDuration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const category = profile?.competition_category ?? "Classic Physique";
  const posingData =
    POSING_CATEGORIES[category] ?? POSING_CATEGORIES["Classic Physique"] ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!driveLink.trim()) { setError("Lien Drive requis."); return; }
    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.set("type", type);
    fd.set("drive_link", driveLink.trim());
    fd.set("notes", notes.trim());
    if (type === "video_perf") {
      fd.set("notes", `Exercice: ${exerciseName.trim()}\nObjectif: ${videoGoal.trim()}\n${notes.trim()}`);
    }

    const result = await onSubmit(fd);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={40} className="text-green-400" strokeWidth={1.5} />
        <p className="text-sm font-black text-white uppercase tracking-wider">Photo update envoyée !</p>
        <p className="text-xs text-[var(--color-ep-light)]/35">Ton coach recevra une notification.</p>
        <button
          onClick={() => { setSuccess(false); setDriveLink(""); setNotes(""); }}
          className="text-xs text-[var(--color-ep-red)] hover:underline mt-2"
        >
          Envoyer une autre update
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map(({ key, label, icon: Icon, desc }) => (
          <button
            key={key}
            type="button"
            onClick={() => setType(key)}
            className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border transition-all text-center ${
              type === key
                ? "bg-[var(--color-ep-red)]/12 border-[var(--color-ep-red)]/40 text-[var(--color-ep-red)]"
                : "bg-[var(--color-ep-card)] border-[var(--color-ep-dark-red)]/20 text-[var(--color-ep-light)]/35 hover:border-[var(--color-ep-dark-red)]/50"
            }`}
          >
            <Icon size={18} strokeWidth={type === key ? 2.5 : 1.8} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-tight">{label}</span>
            <span className="text-[8px] text-[var(--color-ep-light)]/30 leading-tight hidden sm:block">{desc}</span>
          </button>
        ))}
      </div>

      {/* Type-specific content */}
      {type === "mandatory_poses" && posingData && (
        <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-3">
            Poses obligatoires — {category}
          </p>
          <div className="space-y-1.5">
            {posingData.mandatory_poses.map((pose, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-[var(--color-ep-dark-red)]/30 bg-[var(--color-ep-dark-red)]/10 flex-shrink-0 flex items-center justify-center">
                  <span className="text-[8px] text-[var(--color-ep-light)]/40">{i + 1}</span>
                </div>
                <span className="text-xs text-[var(--color-ep-light)]/70">{pose}</span>
              </div>
            ))}
          </div>
          {posingData.notes && (
            <p className="mt-3 text-[10px] text-[var(--color-ep-light)]/30 italic border-t border-[var(--color-ep-dark-red)]/15 pt-2">
              {posingData.notes}
            </p>
          )}
        </div>
      )}

      {type === "mandatory_poses" && !posingData && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
          <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-400">
            Catégorie non définie. Ton coach va la configurer prochainement.
          </p>
        </div>
      )}

      {type === "posing_routine" && posingData && (
        <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-4 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
            Instructions — {category}
          </p>
          <p className="text-xs text-[var(--color-ep-light)]/60 leading-relaxed">
            {posingData.posing_routine.instructions}
          </p>
          <p className="text-[10px] text-[var(--color-ep-red)]/70 font-bold">
            ⏱ Durée : {posingData.posing_routine.duration}
          </p>
        </div>
      )}

      {type === "posing_routine" && (
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
            Durée de ta routine
          </label>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Ex. 48 secondes"
            className={inputCls}
          />
        </div>
      )}

      {type === "video_perf" && (
        <>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
              Nom de l&apos;exercice ou contexte <span className="text-[var(--color-ep-red)]">*</span>
            </label>
            <input
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Ex. Squat, Développé couché, Gainage…"
              className={inputCls}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
              Objectif de la vidéo <span className="text-[var(--color-ep-red)]">*</span>
            </label>
            <input
              value={videoGoal}
              onChange={(e) => setVideoGoal(e.target.value)}
              placeholder="Ex. Corriger ma profondeur, feedback sur la technique…"
              className={inputCls}
              required
            />
          </div>
        </>
      )}

      {/* Drive link */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
          Lien Google Drive{type === "posing_routine" ? " ou YouTube" : ""}{" "}
          <span className="text-[var(--color-ep-red)]">*</span>
        </label>
        <input
          type="url"
          value={driveLink}
          onChange={(e) => setDriveLink(e.target.value)}
          placeholder="Drive → Clic droit → Partager → Lien → Coller ici"
          className={inputCls}
          required
        />
        <p className="text-[9px] text-[var(--color-ep-light)]/20 mt-1">
          Assure-toi que le partage est activé (Tout le monde avec le lien).
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5 block">
          Notes / Ressenti (facultatif)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Ce qui t'a plu, ce sur quoi tu veux un retour particulier…"
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 text-xs font-black uppercase tracking-widest bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] text-white rounded-xl disabled:opacity-50 transition-colors"
      >
        {submitting ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}

// ── History card ─────────────────────────────────────────────────────────────

function PhotoHistoryCard({ photo }: { photo: PhotoUpdate }) {
  const hasFeedback = !!photo.coach_replied_at;
  const date = formatDate(photo.submitted_at);
  const typeLabel = TYPE_LABELS[photo.type] ?? photo.type;

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-white">{typeLabel}</p>
          <p className="text-[10px] text-[var(--color-ep-light)]/30">
            {date}
            {photo.week_number != null && ` · Semaine ${photo.week_number}`}
          </p>
          {photo.category && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[var(--color-ep-dark-red)]/20 text-[var(--color-ep-light)]/40 border border-[var(--color-ep-dark-red)]/15 mt-1">
              {photo.category}
            </span>
          )}
        </div>
        {hasFeedback ? (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 flex-shrink-0">
            <CheckCircle2 size={10} />
            Retour reçu
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">
            <Clock size={10} />
            En attente
          </span>
        )}
      </div>

      <a
        href={photo.drive_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-ep-red)]/80 hover:text-[var(--color-ep-red)] transition-colors"
      >
        <ExternalLink size={11} />
        Ouvrir dans Drive
      </a>

      {photo.notes && (
        <p className="text-[10px] text-[var(--color-ep-light)]/45 leading-relaxed border-t border-[var(--color-ep-dark-red)]/10 pt-2">
          {photo.notes}
        </p>
      )}

      {hasFeedback && photo.coach_feedback && (
        <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-3 mt-1">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/70 mb-1">
            Retour de ton coach
          </p>
          <p className="text-xs text-[var(--color-ep-light)]/75 leading-relaxed">
            {photo.coach_feedback}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  today: string;
  profile: Profile | null;
  photoHistory: PhotoUpdate[];
  alreadySubmitted: boolean;
  submitPhotoUpdate: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export default function ClientPhotosView({
  today,
  profile,
  photoHistory,
  alreadySubmitted,
  submitPhotoUpdate,
}: Props) {
  // Guard: profile not yet available (Supabase fetch failed or slow)
  if (!profile) {
    return (
      <div className="px-6 py-8 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-24 bg-[var(--color-ep-card)] rounded" />
          <div className="h-8 w-48 bg-[var(--color-ep-card)] rounded" />
          <div className="h-40 bg-[var(--color-ep-card)] rounded-xl" />
        </div>
      </div>
    );
  }

  const frequency = profile?.photo_frequency ?? "weekly";
  const isDaily = frequency === "daily";
  const competitionDate = profile?.competition_date;
  const daysLeft = competitionDate ? daysUntil(competitionDate) : null;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Photos</h1>
      </div>

      {/* Frequency badge */}
      <div className="mb-6">
        {isDaily ? (
          <div className="flex items-center gap-3 bg-[var(--color-ep-red)]/10 border border-[var(--color-ep-red)]/30 rounded-xl px-4 py-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-ep-red)] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-ep-red)]" />
            </span>
            <div>
              <p className="text-xs font-black text-[var(--color-ep-red)] uppercase tracking-widest">
                Suivi Quotidien — Compétition
              </p>
              {daysLeft != null && daysLeft > 0 && (
                <p className="text-[10px] text-[var(--color-ep-light)]/50 mt-0.5">
                  J-{daysLeft} avant la compétition
                </p>
              )}
              {daysLeft != null && daysLeft <= 0 && (
                <p className="text-[10px] text-green-400/70 mt-0.5">
                  Jour J — Bonne chance ! 💪
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <p className="text-xs font-bold text-green-400 uppercase tracking-widest">
              Suivi Hebdomadaire
            </p>
          </div>
        )}
      </div>

      {/* Submission section */}
      <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/40 rounded-xl p-5 mb-8">
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
            {isDaily ? "Photo du jour" : "Photo de la semaine"}
          </p>
          <h2 className="text-lg font-black uppercase tracking-tight">
            Envoyer mes photos
          </h2>
        </div>

        {alreadySubmitted ? (
          <div className="flex items-center gap-3 py-4 text-center justify-center">
            <CheckCircle2 size={20} className="text-green-400" />
            <p className="text-sm font-bold text-green-400">
              Photo update envoyée {isDaily ? "aujourd'hui" : "cette semaine"} ✓
            </p>
          </div>
        ) : (
          <SubmissionForm profile={profile} onSubmit={submitPhotoUpdate} />
        )}
      </div>

      {/* History */}
      {(photoHistory ?? []).length > 0 && (
        <section>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
              Historique
            </p>
            <h2 className="text-xl font-black uppercase tracking-tight">
              Mes photos
            </h2>
          </div>
          <div className="space-y-3">
            {(photoHistory ?? []).map((p) => (
              <PhotoHistoryCard key={p.id} photo={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
