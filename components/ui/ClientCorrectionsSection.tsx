"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitCorrection } from "@/app/dashboard/client/program/actions";
import { createClientSupabase } from "@/lib/supabase-client";
import type { ExerciseCorrectionResolved } from "@/utils/corrections";
import { Video, ExternalLink, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { safeExternalUrl } from "@/lib/sanitize";

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

function CorrectionCard({ c }: { c: ExerciseCorrectionResolved }) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(c.created_at));

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">
            {c.exercise_name}
          </p>
          <p className="text-[10px] text-[#F5EDED]/30 mt-0.5">{date}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="space-y-1.5 text-xs text-[#F5EDED]/60">
        <p>
          <span className="text-[#F5EDED]/35 font-semibold uppercase tracking-widest text-[9px]">
            Objectif :{" "}
          </span>
          {c.objective}
        </p>
        {c.client_question && (
          <p>
            <span className="text-[#F5EDED]/35 font-semibold uppercase tracking-widest text-[9px]">
              Question :{" "}
            </span>
            {c.client_question}
          </p>
        )}
        {c.video_url ? (
          <video src={c.video_url} controls playsInline style={{ width: "100%", maxWidth: 320, borderRadius: 10, marginTop: 4 }} />
        ) : c.video_link ? (
          <a
            href={safeExternalUrl(c.video_link) ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors font-medium"
          >
            <Video size={11} />
            Voir ma vidéo
            <ExternalLink size={10} />
          </a>
        ) : null}
      </div>

      {c.status === "answered" && (
        <div className="pt-3 border-t border-[#890404]/15 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-green-400/70">
            Retour de ton coach
          </p>
          <p className="text-xs text-[#F5EDED]/75 leading-relaxed">
            {c.coach_feedback}
          </p>
          {c.coach_video_url ? (
            <video src={c.coach_video_url} controls playsInline style={{ width: "100%", maxWidth: 320, borderRadius: 10 }} />
          ) : c.coach_video_link ? (
            <a
              href={safeExternalUrl(c.coach_video_link) ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-green-400/80 hover:text-green-400 transition-colors text-xs font-medium"
            >
              <Video size={11} />
              Vidéo coach
              <ExternalLink size={10} />
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}

const INITIAL_STATE = null as { error?: string; success?: boolean } | null;

export default function ClientCorrectionsSection({
  corrections,
}: {
  corrections: ExerciseCorrectionResolved[];
}) {
  const [state, formAction, isPending] = useActionState(
    submitCorrection,
    INITIAL_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  // Reset form on success — dans un effet, jamais pendant le render (React
  // peut rendre plusieurs fois sans committer, la mutation DOM imperative
  // doit rester hors du corps du composant).
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      setVideoPath(null);
      setVideoName(null);
      setUploadError(false);
    }
  }, [state]);

  async function handleVideoSelected(file: File) {
    setUploading(true);
    setUploadError(false);
    setVideoName(file.name);
    try {
      const supabase = createClientSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error();
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("correction-videos")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw error;
      setVideoPath(path);
    } catch {
      setUploadError(true);
      setVideoPath(null);
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
  const labelClass =
    "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

  return (
    <section className="mt-12 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Technique
        </p>
        <h2 className="text-xl font-black uppercase tracking-tight">
          Corrections &amp; Questions
        </h2>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          Envoie une vidéo de ton exercice, ton coach te donne un retour.
        </p>
      </div>

      {/* Form */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Exercice <span className="text-[#E01E1E]">*</span>
              </label>
              <input
                name="exercise_name"
                type="text"
                required
                placeholder="Ex : Squat barre" aria-label="Ex : Squat barre"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Objectif <span className="text-[#E01E1E]">*</span>
              </label>
              <input
                name="objective"
                type="text"
                required
                placeholder="Ex : améliorer la profondeur" aria-label="Ex : améliorer la profondeur"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              Vidéo de l&apos;exercice <span className="text-[#E01E1E]">*</span>
            </label>
            <input type="hidden" name="video_path" value={videoPath ?? ""} required />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              aria-label="Vidéo de l'exercice"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoSelected(file);
              }}
            />
            {videoPath ? (
              <div className="flex items-center gap-2 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5">
                <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-sm text-white truncate flex-1">{videoName}</span>
                <button
                  type="button"
                  onClick={() => { setVideoPath(null); setVideoName(null); if (videoInputRef.current) videoInputRef.current.value = ""; }}
                  className="text-[#F5EDED]/30 hover:text-[#F5EDED]/60"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
                className={`${inputClass} flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60`}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Envoi de la vidéo…
                  </>
                ) : (
                  <>
                    <Video size={14} /> Choisir une vidéo
                  </>
                )}
              </button>
            )}
            {uploadError && (
              <p className="text-[#FDC4C4] text-xs mt-1.5">Échec de l&apos;envoi, réessaie.</p>
            )}
          </div>

          <div>
            <label className={labelClass}>Question ou commentaire</label>
            <textarea
              name="client_question"
              rows={3}
              placeholder="Ex : Je sens que mes genoux rentrent vers l'intérieur..." aria-label="Ex : Je sens que mes genoux rentrent vers l'intérieur..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {state?.error && (
            <p className="text-[#FDC4C4] text-xs">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-green-400 text-xs">
              ✓ Envoyé, ton coach te répondra prochainement.
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || uploading || !videoPath}
            className="w-full bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {isPending ? "Envoi…" : "Envoyer"}
          </button>
        </form>
      </div>

      {/* Past submissions */}
      {corrections.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
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
