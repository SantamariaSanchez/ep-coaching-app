"use client";

import { useActionState, useRef, useState } from "react";
import { Video, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import type { ExerciseCorrectionResolved, VideoAnnotation } from "@/utils/corrections";
import EmbeddedVideo from "@/components/ui/EmbeddedVideo";

type ActionState = { error?: string; success?: boolean } | null;

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Item 22 : vidéo du CLIENT (pas la réponse du coach) + ses annotations
// horodatées. Réutilisé en lecture seule (correction déjà traitée) et en
// mode édition (dans ReplyForm, tant que la correction est en attente).
function AnnotatedClientVideo({
  videoUrl,
  videoLink,
  annotations,
  editable,
  onAddAnnotation,
  onRemoveAnnotation,
}: {
  videoUrl: string | null;
  videoLink: string | null;
  annotations: VideoAnnotation[];
  editable?: boolean;
  onAddAnnotation?: (timestampSeconds: number, note: string) => void;
  onRemoveAnnotation?: (index: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [noteInput, setNoteInput] = useState("");

  function seekTo(t: number) {
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  function handleAdd() {
    if (!videoRef.current || !noteInput.trim()) return;
    onAddAnnotation?.(Math.floor(videoRef.current.currentTime), noteInput.trim());
    setNoteInput("");
  }

  if (!videoUrl && !videoLink) return null;

  return (
    <div className="space-y-1.5">
      {videoUrl ? (
        <video ref={videoRef} src={videoUrl} controls playsInline style={{ width: "100%", maxWidth: 280, borderRadius: 8 }} />
      ) : videoLink ? (
        <EmbeddedVideo url={videoLink} maxWidth={280} />
      ) : null}

      {annotations.length > 0 && (
        <div className="space-y-1">
          {annotations.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => seekTo(a.timestamp_seconds)}
                disabled={!videoUrl}
                className="flex-shrink-0 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#890404]/20 text-[#F5EDED]/70 hover:bg-[#890404]/35 disabled:opacity-50 transition-colors"
              >
                {formatTimestamp(a.timestamp_seconds)}
              </button>
              <span className="text-[#F5EDED]/55 flex-1">{a.note}</span>
              {editable && (
                <button
                  type="button"
                  onClick={() => onRemoveAnnotation?.(i)}
                  aria-label="Supprimer l'annotation"
                  className="text-[#F5EDED]/25 hover:text-[#F5EDED]/50 flex-shrink-0"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editable && videoUrl && (
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="Note à l'instant courant de la vidéo…" aria-label="Note à l'instant courant de la vidéo…"
            className="flex-1 bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#F5EDED]/20 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!noteInput.trim()}
            className="flex-shrink-0 bg-[#150000] border border-[#890404]/30 hover:border-[#E01E1E]/60 disabled:opacity-40 rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/60 transition-colors"
          >
            + note
          </button>
        </div>
      )}
    </div>
  );
}

function ReplyForm({
  correction,
  clientId,
  action,
}: {
  correction: ExerciseCorrectionResolved;
  clientId: string;
  action: (correctionId: string, clientId: string, _prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const bound = action.bind(null, correction.id, clientId);
  const [state, formAction, isPending] = useActionState(bound, null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<VideoAnnotation[]>(correction.video_annotations ?? []);

  function addAnnotation(timestampSeconds: number, note: string) {
    setAnnotations((prev) => [...prev, { timestamp_seconds: timestampSeconds, note }].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
  }

  function removeAnnotation(index: number) {
    setAnnotations((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleVideoSelected(file: File) {
    // MASTERCLASS.md Axe O : le bucket coach-videos rejette déjà les
    // fichiers trop lourds ou au mauvais type côté serveur, mais sans ce
    // contrôle l'utilisateur attend l'échec de l'upload réseau d'une vidéo
    // de plusieurs centaines de Mo avant de voir l'erreur.
    if (file.size > 150 * 1024 * 1024) {
      setVideoName(file.name);
      setUploadError("Vidéo trop lourde (150 Mo maximum).");
      return;
    }
    setUploading(true);
    setUploadError(null);
    setVideoName(file.name);
    try {
      const supabase = createClientSupabase();
      const ext = file.name.split(".").pop() || "mp4";
      // Préfixé par l'id du CLIENT (pas celui du coach) : la policy RLS
      // restreint la lecture à ce client et à son coach.
      const path = `${clientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("coach-videos")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) throw error;
      setVideoPath(path);
    } catch {
      setUploadError("Échec de l'envoi, réessaie.");
      setVideoPath(null);
    } finally {
      setUploading(false);
    }
  }

  if (state?.success) {
    return <p className="text-green-400 text-xs font-semibold">✓ Retour envoyé.</p>;
  }

  return (
    <form action={formAction} className="space-y-2.5 mt-2">
      <AnnotatedClientVideo
        videoUrl={correction.video_url}
        videoLink={correction.video_link}
        annotations={annotations}
        editable
        onAddAnnotation={addAnnotation}
        onRemoveAnnotation={removeAnnotation}
      />
      <input type="hidden" name="video_annotations" value={JSON.stringify(annotations)} />

      <textarea
        name="coach_feedback"
        rows={3}
        required
        placeholder="Observations sur la technique, corrections à apporter..." aria-label="Observations sur la technique, corrections à apporter..."
        className="w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors resize-none"
      />

      <input type="hidden" name="coach_video_path" value={videoPath ?? ""} />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        aria-label="Vidéo de réponse"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleVideoSelected(file);
        }}
      />
      {videoPath ? (
        <div className="flex items-center gap-2 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2">
          <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
          <span className="text-xs text-white truncate flex-1">{videoName}</span>
          <button
            type="button"
            onClick={() => { setVideoPath(null); setVideoName(null); if (videoInputRef.current) videoInputRef.current.value = ""; }}
            aria-label="Retirer la vidéo"
            className="text-[#F5EDED]/30 hover:text-[#F5EDED]/60"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-[#150000] border border-[#890404]/30 hover:border-[#E01E1E]/60 disabled:opacity-60 rounded-lg px-3 py-2 text-xs text-[#F5EDED]/60 transition-colors"
        >
          {uploading ? (
            <>
              <Loader2 size={12} className="animate-spin" /> Envoi de la vidéo…
            </>
          ) : (
            <>
              <Video size={12} /> Ajouter une vidéo (facultatif)
            </>
          )}
        </button>
      )}
      {uploadError && <p className="text-[#FDC4C4] text-xs">{uploadError}</p>}

      {state?.error && <p className="text-[#FDC4C4] text-xs">{state.error}</p>}
      <button
        type="submit"
        disabled={isPending || uploading}
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
  corrections: ExerciseCorrectionResolved[];
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
            {c.status === "answered" ? (
              <>
                <AnnotatedClientVideo videoUrl={c.video_url} videoLink={c.video_link} annotations={c.video_annotations ?? []} />
                <div className="pt-2 border-t border-[#890404]/10 space-y-1.5">
                  <p className="text-xs text-[#F5EDED]/55 leading-relaxed">{c.coach_feedback}</p>
                  {c.coach_video_url ? (
                    <video src={c.coach_video_url} controls playsInline style={{ width: "100%", maxWidth: 280, borderRadius: 8 }} />
                  ) : c.coach_video_link ? (
                    <EmbeddedVideo url={c.coach_video_link} maxWidth={280} />
                  ) : null}
                </div>
              </>
            ) : (
              <ReplyForm correction={c} clientId={clientId} action={sendCorrectionFeedback} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
