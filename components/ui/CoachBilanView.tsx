"use client";

import { useActionState, useState } from "react";
import {
  sendBilan,
  sendCorrectionFeedbackBilan,
  sendPhotoFeedbackBilan,
} from "@/app/dashboard/coach/bilan/actions";
import type { CheckInWithClientProfile } from "@/utils/checkins";
import type { ExerciseCorrectionWithClient } from "@/utils/corrections";
import type { PhotoUpdateWithClient } from "@/utils/photos";
import { TYPE_LABELS } from "@/lib/posing-data";
import {
  Video,
  ExternalLink,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  Camera,
} from "lucide-react";

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputClass =
  "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
const labelClass =
  "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

// ── Bilan reply form ──────────────────────────────────────────────────────────

function BilanReplyForm({ checkin }: { checkin: CheckInWithClientProfile }) {
  const boundAction = sendBilan.bind(null, checkin.id, checkin.client_id);
  const [state, action, isPending] = useActionState(boundAction, null);

  if (state?.success)
    return (
      <p className="text-green-400 text-xs font-semibold pt-3 border-t border-[#890404]/15">
        ✓ Bilan envoyé, le client a été notifié par email.
      </p>
    );

  return (
    <form
      action={action}
      className="pt-3 border-t border-[#890404]/15 space-y-3"
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        Envoyer le bilan
      </p>
      <div>
        <label className={labelClass}>
          Retour écrit <span className="text-[#E01E1E]">*</span>
        </label>
        <textarea
          name="bilan_text"
          rows={4}
          required
          placeholder="Observations, points positifs, points à améliorer..."
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="max-w-[120px]">
        <label className={labelClass}>Note /10</label>
        <input
          name="bilan_rating"
          type="number"
          min={1}
          max={10}
          placeholder="8"
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p className="text-[#FDC4C4] text-xs">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Envoi…" : "Envoyer le bilan"}
      </button>
    </form>
  );
}

// ── Correction reply form ─────────────────────────────────────────────────────

function CorrectionReplyForm({
  correction,
}: {
  correction: ExerciseCorrectionWithClient;
}) {
  const boundAction = sendCorrectionFeedbackBilan.bind(
    null,
    correction.id,
    correction.client_id
  );
  const [state, action, isPending] = useActionState(boundAction, null);

  if (state?.success)
    return (
      <p className="text-green-400 text-xs font-semibold pt-3 border-t border-[#890404]/15">
        ✓ Retour envoyé.
      </p>
    );

  return (
    <form
      action={action}
      className="pt-3 border-t border-[#890404]/15 space-y-3"
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        Répondre
      </p>
      <div>
        <label className={labelClass}>
          Retour écrit <span className="text-[#E01E1E]">*</span>
        </label>
        <textarea
          name="coach_feedback"
          rows={3}
          required
          placeholder="Observations sur la technique, corrections à apporter..."
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
        <p className="text-[#FDC4C4] text-xs">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Envoi…" : "Envoyer le retour"}
      </button>
    </form>
  );
}

// ── Check-in data display ─────────────────────────────────────────────────────

const FEELING_LABELS: Record<number, string> = {
  1: "Épuisé",
  2: "Fatigué",
  3: "Correct",
  4: "Bien",
  5: "Au top",
};

function DataChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2 text-center">
      <p className="text-[8px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
        {label}
      </p>
      <p className="text-sm font-black text-white mt-0.5">{value}</p>
    </div>
  );
}

function BilanCard({
  checkin,
  pending,
}: {
  checkin: CheckInWithClientProfile;
  pending: boolean;
}) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(checkin.created_at));

  return (
    <div
      className={`rounded-xl p-4 space-y-3 border ${
        pending
          ? "bg-[#1f0101] border-amber-500/20"
          : "bg-[#1a0000] border-[#890404]/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">
            {checkin.profiles?.full_name ?? "Client"}
          </p>
          <p className="text-[10px] text-[#F5EDED]/30">
            Semaine {checkin.week_number} · {date}
          </p>
        </div>
        {!pending && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            <CheckCircle2 size={10} />
            Bilan envoyé
          </span>
        )}
      </div>

      {/* Key data chips */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {checkin.weight != null && (
          <DataChip label="Poids" value={`${checkin.weight} kg`} />
        )}
        {checkin.nutrition_adherence != null && (
          <DataChip label="Adhésion" value={`${checkin.nutrition_adherence}%`} />
        )}
        {checkin.sleep_hours != null && (
          <DataChip label="Sommeil" value={`${checkin.sleep_hours}h`} />
        )}
        {checkin.hrv != null && (
          <DataChip label="HRV" value={String(checkin.hrv)} />
        )}
        {checkin.general_feeling != null && (
          <DataChip
            label="Ressenti"
            value={`${checkin.general_feeling}/5 ${FEELING_LABELS[checkin.general_feeling] ?? ""}`}
          />
        )}
      </div>

      {/* Client notes */}
      {checkin.client_notes && (
        <p className="text-xs text-[#F5EDED]/55 leading-relaxed border-t border-[#890404]/10 pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
            Notes :{" "}
          </span>
          {checkin.client_notes}
        </p>
      )}

      {/* Bilan sent — show what was sent */}
      {!pending && checkin.bilan_text && (
        <div className="pt-2 border-t border-[#890404]/10 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/60">
            Ton bilan envoyé
            {checkin.bilan_rating != null && (
              <span className="ml-2 text-amber-400">
                {checkin.bilan_rating}/10
              </span>
            )}
          </p>
          <p className="text-xs text-[#F5EDED]/55 leading-relaxed">
            {checkin.bilan_text}
          </p>
        </div>
      )}

      {/* Pending → reply form */}
      {pending && <BilanReplyForm checkin={checkin} />}
    </div>
  );
}

function CorrectionCard({
  correction,
  pending,
}: {
  correction: ExerciseCorrectionWithClient;
  pending: boolean;
}) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(correction.created_at));

  return (
    <div
      className={`rounded-xl p-4 space-y-3 border ${
        pending
          ? "bg-[#1f0101] border-amber-500/20"
          : "bg-[#1a0000] border-[#890404]/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">
            {correction.profiles?.full_name ?? "Client"}
            <span className="font-normal text-[#F5EDED]/40"> : </span>
            {correction.exercise_name}
          </p>
          <p className="text-[10px] text-[#F5EDED]/30">{date}</p>
        </div>
        {!pending && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">
            <CheckCircle2 size={10} />
            Traité
          </span>
        )}
      </div>

      <div className="space-y-1 text-xs text-[#F5EDED]/55">
        <p>
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
            Objectif :{" "}
          </span>
          {correction.objective}
        </p>
        {correction.client_question && (
          <p>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
              Question :{" "}
            </span>
            {correction.client_question}
          </p>
        )}
        <a
          href={correction.video_link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors font-medium"
        >
          <Video size={11} />
          Vidéo Drive
          <ExternalLink size={10} />
        </a>
      </div>

      {!pending && correction.coach_feedback && (
        <div className="pt-2 border-t border-[#890404]/10 space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/60">
            Ton retour envoyé
          </p>
          <p className="text-xs text-[#F5EDED]/55 leading-relaxed">
            {correction.coach_feedback}
          </p>
          {correction.coach_video_link && (
            <a
              href={correction.coach_video_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-green-400/70 hover:text-green-400 transition-colors text-xs font-medium"
            >
              <Video size={11} />
              Loom
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      )}

      {pending && <CorrectionReplyForm correction={correction} />}
    </div>
  );
}

// ── Photo feedback form (bilan) ───────────────────────────────────────────────

type ActionState = { error?: string; success?: boolean } | null;

function PhotoFeedbackFormBilan({
  photo,
}: {
  photo: PhotoUpdateWithClient;
}) {
  const boundAction = sendPhotoFeedbackBilan.bind(null, photo.id, photo.client_id);
  const [state, action, isPending] = useActionState(boundAction, null);

  if (state?.success) {
    return (
      <p className="text-green-400 text-xs font-semibold pt-3 border-t border-[#890404]/15">
        ✓ Retour envoyé, le client a été notifié.
      </p>
    );
  }

  return (
    <form action={action} className="pt-3 border-t border-[#890404]/15 space-y-3">
      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
        Envoyer un retour
      </p>
      <textarea
        name="coach_feedback"
        rows={3}
        required
        placeholder="Points positifs, axes d'amélioration, corrections à apporter…"
        className={`${inputClass} resize-none`}
      />
      {state?.error && <p className="text-[#FDC4C4] text-xs">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
      >
        {isPending ? "Envoi…" : "Envoyer le retour"}
      </button>
    </form>
  );
}

function PhotoBilanCard({ photo }: { photo: PhotoUpdateWithClient }) {
  const typeLabel = TYPE_LABELS[photo.type] ?? photo.type;
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(photo.submitted_at + "T12:00:00"));

  return (
    <div className="rounded-xl p-4 space-y-3 border bg-[#1f0101] border-amber-500/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">
            {photo.profiles?.full_name ?? "Client"}
            <span className="font-normal text-[#F5EDED]/40"> : </span>
            {typeLabel}
          </p>
          <p className="text-[10px] text-[#F5EDED]/30">
            {date}
            {photo.week_number != null && ` · Semaine ${photo.week_number}`}
          </p>
          {photo.category && (
            <span className="inline-block text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#890404]/20 text-[#F5EDED]/40 border border-[#890404]/15 mt-1">
              {photo.category}
            </span>
          )}
        </div>
      </div>

      <a
        href={photo.drive_link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
      >
        <ExternalLink size={11} />
        Ouvrir dans Drive
      </a>

      {photo.notes && (
        <p className="text-xs text-[#F5EDED]/50 leading-relaxed border-t border-[#890404]/10 pt-2">
          <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">
            Notes :{" "}
          </span>
          {photo.notes}
        </p>
      )}

      <PhotoFeedbackFormBilan photo={photo} />
    </div>
  );
}

// ── Collapsible "done" section ────────────────────────────────────────────────

function DoneSection({
  doneBilans,
  doneCorrections,
}: {
  doneBilans: CheckInWithClientProfile[];
  doneCorrections: ExerciseCorrectionWithClient[];
}) {
  const [open, setOpen] = useState(false);
  const total = doneBilans.length + doneCorrections.length;
  if (total === 0) return null;

  return (
    <div className="mt-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-[#F5EDED]/50 transition-colors"
      >
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Traités : 30 derniers jours ({total})
      </button>

      {open && (
        <div className="mt-4 space-y-6">
          {doneBilans.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">
                Bilans envoyés ({doneBilans.length})
              </p>
              {doneBilans.map((c) => (
                <BilanCard key={c.id} checkin={c} pending={false} />
              ))}
            </div>
          )}
          {doneCorrections.length > 0 && (
            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/25">
                Corrections traitées ({doneCorrections.length})
              </p>
              {doneCorrections.map((c) => (
                <CorrectionCard key={c.id} correction={c} pending={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function CoachBilanView({
  pendingBilans,
  pendingCorrections,
  doneBilans,
  doneCorrections,
  pendingPhotos,
}: {
  pendingBilans: CheckInWithClientProfile[];
  pendingCorrections: ExerciseCorrectionWithClient[];
  doneBilans: CheckInWithClientProfile[];
  doneCorrections: ExerciseCorrectionWithClient[];
  pendingPhotos: PhotoUpdateWithClient[];
}) {
  const totalPending = pendingBilans.length + pendingCorrections.length + pendingPhotos.length;

  return (
    <div className="space-y-10">
      {/* ── À FAIRE ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            À faire
          </h2>
          {totalPending > 0 && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#E01E1E] text-white">
              {totalPending}
            </span>
          )}
        </div>

        {totalPending === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-[#1f0101] border border-[#890404]/20 rounded-xl text-center">
            <CheckCircle2 size={28} className="text-green-400 mb-3" strokeWidth={1.5} />
            <p className="text-sm font-bold text-[#F5EDED]/60 uppercase tracking-widest">
              Tout à jour
            </p>
            <p className="text-xs text-[#F5EDED]/25 mt-1">
              Aucun bilan, correction ni photo en attente.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingBilans.length > 0 && (
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
                  Check-ins sans bilan ({pendingBilans.length})
                </p>
                {pendingBilans.map((c) => (
                  <BilanCard key={c.id} checkin={c} pending />
                ))}
              </div>
            )}

            {pendingCorrections.length > 0 && (
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70">
                  Corrections sans réponse ({pendingCorrections.length})
                </p>
                {pendingCorrections.map((c) => (
                  <CorrectionCard key={c.id} correction={c} pending />
                ))}
              </div>
            )}

            {pendingPhotos.length > 0 && (
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/70 flex items-center gap-1.5">
                  <Camera size={11} />
                  Photos en attente de retour ({pendingPhotos.length})
                </p>
                {pendingPhotos.map((p) => (
                  <PhotoBilanCard key={p.id} photo={p} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── FAIT ── */}
      <DoneSection doneBilans={doneBilans} doneCorrections={doneCorrections} />
    </div>
  );
}
