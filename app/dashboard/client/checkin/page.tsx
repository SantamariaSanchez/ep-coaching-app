export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import {
  getThisWeekCheckin,
  getClientPastCheckins,
  getISOWeek,
  getWeekStart,
  type CheckIn,
} from "@/utils/checkins";
import { getClientDailyLogs, computeWeeklyAverages } from "@/utils/daily-logs";
import CheckinForm from "@/components/ui/CheckinForm";
import { CheckCircle2, Clock, Star, ExternalLink } from "lucide-react";

function BilanRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i < rating ? "#fbbf24" : "rgba(137,4,4,0.2)",
        }} />
      ))}
      <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 900, color: "#fbbf24" }}>
        {rating}<span style={{ fontSize: 10, fontWeight: 400, color: "rgba(251,191,36,0.4)" }}>/10</span>
      </span>
    </div>
  );
}

function QA({ q, a }: { q: string; a: string | null | undefined }) {
  if (!a) return null;
  return (
    <div style={{ paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid rgba(137,4,4,0.06)" }}>
      <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.45)", margin: "0 0 5px" }}>{q}</p>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.72)", lineHeight: 1.6, margin: 0 }}>{a}</p>
    </div>
  );
}

function PastCheckinCard({ checkin }: { checkin: CheckIn }) {
  const date = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(checkin.created_at));

  const hasBilan = checkin.bilan_sent_at != null;

  return (
    <div className="ep-card" style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#F5EDED" }}>
            Semaine {checkin.week_number}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.3)" }}>{date}</p>
        </div>
        {hasBilan ? (
          <span className="ep-badge-green" style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <CheckCircle2 size={10} /> Bilan reçu
          </span>
        ) : (
          <span className="ep-badge-amber" style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <Clock size={10} /> En attente
          </span>
        )}
      </div>

      {/* Weight */}
      {(checkin.weight != null || checkin.weight_avg != null) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 12 }}>
          {checkin.weight != null && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>Poids</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{checkin.weight} kg</p>
            </div>
          )}
          {checkin.weight_avg != null && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>Moy. semaine</p>
              <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{checkin.weight_avg} kg</p>
            </div>
          )}
        </div>
      )}

      {/* Qualitative questions */}
      <QA q="Physique" a={checkin.physique_feeling} />
      <QA q="Énergie / humeur / stress" a={checkin.energy_mood} />
      <QA q="Plus grosse victoire" a={checkin.biggest_win} />
      <QA q="Entraînement" a={checkin.training_review} />
      <QA q="Nutrition" a={checkin.nutrition_review} />
      <QA q="Digestion" a={checkin.digestion_review} />
      <QA q="Travail / vie perso" a={checkin.work_impact} />
      <QA q="Sommeil" a={checkin.sleep_review} />
      <QA q="Obstacles à venir" a={checkin.upcoming_obstacles} />
      <QA q="Questions coach" a={checkin.coach_questions} />
      <QA q="Notes" a={checkin.additional_notes} />

      {/* Photos & vidéo uploadées */}
      {(checkin.photo_urls.length > 0 || checkin.video_url) && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {checkin.photo_urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid rgba(137,4,4,0.3)" }} />
            </a>
          ))}
          {checkin.video_url && (
            <a href={checkin.video_url} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>
              <ExternalLink size={11} /> Vidéo
            </a>
          )}
        </div>
      )}

      {/* Anciens liens Drive (check-ins pré-upload direct) */}
      {(checkin.photo_drive_link || checkin.video_drive_link) && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {checkin.photo_drive_link && (
            <a href={checkin.photo_drive_link} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>
              <ExternalLink size={11} /> Photos
            </a>
          )}
          {checkin.video_drive_link && (
            <a href={checkin.video_drive_link} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>
              <ExternalLink size={11} /> Vidéo
            </a>
          )}
        </div>
      )}

      {hasBilan && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(224,30,30,0.1)" }}>
          <p className="ep-section-title" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={10} />
            Bilan de ton coach
          </p>
          {checkin.bilan_rating != null && (
            <div style={{ marginBottom: 8 }}>
              <BilanRating rating={checkin.bilan_rating} />
            </div>
          )}
          {checkin.bilan_text && (
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.72)", lineHeight: 1.6, margin: 0 }}>
              {checkin.bilan_text}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default async function CheckinPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [existing, pastCheckins, recentLogs] = await Promise.all([
    getThisWeekCheckin(user.id),
    getClientPastCheckins(user.id),
    getClientDailyLogs(user.id, 7),
  ]);

  const weekNum = getISOWeek(new Date(getWeekStart()));
  const avgWeight = computeWeeklyAverages(recentLogs).weight;

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 560, margin: "0 auto" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Semaine {weekNum}</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
        }}>
          Check-in
        </h1>
      </div>

      {existing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Sent confirmation */}
          <div className="ep-card animate-scale-in" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 12,
                background: "rgba(74,222,128,0.12)",
                border: "1px solid rgba(74,222,128,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
                  Check-in envoyé
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(245,237,237,0.3)" }}>
                  {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" })
                    .format(new Date(existing.created_at))}
                </p>
              </div>
            </div>
          </div>

          {/* This week recap */}
          <div className="ep-card" style={{ padding: "18px" }}>
            <p className="ep-section-title" style={{ marginBottom: 14 }}>Ton bilan de la semaine</p>
            {(existing.weight != null || existing.weight_avg != null) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px", marginBottom: 14 }}>
                {existing.weight != null && (
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>Poids</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{existing.weight} kg</p>
                  </div>
                )}
                {existing.weight_avg != null && (
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>Moy. semaine</p>
                    <p style={{ fontSize: 16, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{existing.weight_avg} kg</p>
                  </div>
                )}
              </div>
            )}
            <QA q="Physique" a={existing.physique_feeling} />
            <QA q="Énergie / humeur / stress" a={existing.energy_mood} />
            <QA q="Plus grosse victoire" a={existing.biggest_win} />
            <QA q="Entraînement" a={existing.training_review} />
            <QA q="Nutrition" a={existing.nutrition_review} />
            <QA q="Digestion" a={existing.digestion_review} />
            <QA q="Travail / vie perso" a={existing.work_impact} />
            <QA q="Sommeil" a={existing.sleep_review} />
            <QA q="Obstacles à venir" a={existing.upcoming_obstacles} />
            <QA q="Questions coach" a={existing.coach_questions} />
            <QA q="Notes" a={existing.additional_notes} />
            {(existing.photo_urls.length > 0 || existing.video_url) && (
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {existing.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(137,4,4,0.3)" }} />
                  </a>
                ))}
                {existing.video_url && (
                  <a href={existing.video_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>
                    <ExternalLink size={11} /> Vidéo
                  </a>
                )}
              </div>
            )}
            {(existing.photo_drive_link || existing.video_drive_link) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {existing.photo_drive_link && (
                  <a href={existing.photo_drive_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>
                    <ExternalLink size={11} /> Photos
                  </a>
                )}
                {existing.video_drive_link && (
                  <a href={existing.video_drive_link} target="_blank" rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#E01E1E", textDecoration: "none" }}>
                    <ExternalLink size={11} /> Vidéo
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Coach bilan */}
          {existing.bilan_sent_at ? (
            <div className="ep-card-highlighted" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Star size={13} style={{ color: "#E01E1E" }} />
                <p className="ep-section-title" style={{ margin: 0 }}>
                  Bilan de ton coach
                  {existing.bilan_rating != null && (
                    <span style={{ marginLeft: 8, color: "#fbbf24" }}>{existing.bilan_rating}/10</span>
                  )}
                </p>
              </div>
              {existing.bilan_rating != null && (
                <div style={{ marginBottom: 12 }}>
                  <BilanRating rating={existing.bilan_rating} />
                </div>
              )}
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.8)", lineHeight: 1.65, margin: 0 }}>
                {existing.bilan_text}
              </p>
            </div>
          ) : (
            <div className="ep-card" style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={14} style={{ color: "rgba(251,191,36,0.5)" }} />
                <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
                  En attente du bilan coach…
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="ep-card">
          <CheckinForm weightAvgFromLogs={avgWeight} />
        </div>
      )}

      {/* Past checkins */}
      {pastCheckins.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <p className="ep-section-title" style={{ marginBottom: 4 }}>Historique</p>
          <h2 style={{
            fontSize: 22, fontWeight: 900, letterSpacing: "-0.03em",
            color: "#F5EDED", marginBottom: 16,
          }}>
            Mes bilans
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {pastCheckins.map((c) => (
              <PastCheckinCard key={c.id} checkin={c} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
