export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import {
  getThisWeekCheckin,
  getClientPastCheckins,
  getISOWeek,
  getWeekStart,
  type CheckIn,
} from "@/utils/checkins";
import { getClientDailyLogs, computeWeeklyAverages } from "@/utils/daily-logs";
import CheckinForm from "@/components/ui/CheckinForm";
import CoachOnlyGate from "@/components/ui/CoachOnlyGate";
import { CheckCircle2, Clock, Star, ExternalLink, CalendarDays } from "lucide-react";

const DAY_NAMES = ["", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

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

  // coach_notes/coach_rating (répondu depuis l'onglet Check-ins de la fiche
  // client) est désormais le seul chemin de retour — bilan_text/bilan_rating
  // n'existe qu'en fallback pour les bilans déjà envoyés avant ce changement.
  const replyText = checkin.coach_notes ?? checkin.bilan_text;
  const replyRating = checkin.coach_rating ?? checkin.bilan_rating;
  const hasBilan = checkin.coach_replied_at != null || checkin.bilan_sent_at != null;

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

      {/* Attitude */}
      {checkin.attitude_rating != null && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.45)", margin: "0 0 5px" }}>
            Attitude sur la semaine
          </p>
          <p style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{checkin.attitude_rating}/10</p>
        </div>
      )}
      <QA q="Pourquoi cette attitude" a={checkin.attitude_explanation} />

      {/* Qualitative questions */}
      <QA q="Victoire n°1" a={checkin.biggest_win} />
      <QA q="Victoire n°2" a={checkin.biggest_win_2} />
      <QA q="Victoire n°3" a={checkin.biggest_win_3} />
      <QA q="Performances entraînement" a={checkin.training_review} />
      <QA q="Événements personnels" a={checkin.work_impact} />
      <QA q="Amélioration semaine prochaine" a={checkin.improvement_reflection} />
      <QA q="Soutien de l'entourage" a={checkin.entourage_support} />
      <QA q="Événements prévus" a={checkin.upcoming_obstacles} />
      <QA q="Ressenti sur l'accompagnement" a={checkin.plan_adherence_feedback} />
      {/* Legacy — anciennes questions retirées du formulaire mais gardées à
          l'affichage pour les check-ins déjà envoyés avant la refonte. */}
      <QA q="Physique" a={checkin.physique_feeling} />
      <QA q="Énergie / humeur / stress" a={checkin.energy_mood} />
      <QA q="Nutrition" a={checkin.nutrition_review} />
      <QA q="Digestion" a={checkin.digestion_review} />
      <QA q="Sommeil" a={checkin.sleep_review} />
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
          {replyRating != null && (
            <div style={{ marginBottom: 8 }}>
              <BilanRating rating={replyRating} />
            </div>
          )}
          {replyText && (
            <p style={{ fontSize: 13, color: "rgba(245,237,237,0.72)", lineHeight: 1.6, margin: 0 }}>
              {replyText}
            </p>
          )}
          {checkin.coach_video_url && (
            <video
              src={checkin.coach_video_url}
              controls
              playsInline
              style={{ width: "100%", maxWidth: 320, borderRadius: 10, marginTop: 10 }}
            />
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
  // Bilan hebdo lu et repondu par un vrai coach, sans coach personne pour le
  // lire de l'autre cote — reserve aux clients coaches (voir CoachOnlyGate).
  if (!isSubscribed(profile)) return <CoachOnlyGate icon={CalendarDays} title="Check-in hebdomadaire" />;

  const [existing, pastCheckins, recentLogs] = await Promise.all([
    getThisWeekCheckin(user.id),
    getClientPastCheckins(user.id),
    getClientDailyLogs(user.id, 7),
  ]);

  const weekNum = getISOWeek(new Date(getWeekStart()));
  const avgWeight = computeWeeklyAverages(recentLogs).weight;
  const checkinDay = profile?.checkin_day ?? 1;
  const isCheckinDay = isoWeekday(new Date()) === checkinDay;

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 560, margin: "0 auto" }}>

      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Semaine {weekNum}</p>
        <h1 className="ep-h1">Check-in</h1>
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
            {existing.attitude_rating != null && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)", margin: "0 0 2px" }}>
                  Attitude sur la semaine
                </p>
                <p style={{ fontSize: 16, fontWeight: 900, color: "#F5EDED", margin: 0 }}>{existing.attitude_rating}/10</p>
              </div>
            )}
            <QA q="Pourquoi cette attitude" a={existing.attitude_explanation} />
            <QA q="Victoire n°1" a={existing.biggest_win} />
            <QA q="Victoire n°2" a={existing.biggest_win_2} />
            <QA q="Victoire n°3" a={existing.biggest_win_3} />
            <QA q="Performances entraînement" a={existing.training_review} />
            <QA q="Événements personnels" a={existing.work_impact} />
            <QA q="Amélioration semaine prochaine" a={existing.improvement_reflection} />
            <QA q="Soutien de l'entourage" a={existing.entourage_support} />
            <QA q="Événements prévus" a={existing.upcoming_obstacles} />
            <QA q="Ressenti sur l'accompagnement" a={existing.plan_adherence_feedback} />
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
          {existing.coach_replied_at || existing.bilan_sent_at ? (
            <div className="ep-card-highlighted" style={{ padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Star size={13} style={{ color: "#E01E1E" }} />
                <p className="ep-section-title" style={{ margin: 0 }}>
                  Bilan de ton coach
                  {(existing.coach_rating ?? existing.bilan_rating) != null && (
                    <span style={{ marginLeft: 8, color: "#fbbf24" }}>{existing.coach_rating ?? existing.bilan_rating}/10</span>
                  )}
                </p>
              </div>
              {(existing.coach_rating ?? existing.bilan_rating) != null && (
                <div style={{ marginBottom: 12 }}>
                  <BilanRating rating={(existing.coach_rating ?? existing.bilan_rating)!} />
                </div>
              )}
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.8)", lineHeight: 1.65, margin: 0 }}>
                {existing.coach_notes ?? existing.bilan_text}
              </p>
              {existing.coach_video_url && (
                <video
                  src={existing.coach_video_url}
                  controls
                  playsInline
                  style={{ width: "100%", maxWidth: 320, borderRadius: 10, marginTop: 10 }}
                />
              )}
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
      ) : isCheckinDay ? (
        <div className="ep-card">
          <CheckinForm weightAvgFromLogs={avgWeight} />
        </div>
      ) : (
        <div className="ep-card" style={{ padding: "24px 20px", textAlign: "center" }}>
          <CalendarDays size={22} style={{ color: "rgba(224,30,30,0.5)", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: "0 0 4px" }}>
            Ton jour de check-in, c&apos;est le {DAY_NAMES[checkinDay]}
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.35)", margin: 0, lineHeight: 1.5 }}>
            Reviens ce jour-là pour l&apos;envoyer. Continue de remplir ton bilan quotidien en attendant.
          </p>
        </div>
      )}

      {/* Past checkins */}
      {pastCheckins.length > 0 && (
        <section style={{ marginTop: 40 }}>
          <p className="ep-section-title" style={{ marginBottom: 4 }}>Historique</p>
          <h2 className="ep-h2" style={{ marginBottom: 16 }}>Mes bilans</h2>
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
