"use client";

import { useActionState } from "react";
import { submitCheckin } from "@/app/dashboard/client/checkin/actions";
import { CheckCircle2 } from "lucide-react";

const inp =
  "w-full bg-[rgba(0,0,0,0.4)] border border-[rgba(137,4,4,0.3)] rounded-lg px-4 py-3 text-sm text-[#F5EDED] placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/60 transition-colors resize-none";

const lbl =
  "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

function Q({
  name,
  question,
  placeholder,
  rows = 3,
}: {
  name: string;
  question: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className={lbl}>{question}</label>
      <textarea name={name} rows={rows} placeholder={placeholder} className={inp} />
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

export default function CheckinForm({
  weightAvgFromLogs,
}: {
  weightAvgFromLogs?: number | null;
}) {
  const [state, formAction, isPending] = useActionState(submitCheckin, null);

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

      {/* ── 12 questions qualitatives ──────────────────────────────────────── */}
      <div>
        <Section title="Bilan de la semaine" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Q
            name="physique_feeling"
            question="1. Comment tu te sens physiquement cette semaine ?"
            placeholder="Morphologie, définition, rondeurs, eau… Qu'est-ce que tu observes ?"
          />
          <Q
            name="energy_mood"
            question="2. Énergie, humeur et stress"
            placeholder="Niveaux d'énergie dans la journée, humeur générale, stress subi ou ressenti…"
          />
          <Q
            name="biggest_win"
            question="3. Ta plus grosse victoire de la semaine"
            placeholder="Un moment de fierté, une progression, un comportement positif…"
          />
          <Q
            name="training_review"
            question="4. Entraînement"
            placeholder="Performances, sensations, séances manquées, intensité ressentie…"
          />
          <Q
            name="nutrition_review"
            question="5. Nutrition"
            placeholder="Respect du plan, écarts, faim, fringales, repas sociaux…"
          />
          <Q
            name="digestion_review"
            question="6. Digestion"
            placeholder="Transit, ballonnements, inconforts, tolérance aux aliments…"
          />
          <Q
            name="work_impact"
            question="7. Travail / vie perso"
            placeholder="Charge de travail, déplacements, horaires, contraintes extérieures…"
          />
          <Q
            name="sleep_review"
            question="8. Sommeil"
            placeholder="Heures dormies, qualité, réveils nocturnes, réveil le matin…"
          />
          <Q
            name="upcoming_obstacles"
            question="9. Obstacles ou contraintes à venir"
            placeholder="Semaine chargée, week-end spécial, déplacement, événement social…"
          />
          <Q
            name="coach_questions"
            question="10. Questions pour ton coach"
            placeholder="Ce que tu veux clarifier, approfondir ou revoir…"
          />
          <Q
            name="additional_notes"
            question="11. Notes supplémentaires"
            placeholder="Tout ce qui n'entre pas dans les cases ci-dessus…"
            rows={2}
          />
        </div>
      </div>

      {/* ── Médias ───────────────────────────────────────────────────────────── */}
      <div>
        <Section title="Photos & vidéo" />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label className={lbl}>Lien Google Drive — photos</label>
            <input
              name="photo_drive_link"
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#F5EDED", outline: "none" }}
            />
          </div>
          <div>
            <label className={lbl}>Lien Google Drive — vidéo posing</label>
            <input
              name="video_drive_link"
              type="url"
              placeholder="https://drive.google.com/file/d/..."
              style={{ width: "100%", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(137,4,4,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#F5EDED", outline: "none" }}
            />
          </div>
        </div>
      </div>

      {state && "error" in state && (
        <p style={{ fontSize: 12, color: "#FDC4C4", textAlign: "center", margin: 0 }}>{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        style={{
          width: "100%",
          background: isPending ? "rgba(224,30,30,0.5)" : "#E01E1E",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          padding: "14px 0",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          cursor: isPending ? "wait" : "pointer",
        }}
      >
        {isPending ? "Envoi…" : "Envoyer mon check-in"}
      </button>
    </form>
  );
}
