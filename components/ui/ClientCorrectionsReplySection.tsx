"use client";

import { useActionState } from "react";
import { Video, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import type { ExerciseCorrection } from "@/utils/corrections";

type ActionState = { error?: string; success?: boolean } | null;

function ReplyForm({
  correction,
  clientId,
  action,
}: {
  correction: ExerciseCorrection;
  clientId: string;
  action: (correctionId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const bound = action.bind(null, correction.id, clientId);
  const [state, formAction, isPending] = useActionState(bound, null);

  if (state?.success) {
    return <p className="text-green-400 text-xs font-semibold">✓ Retour envoyé.</p>;
  }

  return (
    <form action={formAction} className="space-y-2.5 mt-2">
      <textarea
        name="coach_feedback"
        rows={3}
        required
        placeholder="Observations sur la technique, corrections à apporter..."
        className="w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
      />
      <input
        name="coach_video_link"
        type="url"
        placeholder="Lien Loom (facultatif)"
        className="w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors"
      />
      {state?.error && <p className="text-[#FDC4C4] text-xs">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
      >
        {isPending ? "Envoi…" : "Envoyer le retour"}
      </button>
    </form>
  );
}

export default function ClientCorrectionsReplySection({
  corrections,
  clientId,
  sendCorrectionFeedback,
}: {
  corrections: ExerciseCorrection[];
  clientId: string;
  sendCorrectionFeedback: (correctionId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  if (corrections.length === 0) return null;

  const pending = corrections.filter((c) => c.status === "pending");
  const answered = corrections.filter((c) => c.status === "answered");

  return (
    <div className="mt-6 pt-6 border-t border-[#890404]/15">
      <p className="text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-3">
        Corrections & questions {pending.length > 0 && <span className="text-amber-400">({pending.length} en attente)</span>}
      </p>
      <div className="space-y-3">
        {[...pending, ...answered].map((c) => (
          <div
            key={c.id}
            className={`rounded-xl p-4 space-y-2 border ${
              c.status === "pending" ? "bg-[#1f0101] border-amber-500/20" : "bg-[#1a0000] border-[#890404]/20"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-bold text-white">{c.exercise_name}</p>
              {c.status === "answered" ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25 flex-shrink-0">
                  <CheckCircle2 size={10} /> Traité
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">
                  <Clock size={10} /> En attente
                </span>
              )}
            </div>
            <p className="text-xs text-[#F5EDED]/55">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">Objectif : </span>
              {c.objective}
            </p>
            {c.client_question && (
              <p className="text-xs text-[#F5EDED]/55">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">Question : </span>
                {c.client_question}
              </p>
            )}
            <a
              href={c.video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors font-medium text-xs"
            >
              <Video size={11} /> Vidéo <ExternalLink size={10} />
            </a>

            {c.status === "answered" ? (
              <div className="pt-2 border-t border-[#890404]/10 space-y-1.5">
                <p className="text-xs text-[#F5EDED]/55 leading-relaxed">{c.coach_feedback}</p>
                {c.coach_video_link && (
                  <a
                    href={c.coach_video_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-green-400/70 hover:text-green-400 transition-colors text-xs font-medium"
                  >
                    <Video size={11} /> Loom <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ) : (
              <ReplyForm correction={c} clientId={clientId} action={sendCorrectionFeedback} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
