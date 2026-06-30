"use client";

import { useActionState, useRef } from "react";
import { submitCorrection } from "@/app/dashboard/client/program/actions";
import type { ExerciseCorrection } from "@/utils/corrections";
import { Video, ExternalLink, CheckCircle2, Clock } from "lucide-react";

function StatusBadge({ status }: { status: "pending" | "answered" }) {
  return status === "answered" ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
      <CheckCircle2 size={10} />
      Corrigé
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
      <Clock size={10} />
      En attente
    </span>
  );
}

function CorrectionCard({ c }: { c: ExerciseCorrection }) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(c.created_at));

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {c.exercise_name}
          </p>
          <p className="text-[10px] text-[var(--color-ep-light)]/30 mt-0.5">{date}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="space-y-1.5 text-xs text-[var(--color-ep-light)]/60">
        <p>
          <span className="text-[var(--color-ep-light)]/35 font-semibold uppercase tracking-widest text-[9px]">
            Objectif —{" "}
          </span>
          {c.objective}
        </p>
        {c.client_question && (
          <p>
            <span className="text-[var(--color-ep-light)]/35 font-semibold uppercase tracking-widest text-[9px]">
              Question —{" "}
            </span>
            {c.client_question}
          </p>
        )}
        <a
          href={c.video_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[var(--color-ep-red)]/80 hover:text-[var(--color-ep-red)] transition-colors font-medium"
        >
          <Video size={11} />
          Voir ma vidéo
          <ExternalLink size={10} />
        </a>
      </div>

      {c.status === "answered" && (
        <div className="pt-3 border-t border-[var(--color-ep-dark-red)]/15 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/70">
            Retour de ton coach
          </p>
          <p className="text-xs text-[var(--color-ep-light)]/75 leading-relaxed">
            {c.coach_feedback}
          </p>
          {c.coach_video_link && (
            <a
              href={c.coach_video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-green-400/80 hover:text-green-400 transition-colors text-xs font-medium"
            >
              <Video size={11} />
              Vidéo coach
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

const INITIAL_STATE = null as { error?: string; success?: boolean } | null;

export default function ClientCorrectionsSection({
  corrections,
}: {
  corrections: ExerciseCorrection[];
}) {
  const [state, formAction, isPending] = useActionState(
    submitCorrection,
    INITIAL_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Reset form on success
  if (state?.success && formRef.current) {
    formRef.current.reset();
  }

  const inputClass =
    "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 focus:border-[var(--color-ep-red)]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[var(--color-ep-light)]/20 outline-none transition-colors";
  const labelClass =
    "block text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5";

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Technique
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight">
          Corrections &amp; Questions
        </h2>
        <p className="mt-1 text-xs text-[var(--color-ep-light)]/30">
          Envoie une vidéo de ton exercice — ton coach te donne un retour.
        </p>
      </div>

      {/* Form */}
      <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Exercice <span className="text-[var(--color-ep-red)]">*</span>
              </label>
              <input
                name="exercise_name"
                type="text"
                required
                placeholder="Ex : Squat barre"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Objectif <span className="text-[var(--color-ep-red)]">*</span>
              </label>
              <input
                name="objective"
                type="text"
                required
                placeholder="Ex : améliorer la profondeur"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Lien Google Drive (vidéo) <span className="text-[var(--color-ep-red)]">*</span>
            </label>
            <input
              name="video_link"
              type="url"
              required
              placeholder="https://drive.google.com/..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Question ou commentaire</label>
            <textarea
              name="client_question"
              rows={3}
              placeholder="Ex : Je sens que mes genoux rentrent vers l'intérieur..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {state?.error && (
            <p className="text-[var(--color-ep-pink)] text-xs">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-green-400 text-xs">
              ✓ Envoyé — ton coach te répondra prochainement.
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {isPending ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </div>

      {/* Past submissions */}
      {corrections.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
            Mes dépôts ({corrections.length})
          </p>
          {corrections.map((c) => (
            <CorrectionCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </section>
  );
}
