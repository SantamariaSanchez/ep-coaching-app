"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { startTransition, useActionState, useRef, useState } from "react";
import { submitCheckin } from "@/app/dashboard/client/checkin/actions";
import { createClientSupabase } from "@/lib/supabase-client";
import { CheckCircle2, Camera, Video, X, Loader2, Sparkles, AlertCircle } from "lucide-react";

const inp =
  "w-full bg-[rgba(var(--ep-shade-rgb),0.4)] border border-[rgba(var(--ep-line-rgb),0.3)] rounded-lg px-4 py-3 text-sm text-(--ep-ink) placeholder:text-(--ep-ink)/20 focus:outline-none focus:border-(--ep-accent)/60 transition-colors resize-none";

const lbl =
  "block text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/40 mb-1.5";

const MAX_PHOTOS = 4;
const MAX_VIDEOS = 6;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // limite du stockage checkin-media
// Seuils qui déclenchent la question "pourquoi" sur l'attitude — une note
// dans la moyenne n'a pas besoin d'explication, une note très basse ou très
// haute si.
const ATTITUDE_LOW = 3;
const ATTITUDE_HIGH = 8;

function Q({
  name,
  question,
  placeholder,
  rows = 3,
  required = false,
}: {
  name: string;
  question: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label className={lbl}>
        {question} {required && <span className="text-(--ep-accent)">*</span>}
      </label>
      <textarea aria-label={question} name={name} rows={rows} placeholder={placeholder} className={inp} required={required} />
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
      color: "rgba(var(--ep-accent-rgb),0.55)", margin: "0 0 14px",
      borderBottom: "1px solid rgba(var(--ep-line-rgb),0.12)", paddingBottom: 6,
    }}>
      {title}
    </p>
  );
}

interface MediaItem {
  localId: string;
  previewUrl: string;
  path: string | null;
  uploading: boolean;
  error: boolean;
}

const FEEDBACK_FORMATS: { value: "ecrit" | "vocal" | "video"; label: string }[] = [
  { value: "ecrit", label: "Écrit" },
  { value: "vocal", label: "Vocal" },
  { value: "video", label: "Vidéo" },
];

export default function CheckinForm({
  weightAvgFromLogs,
}: {
  weightAvgFromLogs?: number | null;
}) {
  const t = useT();
  const [state, formAction, isPending] = useActionState(submitCheckin, null);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<(MediaItem & { label: string; tooBig?: boolean })[]>([]);
  const [videoLink, setVideoLink] = useState("");
  const [attitudeRating, setAttitudeRating] = useState<number | "">("");
  const [feedbackFormat, setFeedbackFormat] = useState<"ecrit" | "vocal" | "video">("ecrit");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const attitudeNum = attitudeRating === "" ? null : attitudeRating;
  const isLowAttitude = attitudeNum != null && attitudeNum <= ATTITUDE_LOW;
  const needsAttitudeExplanation =
    attitudeNum != null && (attitudeNum <= ATTITUDE_LOW || attitudeNum >= ATTITUDE_HIGH);

  // Upload immédiat vers Supabase Storage dès la sélection — le formulaire
  // n'envoie ensuite que les chemins déjà uploadés (petites chaînes), jamais
  // les fichiers eux-mêmes : une action serveur Next.js plafonne le poids du
  // payload bien en dessous de ce que pèsent des photos/vidéos de check-in.
  async function uploadFile(file: File): Promise<string | null> {
    try {
      const supabase = createClientSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const ext = file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg");
      // Préfixé par l'id du client : la policy RLS du bucket restreint la
      // lecture à ce dossier (client + son coach), jamais à tout le monde.
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("checkin-media")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (error) return null;
      return path;
    } catch {
      return null;
    }
  }

  async function handlePhotosSelected(files: FileList) {
    const room = MAX_PHOTOS - photos.length;
    const toAdd = Array.from(files).slice(0, Math.max(room, 0));
    const items: MediaItem[] = toAdd.map((file) => ({
      localId: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      path: null,
      uploading: true,
      error: false,
    }));
    setPhotos((prev) => [...prev, ...items]);

    toAdd.forEach(async (file, i) => {
      const path = await uploadFile(file);
      setPhotos((prev) =>
        prev.map((p) =>
          p.localId === items[i].localId ? { ...p, path, uploading: false, error: !path } : p
        )
      );
    });
  }

  // Vidéos d'exécution : plusieurs d'un coup depuis la galerie, chacune avec
  // son exercice. Envoi immédiat, une par une, avec l'état visible.
  async function handleVideosSelected(files: FileList) {
    const room = MAX_VIDEOS - videos.length;
    const toAdd = Array.from(files).slice(0, Math.max(room, 0));
    const items = toAdd.map((file) => ({
      localId: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      path: null,
      uploading: file.size <= MAX_VIDEO_BYTES,
      error: file.size > MAX_VIDEO_BYTES,
      tooBig: file.size > MAX_VIDEO_BYTES,
      label: "",
    }));
    setVideos((prev) => [...prev, ...items]);
    toAdd.forEach(async (file, i) => {
      if (file.size > MAX_VIDEO_BYTES) return;
      const path = await uploadFile(file);
      setVideos((prev) => prev.map((v) => (v.localId === items[i].localId ? { ...v, path, uploading: false, error: !path } : v)));
    });
  }

  const mediaUploading = photos.some((p) => p.uploading) || videos.some((v) => v.uploading);

  if (state && "success" in state) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(var(--ep-ok-rgb),0.12)", border: "1px solid rgba(var(--ep-ok-rgb),0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={24} style={{ color: "var(--ep-ok)" }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 900, color: "var(--ep-ok)", margin: 0, letterSpacing: "-0.01em" }}>
          {t("Check-in envoyé")}
        </p>
        <p style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.3)", margin: 0 }}>
          {t("Ton coach va recevoir ton bilan et te répondre rapidement.")}
        </p>
      </div>
    );
  }

  return (
    // Envoi par onSubmit plutôt que <form action> : React 19 vide les champs
    // non contrôlés après chaque form action, même quand le serveur renvoie
    // une erreur. Un check-in refusé (déjà envoyé depuis un autre onglet,
    // échec d'enregistrement) effaçait toutes les réponses écrites.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      style={{ display: "flex", flexDirection: "column", gap: 28 }}
    >

      {/* ── Poids ───────────────────────────────────────────────────────────── */}
      <div>
        <Section title={t("Poids")} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className={lbl}>{t("Poids fin de semaine (kg)")}</label>
            <input
              name="weight"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="82.5" aria-label="82.5"
              style={{ width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: "1px solid rgba(var(--ep-line-rgb),0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--ep-ink)", outline: "none" }}
            />
          </div>
          <div>
            <label className={lbl}>
              {t("Poids moyen semaine (kg)")}
              {weightAvgFromLogs && (
                <span style={{ color: "rgba(var(--ep-accent-rgb),0.6)", marginLeft: 6 }}>≈ {weightAvgFromLogs}</span>
              )}
            </label>
            <input
              name="weight_avg"
              type="number"
              step="0.1"
              min="30"
              max="300"
              defaultValue={weightAvgFromLogs ?? ""}
              placeholder="83.0" aria-label="83.0"
              style={{ width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: "1px solid rgba(var(--ep-line-rgb),0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "var(--ep-ink)", outline: "none" }}
            />
          </div>
        </div>
      </div>

      {/* ── Photos physique ────────────────────────────────────────────────── */}
      <div>
        <Section title={t("Photos physique de la semaine")} />

        {/* Suggestion Lens Buddy — la meilleure appli pour prendre des photos
            de comparaison cohérentes (mêmes angles, même pose) semaine après
            semaine, ce qui manque quand on prend juste une photo au hasard. */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          background: "rgba(var(--ep-accent-rgb),0.06)", border: "1px solid rgba(var(--ep-accent-rgb),0.15)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 14,
        }}>
          <Sparkles size={13} style={{ color: "var(--ep-accent)", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.5, margin: 0 }}>
            {t("Astuce : l'appli")}{" "}<strong style={{ color: "var(--ep-ink)" }}>{t("Lens Buddy")}</strong>{" "}{t("aide à reprendre exactement la même pose et le même angle chaque semaine, la meilleure façon d'avoir des photos de comparaison vraiment lisibles.")}
          </p>
        </div>

        <label className={lbl}>{t("Photos (")}{photos.length}/{MAX_PHOTOS})</label>
        {/* Comparateur photo : c'est l'ordre d'envoi qui donne l'angle. */}
        <p style={{ fontSize: 10.5, color: "rgba(var(--ep-ink-rgb),0.45)", margin: "-2px 0 8px", lineHeight: 1.45 }}>
          {t("Dans l'ordre : face, profil, dos. Le comparateur aligne tout seul les mêmes angles d'une semaine à l'autre.")}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {photos.map((p) => (
            <div key={p.localId} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(var(--ep-line-rgb),0.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(var(--ep-shade-rgb),0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "var(--ep-strong)" }} />
                </div>
              )}
              {p.error && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(var(--ep-accent-rgb),0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, color: "var(--ep-strong)", fontWeight: 800 }}>{t("Échec")}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((x) => x.localId !== p.localId))}
                style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(var(--ep-shade-rgb),0.65)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                aria-label={t("Retirer cette photo")}
              >
                <X size={11} style={{ color: "var(--ep-strong)" }} />
              </button>
              <input type="hidden" name="photo_paths" value={p.path ?? ""} />
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              style={{
                width: 64, height: 64, borderRadius: 10, cursor: "pointer",
                border: "1px dashed rgba(var(--ep-line-rgb),0.4)", background: "rgba(var(--ep-shade-rgb),0.3)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                color: "rgba(var(--ep-ink-rgb),0.4)",
              }}
            >
              <Camera size={16} />
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>{t("Photo")}</span>
            </button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label={t("Ajouter des photos")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handlePhotosSelected(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── Bilan de la semaine ───────────────────────────────────────────── */}
      <div>
        <Section title={t("Bilan de la semaine")} />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Attitude 1-10 + question conditionnelle */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className={lbl} style={{ marginBottom: 0 }}>{t("1. Ton attitude sur la semaine")}</label>
              {attitudeRating !== "" && (
                <span style={{ fontSize: 13, fontWeight: 900, color: "var(--ep-accent)" }}>{attitudeRating}/10</span>
              )}
            </div>
            <input
              name="attitude_rating"
              type="range"
              min={1}
              max={10}
              value={attitudeRating === "" ? 5 : attitudeRating}
              onChange={(e) => setAttitudeRating(Number(e.target.value))}
              aria-label={t("Ton attitude sur la semaine")}
              className="w-full accent-(--ep-accent)"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(var(--ep-ink-rgb),0.25)" }}>
              <span>{t("Très négative")}</span>
              <span>{t("Excellente")}</span>
            </div>
            {needsAttitudeExplanation && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <AlertCircle size={12} style={{ color: "var(--ep-accent)" }} />
                  <label className={lbl} style={{ marginBottom: 0 }}>
                    {t("Explique-nous pourquoi")}{" "}<span className="text-(--ep-accent)">*</span>
                  </label>
                </div>
                <textarea
                  name="attitude_explanation"
                  rows={2}
                  required
                  placeholder={isLowAttitude
                    ? t("Qu'est-ce qui a pesé sur ton attitude cette semaine ?")
                    : t("Qu'est-ce qui t'a mis dans cet état d'esprit ?")}
                  aria-label={t("Explique-nous pourquoi")}
                  className={inp}
                />
              </div>
            )}
          </div>

          {/* 3 plus grosses victoires */}
          <div>
            <label className={lbl}>{t("2. Tes 3 plus grosses victoires de la semaine")}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input name="biggest_win" placeholder={t("Victoire n°1")} aria-label={t("Victoire n°1")} className={inp} style={{ resize: "none" }} />
              <input name="biggest_win_2" placeholder={t("Victoire n°2")} aria-label={t("Victoire n°2")} className={inp} style={{ resize: "none" }} />
              <input name="biggest_win_3" placeholder={t("Victoire n°3")} aria-label={t("Victoire n°3")} className={inp} style={{ resize: "none" }} />
            </div>
          </div>

          <Q
            name="training_review"
            question="3. Évaluation de tes performances à l'entraînement"
            placeholder={t("Charges, sensations, séances manquées, intensité ressentie…")}
          />
          <Q
            name="work_impact"
            question="4. Événements personnels qui ont impacté ta semaine"
            placeholder={t("Travail, vie perso, imprévus, fatigue accumulée…")}
          />
          <Q
            name="improvement_reflection"
            question="5. Comment améliorer la semaine prochaine ?"
            placeholder={t("Ce que tu comptes changer ou mieux gérer…")}
          />
          <Q
            name="entourage_support"
            question="6. Ton entourage aide ou complique ton suivi ?"
            placeholder={t("Sorties au resto, soutien à la maison, pression sociale…")}
          />
          <Q
            name="upcoming_obstacles"
            question="7. Événements prévus la semaine prochaine"
            placeholder={t("Déplacement, week-end spécial, repas de famille…")}
          />
          <Q
            name="plan_adherence_feedback"
            question="8. Ton ressenti sur le plan et l'accompagnement"
            placeholder={t("Adhésion au plan, ce qui te convient ou non dans le suivi…")}
          />
        </div>
      </div>

      {/* ── Format de retour préféré ──────────────────────────────────────── */}
      <div>
        <Section title={t("Retour de ton coach")} />
        <label className={lbl}>{t("Comment tu préfères recevoir la réponse ?")}</label>
        <div style={{ display: "flex", gap: 8 }}>
          {FEEDBACK_FORMATS.map(({ value, label }) => (
            <label key={value} style={{ flex: 1, cursor: "pointer" }}>
              <input
                type="radio"
                name="preferred_feedback_format"
                value={value}
                checked={feedbackFormat === value}
                onChange={() => setFeedbackFormat(value)}
                className="sr-only"
              />
              <span style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: 40, borderRadius: 8,
                border: feedbackFormat === value ? "1px solid var(--ep-accent)" : "1px solid rgba(var(--ep-line-rgb),0.3)",
                background: feedbackFormat === value ? "rgba(var(--ep-accent-rgb),0.15)" : "transparent",
                fontSize: 12, fontWeight: 700, color: feedbackFormat === value ? "var(--ep-accent)" : "rgba(var(--ep-ink-rgb),0.4)",
              }}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Vidéos d'exécution ───────────────────────────────────────────── */}
      <div>
        <Section title={t("Vidéos d'exécution")} />
        <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)", margin: "0 0 10px", lineHeight: 1.5 }}>
          {t("Ajoute les vidéos de tes séries depuis ta galerie (plusieurs d'un coup). Ton coach les regarde en premier pendant ton retour.")}
        </p>
        {videos.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
            {videos.map((v, i) => (
              <div key={v.localId} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(var(--ep-shade-rgb),0.3)", border: "1px solid rgba(var(--ep-line-rgb),0.3)", borderRadius: 10, padding: 8 }}>
                <video src={v.previewUrl} muted playsInline preload="metadata" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, background: "#000", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  <input
                    value={v.label}
                    onChange={(e) => setVideos((prev) => prev.map((x) => (x.localId === v.localId ? { ...x, label: e.target.value } : x)))}
                    placeholder={t("Exercice (ex. squat)")}
                    aria-label={`${t("Exercice de la vidéo")} ${i + 1}`}
                    maxLength={80}
                    style={{ width: "100%", background: "rgba(var(--ep-shade-rgb),0.45)", border: "1px solid rgba(var(--ep-line-rgb),0.3)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "var(--ep-ink)", outline: "none" }}
                  />
                  <span style={{ fontSize: 10.5, color: v.error ? "var(--ep-pink)" : v.uploading ? "rgba(var(--ep-ink-rgb),0.5)" : "var(--ep-ok)", display: "flex", alignItems: "center", gap: 5 }}>
                    {v.uploading && <Loader2 size={11} className="animate-spin" />}
                    {v.tooBig ? t("Vidéo trop lourde (100 Mo max) : coupe-la ou colle un lien plus bas.") : v.uploading ? t("Envoi en cours…") : v.error ? t("Échec de l'envoi, retire-la et réessaie.") : t("Vidéo prête")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVideos((prev) => prev.filter((x) => x.localId !== v.localId))}
                  style={{ background: "none", border: "none", cursor: "pointer", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                  aria-label={t("Retirer la vidéo")}
                >
                  <X size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.45)" }} />
                </button>
                {v.path && !v.error && (
                  <>
                    <input type="hidden" name="video_paths" value={v.path} />
                    <input type="hidden" name="video_labels" value={v.label} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {videos.length < MAX_VIDEOS && (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            style={{
              width: "100%", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: "1px dashed rgba(var(--ep-line-rgb),0.4)", background: "rgba(var(--ep-shade-rgb),0.3)", borderRadius: 10,
              cursor: "pointer", color: "rgba(var(--ep-ink-rgb),0.6)",
            }}
          >
            <Video size={15} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{videos.length ? t("Ajouter une autre vidéo") : t("Ajouter mes vidéos")}</span>
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          aria-label={t("Ajouter mes vidéos d'exécution")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleVideosSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          name="video_drive_link"
          value={videoLink}
          onChange={(e) => setVideoLink(e.target.value)}
          type="url"
          inputMode="url"
          placeholder={t("Ou colle un lien (Drive, YouTube...) si une vidéo est trop lourde")}
          aria-label={t("Lien vers tes vidéos")}
          style={{ marginTop: 8, width: "100%", background: "rgba(var(--ep-shade-rgb),0.4)", border: "1px solid rgba(var(--ep-line-rgb),0.3)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--ep-ink)", outline: "none" }}
        />
      </div>

      {state && "error" in state && (
        <p style={{ fontSize: 12, color: "var(--ep-pink)", textAlign: "center", margin: 0 }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || mediaUploading}
        style={{
          width: "100%",
          background: isPending || mediaUploading ? "rgba(var(--ep-accent-rgb),0.5)" : "var(--ep-accent)",
          color: "var(--ep-strong)",
          border: "none",
          borderRadius: 12,
          padding: "14px 0",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: isPending || mediaUploading ? "wait" : "pointer",
        }}
      >
        {isPending ? t("Envoi…") : mediaUploading ? t("Envoi des médias…") : t("Envoyer mon check-in")}
      </button>
    </form>
  );
}
