"use client";

import { useActionState, useRef, useState } from "react";
import { submitCheckin } from "@/app/dashboard/client/checkin/actions";
import { createClientSupabase } from "@/lib/supabase-client";
import { CheckCircle2, Camera, Video, X, Loader2, Sparkles, AlertCircle } from "lucide-react";

const inp =
  "w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(137,4,4,0.3)] rounded-lg px-4 py-3 text-sm text-[#F5EDED] placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/60 transition-colors resize-none";

const lbl =
  "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

const MAX_PHOTOS = 4;
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
        {question} {required && <span className="text-[#E01E1E]">*</span>}
      </label>
      <textarea name={name} rows={rows} placeholder={placeholder} className={inp} required={required} />
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p style={{
      fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
      color: "rgba(224,30,30,0.55)", margin: "0 0 14px",
      borderBottom: "1px solid rgba(137,4,4,0.12)", paddingBottom: 6,
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
  const [state, formAction, isPending] = useActionState(submitCheckin, null);
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [video, setVideo] = useState<MediaItem | null>(null);
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
      const ext = file.name.split(".").pop() || (file.type.startsWith("video") ? "mp4" : "jpg");
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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

  async function handleVideoSelected(file: File) {
    const item: MediaItem = {
      localId: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      path: null,
      uploading: true,
      error: false,
    };
    setVideo(item);
    const path = await uploadFile(file);
    setVideo((prev) => (prev && prev.localId === item.localId ? { ...prev, path, uploading: false, error: !path } : prev));
  }

  const mediaUploading = photos.some((p) => p.uploading) || !!video?.uploading;

  if (state && "success" in state) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CheckCircle2 size={24} style={{ color: "#4ade80" }} />
        </div>
        <p style={{ fontSize: 16, fontWeight: 900, color: "#4ade80", margin: 0, letterSpacing: "-0.01em" }}>
          Check-in envoyé
        </p>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
          Ton coach va recevoir ton bilan et te répondre rapidement.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 28 }}>

      {/* ── Poids ───────────────────────────────────────────────────────────── */}
      <div>
        <Section title="Poids" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className={lbl}>Poids fin de semaine (kg)</label>
            <input
              name="weight"
              type="number"
              step="0.1"
              min="30"
              max="300"
              placeholder="82.5"
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#F5EDED", outline: "none" }}
            />
          </div>
          <div>
            <label className={lbl}>
              Poids moyen semaine (kg)
              {weightAvgFromLogs && (
                <span style={{ color: "rgba(224,30,30,0.6)", marginLeft: 6 }}>≈ {weightAvgFromLogs}</span>
              )}
            </label>
            <input
              name="weight_avg"
              type="number"
              step="0.1"
              min="30"
              max="300"
              defaultValue={weightAvgFromLogs ?? ""}
              placeholder="83.0"
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#F5EDED", outline: "none" }}
            />
          </div>
        </div>
      </div>

      {/* ── Photos physique ────────────────────────────────────────────────── */}
      <div>
        <Section title="Photos physique de la semaine" />

        {/* Suggestion Lens Buddy — la meilleure appli pour prendre des photos
            de comparaison cohérentes (mêmes angles, même pose) semaine après
            semaine, ce qui manque quand on prend juste une photo au hasard. */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.15)",
          borderRadius: 10, padding: "10px 12px", marginBottom: 14,
        }}>
          <Sparkles size={13} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.55)", lineHeight: 1.5, margin: 0 }}>
            Astuce : l&apos;appli <strong style={{ color: "#F5EDED" }}>Lens Buddy</strong> aide à reprendre
            exactement la même pose et le même angle chaque semaine — la meilleure
            façon d&apos;avoir des photos de comparaison vraiment lisibles.
          </p>
        </div>

        <label className={lbl}>Photos ({photos.length}/{MAX_PHOTOS})</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {photos.map((p) => (
            <div key={p.localId} style={{ position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(137,4,4,0.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              {p.uploading && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: "#fff" }} />
                </div>
              )}
              {p.error && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(224,30,30,0.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, color: "#fff", fontWeight: 800 }}>Échec</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPhotos((prev) => prev.filter((x) => x.localId !== p.localId))}
                style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.65)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                aria-label="Retirer cette photo"
              >
                <X size={11} style={{ color: "#fff" }} />
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
                border: "1px dashed rgba(137,4,4,0.4)", background: "rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                color: "rgba(245,237,237,0.4)",
              }}
            >
              <Camera size={16} />
              <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase" }}>Photo</span>
            </button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handlePhotosSelected(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* ── Bilan de la semaine ───────────────────────────────────────────── */}
      <div>
        <Section title="Bilan de la semaine" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Attitude 1-10 + question conditionnelle */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <label className={lbl} style={{ marginBottom: 0 }}>1. Ton attitude sur la semaine</label>
              {attitudeRating !== "" && (
                <span style={{ fontSize: 13, fontWeight: 900, color: "#E01E1E" }}>{attitudeRating}/10</span>
              )}
            </div>
            <input
              name="attitude_rating"
              type="range"
              min={1}
              max={10}
              value={attitudeRating === "" ? 5 : attitudeRating}
              onChange={(e) => setAttitudeRating(Number(e.target.value))}
              className="w-full accent-[#E01E1E]"
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "rgba(245,237,237,0.25)" }}>
              <span>Très négative</span>
              <span>Excellente</span>
            </div>
            {needsAttitudeExplanation && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <AlertCircle size={12} style={{ color: "#E01E1E" }} />
                  <label className={lbl} style={{ marginBottom: 0 }}>
                    Explique-nous pourquoi <span className="text-[#E01E1E]">*</span>
                  </label>
                </div>
                <textarea
                  name="attitude_explanation"
                  rows={2}
                  required
                  placeholder={isLowAttitude
                    ? "Qu'est-ce qui a pesé sur ton attitude cette semaine ?"
                    : "Qu'est-ce qui t'a mis dans cet état d'esprit ?"}
                  className={inp}
                />
              </div>
            )}
          </div>

          {/* 3 plus grosses victoires */}
          <div>
            <label className={lbl}>2. Tes 3 plus grosses victoires de la semaine</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input name="biggest_win" placeholder="Victoire n°1" className={inp} style={{ resize: "none" }} />
              <input name="biggest_win_2" placeholder="Victoire n°2" className={inp} style={{ resize: "none" }} />
              <input name="biggest_win_3" placeholder="Victoire n°3" className={inp} style={{ resize: "none" }} />
            </div>
          </div>

          <Q
            name="training_review"
            question="3. Évaluation de tes performances à l'entraînement"
            placeholder="Charges, sensations, séances manquées, intensité ressentie…"
          />
          <Q
            name="work_impact"
            question="4. Événements personnels qui ont impacté ta semaine"
            placeholder="Travail, vie perso, imprévus, fatigue accumulée…"
          />
          <Q
            name="improvement_reflection"
            question="5. Comment améliorer la semaine prochaine ?"
            placeholder="Ce que tu comptes changer ou mieux gérer…"
          />
          <Q
            name="entourage_support"
            question="6. Ton entourage aide ou complique ton suivi ?"
            placeholder="Sorties au resto, soutien à la maison, pression sociale…"
          />
          <Q
            name="upcoming_obstacles"
            question="7. Événements prévus la semaine prochaine"
            placeholder="Déplacement, week-end spécial, repas de famille…"
          />
          <Q
            name="plan_adherence_feedback"
            question="8. Ton ressenti sur le plan et l'accompagnement"
            placeholder="Adhésion au plan, ce qui te convient ou non dans le suivi…"
          />
        </div>
      </div>

      {/* ── Format de retour préféré ──────────────────────────────────────── */}
      <div>
        <Section title="Retour de ton coach" />
        <label className={lbl}>Comment tu préfères recevoir la réponse ?</label>
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
                border: feedbackFormat === value ? "1px solid #E01E1E" : "1px solid rgba(137,4,4,0.3)",
                background: feedbackFormat === value ? "rgba(224,30,30,0.15)" : "transparent",
                fontSize: 12, fontWeight: 700, color: feedbackFormat === value ? "#E01E1E" : "rgba(245,237,237,0.4)",
              }}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* ── Vidéo d'exécution ─────────────────────────────────────────────── */}
      <div>
        <Section title="Vidéo d'exécution (correction technique)" />
        {video ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 10, padding: "8px 12px" }}>
            <Video size={14} style={{ color: video.error ? "#E01E1E" : "#4ade80", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "rgba(245,237,237,0.6)", flex: 1 }}>
              {video.uploading ? "Envoi en cours…" : video.error ? "Échec de l'envoi" : "Vidéo prête"}
            </span>
            {video.uploading && <Loader2 size={13} className="animate-spin" style={{ color: "rgba(245,237,237,0.4)" }} />}
            <button
              type="button"
              onClick={() => setVideo(null)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
              aria-label="Retirer la vidéo"
            >
              <X size={13} style={{ color: "rgba(245,237,237,0.4)" }} />
            </button>
            <input type="hidden" name="video_path" value={video.path ?? ""} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              border: "1px dashed rgba(137,4,4,0.4)", background: "rgba(0,0,0,0.3)", borderRadius: 10,
              padding: "10px 0", cursor: "pointer", color: "rgba(245,237,237,0.4)",
            }}
          >
            <Video size={14} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Filmer un exercice à corriger</span>
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleVideoSelected(file);
            e.target.value = "";
          }}
        />
        <p style={{ fontSize: 9, color: "rgba(245,237,237,0.2)", marginTop: 6 }}>
          Optionnel — pour un retour technique de ton coach sur un exercice précis.
        </p>
      </div>

      {state && "error" in state && (
        <p style={{ fontSize: 12, color: "#FDC4C4", textAlign: "center", margin: 0 }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || mediaUploading}
        style={{
          width: "100%",
          background: isPending || mediaUploading ? "rgba(224,30,30,0.5)" : "#E01E1E",
          color: "#fff",
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
        {isPending ? "Envoi…" : mediaUploading ? "Envoi des médias…" : "Envoyer mon check-in"}
      </button>
    </form>
  );
}
