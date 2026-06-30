"use client";

import { useActionState } from "react";
import { submitCorrectionFeedback } from "@/app/dashboard/coach/clients/[id]/program/actions";
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

function ReplyForm({
  correction,
  clientId,
}: {
  correction: ExerciseCorrection;
  clientId: string;
}) {
  const boundAction = submitCorrectionFeedback.bind(
    null,
    correction.id,
    clientId
  );
  const [state, formAction, isPending] = useActionState(boundAction, null);

  const inputClass =
    "w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/30 focus:border-[var(--color-ep-red)]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[var(--color-ep-light)]/20 outline-none transition-colors";
  const labelClass =
    "block text-[9px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/40 mb-1.5";

  return (
    <form action={formAction} className="pt-3 border-t border-[var(--color-ep-dark-red)]/15 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        Répondre
      </p>
      <div>
        <label className={labelClass}>
          Retour écrit <span className="text-[var(--color-ep-red)]">*</span>
        </label>
        <textarea
          name="coach_feedback"
          rows={3}
          required
          placeholder="Tes observations sur la technique, les corrections à apporter..."
          className={`${inputClass} resize-none`}
        />
      </div>
      <div>
        <label className={labelClass}>Lien Loom (facultatif)</label>
        <input
          name="coach_video_link"
          type="url"
          placeholder="https://www.loom.com/share/..."
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p className="text-[var(--color-ep-pink)] text-xs">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Envoi…" : "Envoyer le retour"}
      </button>
    </form>
  );
}

function CorrectionCard({
  c,
  clientId,
}: {
  c: ExerciseCorrection;
  clientId: string;
}) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(c.created_at));

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {c.exercise_name}
          </p>
          <p className="text-[10px] text-[var(--color-ep-light)]/30 mt-0.5">{date}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {/* Client info */}
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
          Vidéo Drive
          <ExternalLink size={10} />
        </a>
      </div>

      {/* Coach response or reply form */}
      {c.status === "answered" ? (
        <div className="pt-3 border-t border-[var(--color-ep-dark-red)]/15 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/70">
            Ton retour
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
              Loom envoyé
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      ) : (
        <ReplyForm correction={c} clientId={clientId} />
      )}
    </div>
  );
}

export default function CoachCorrectionsSection({
  corrections,
  clientId,
}: {
  corrections: ExerciseCorrection[];
  clientId: string;
}) {
  const pending = corrections.filter((c) => c.status === "pending");
  const answered = corrections.filter((c) => c.status === "answered");

  return (
    <section className="mt-12">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
          Technique
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight">
          Corrections &amp; Questions
        </h2>
        {corrections.length === 0 && (
          <p className="mt-1 text-xs text-[var(--color-ep-light)]/30">
            Aucune vidéo déposée pour l&apos;instant.
          </p>
        )}
      </div>

      {corrections.length > 0 && (
        <div className="space-y-6">
          {/* Pending first */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400/70">
                En attente ({pending.length})
              </p>
              {pending.map((c) => (
                <CorrectionCard key={c.id} c={c} clientId={clientId} />
              ))}
            </div>
          )}

          {/* Answered */}
          {answered.length > 0 && (
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-400/50">
                Traités ({answered.length})
              </p>
              {answered.map((c) => (
                <CorrectionCard key={c.id} c={c} clientId={clientId} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
