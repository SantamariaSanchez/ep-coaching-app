"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useActionState, useEffect, useRef, useState } from "react";
import { submitCorrection } from "@/app/dashboard/client/program/actions";
import { createClientSupabase } from "@/lib/supabase-client";
import type { ExerciseCorrectionResolved } from "@/utils/corrections";
import { Video, CheckCircle2, Clock, Loader2, X, ChevronDown } from "lucide-react";
import EmbeddedVideo from "@/components/ui/EmbeddedVideo";

function StatusBadge({ status }: { status: "pending" | "answered" }) {
  const t = useT();
  return status === "answered" ? (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-(--ep-ok)/15 text-(--ep-ok) border border-(--ep-ok)/25">
      <CheckCircle2 size={10} />
      {t("Corrigé")}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-(--ep-warn)/15 text-(--ep-warn) border border-(--ep-warn)/25">
      <Clock size={10} />
      {t("En attente")}
    </span>
  );
}

function CorrectionCard({ c }: { c: ExerciseCorrectionResolved }) {
  const t = useT();
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(c.created_at));

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-(--ep-strong) truncate">
            {c.exercise_name}
          </p>
          <p className="text-[10px] text-(--ep-ink)/30 mt-0.5">{date}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      <div className="space-y-1.5 text-xs text-(--ep-ink)/60">
        <p>
          <span className="text-(--ep-ink)/35 font-semibold uppercase tracking-widest text-[9px]">
            {t("Objectif :")}{" "}
          </span>
          {c.objective}
        </p>
        {c.client_question && (
          <p>
            <span className="text-(--ep-ink)/35 font-semibold uppercase tracking-widest text-[9px]">
              {t("Question :")}{" "}
            </span>
            {c.client_question}
          </p>
        )}
        {c.video_url ? (
          <video src={c.video_url} controls playsInline style={{ width: "100%", maxWidth: 320, borderRadius: 10, marginTop: 4 }} />
        ) : c.video_link ? (
          <EmbeddedVideo url={c.video_link} />
        ) : null}
      </div>

      {c.status === "answered" && (
        <div className="pt-3 border-t border-(--ep-line)/15 space-y-2">
          <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ok)/80">
            {t("Retour de ton coach")}
          </p>
          <p className="text-xs text-(--ep-ink)/75 leading-relaxed">
            {c.coach_feedback}
          </p>
          {c.coach_video_url ? (
            <video src={c.coach_video_url} controls playsInline style={{ width: "100%", maxWidth: 320, borderRadius: 10 }} />
          ) : c.coach_video_link ? (
            <EmbeddedVideo url={c.coach_video_link} />
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
  const t = useT();
  const [state, formAction, isPending] = useActionState(
    submitCorrection,
    INITIAL_STATE
  );
  const formRef = useRef<HTMLFormElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Formulaire replié par défaut (refonte de la page Programme du
  // 2026-10-20 : « optimise l'espace ») ; ouvert d'office s'il reste une
  // erreur à corriger.
  const [formOpen, setFormOpen] = useState(false);

  // Après un envoi réussi : l'état React se remet à zéro pendant le rendu
  // (motif « ajuster l'état quand une valeur change », sans effet en
  // cascade) ; le formulaire DOM, lui, dans un effet, jamais pendant le
  // render (la mutation impérative doit rester hors du corps du composant).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setVideoPath(null);
      setVideoName(null);
      setUploadError(null);
    }
  }
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  async function handleVideoSelected(file: File) {
    // MASTERCLASS.md Axe O : le bucket correction-videos rejette déjà les
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
      setUploadError("Échec de l'envoi, réessaie.");
      setVideoPath(null);
    } finally {
      setUploading(false);
    }
  }

  const inputClass =
    "w-full bg-(--ep-s2) border border-(--ep-line)/30 focus:border-(--ep-accent)/60 rounded-lg px-3 py-2.5 text-sm text-(--ep-strong) placeholder-(--ep-ink)/20 outline-none transition-colors";
  const labelClass =
    "block text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-1.5";

  return (
    <section className="mt-6 max-w-2xl mx-auto">
      <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-2xl mb-4">
        <button
          type="button"
          onClick={() => setFormOpen(!formOpen)}
          aria-expanded={formOpen || !!state?.error}
          className="w-full min-h-14 flex items-center gap-3 px-4 py-3 text-left"
        >
          <span className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center bg-(--ep-accent)/12 text-(--ep-accent)">
            <Video size={16} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-black uppercase tracking-tight text-(--ep-strong)">{t("Corrections & Questions")}</span>
            <span className="block mt-0.5 text-[11.5px] leading-snug text-(--ep-ink)/50">
              {t("Envoie une vidéo de ton exercice, ton coach te donne un retour.")}
            </span>
          </span>
          <ChevronDown
            size={16}
            className="shrink-0 text-(--ep-ink)/40 transition-transform"
            style={{ transform: formOpen || state?.error ? "rotate(180deg)" : undefined }}
          />
        </button>
      {(formOpen || !!state?.error) && (
      <div className="px-4 pb-4">
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {t("Exercice")}{" "}<span className="text-(--ep-accent)">*</span>
              </label>
              <input
                name="exercise_name"
                type="text"
                required
                placeholder={t("Ex : Squat barre")} aria-label={t("Ex : Squat barre")}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("Objectif")}{" "}<span className="text-(--ep-accent)">*</span>
              </label>
              <input
                name="objective"
                type="text"
                required
                placeholder={t("Ex : améliorer la profondeur")} aria-label={t("Ex : améliorer la profondeur")}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {t("Vidéo de l'exercice")}{" "}<span className="text-(--ep-accent)">*</span>
            </label>
            <input type="hidden" name="video_path" value={videoPath ?? ""} required />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              aria-label={t("Vidéo de l'exercice")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoSelected(file);
              }}
            />
            {videoPath ? (
              <div className="flex items-center gap-2 bg-(--ep-s2) border border-(--ep-line)/30 rounded-lg px-3 py-2.5">
                <CheckCircle2 size={14} className="text-(--ep-ok) flex-shrink-0" />
                <span className="text-sm text-(--ep-strong) truncate flex-1">{videoName}</span>
                <button
                  type="button"
                  onClick={() => { setVideoPath(null); setVideoName(null); if (videoInputRef.current) videoInputRef.current.value = ""; }}
                  aria-label={t("Retirer la vidéo")}
                  className="text-(--ep-ink)/30 hover:text-(--ep-ink)/60"
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
                    <Loader2 size={14} className="animate-spin" />{" "}{t("Envoi de la vidéo…")}
                  </>
                ) : (
                  <>
                    <Video size={14} />{" "}{t("Choisir une vidéo")}
                  </>
                )}
              </button>
            )}
            {uploadError && (
              <p className="text-(--ep-pink) text-xs mt-1.5">{uploadError}</p>
            )}
          </div>

          <div>
            <label className={labelClass}>{t("Question ou commentaire")}</label>
            <textarea
              name="client_question"
              rows={3}
              placeholder={t("Ex : Je sens que mes genoux rentrent vers l'intérieur...")} aria-label={t("Ex : Je sens que mes genoux rentrent vers l'intérieur...")}
              className={`${inputClass} resize-none`}
            />
          </div>

          {state?.error && (
            <p className="text-(--ep-pink) text-xs">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-(--ep-ok) text-xs">
              {t("✓ Envoyé, ton coach te répondra prochainement.")}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending || uploading || !videoPath}
            className="w-full bg-(--ep-accent) hover:bg-(--ep-accent-2) disabled:opacity-50 disabled:cursor-not-allowed text-(--ep-strong) text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
          >
            {isPending ? t("Envoi…") : t("Envoyer")}
          </button>
        </form>
      </div>
      )}
      </div>

      {/* Past submissions */}
      {corrections.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35">
            {t("Mes dépôts (")}{corrections.length})
          </p>
          {corrections.map((c) => (
            <CorrectionCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </section>
  );
}
