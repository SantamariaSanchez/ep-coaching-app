import { redirect } from "next/navigation";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getTotalPoints } from "@/lib/gamification";
import { isCoachAcceptingNewClients, isOnWaitlist } from "@/utils/waitlist";
import WaitlistJoinButton from "@/components/client/WaitlistJoinButton";
import {
  PhoneCall,
  Dumbbell,
  Apple,
  HeartHandshake,
  GraduationCap,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  Watch,
} from "lucide-react";
import PointsProgressCard from "@/components/ui/PointsProgressCard";

const COACHING_PILLARS = [
  {
    icon: Dumbbell,
    title: "Entraînement sur-mesure",
    body: "Ton programme est construit par ton coach, pas généré. Séances, exercices, charges, progressions : tout est pensé pour toi et ajusté chaque semaine selon tes retours.",
  },
  {
    icon: Apple,
    title: "Nutrition qui colle à ta vie",
    body: "Fini les régimes impossibles. Ton plan alimentaire respecte tes préférences, ton planning et ta phase de progression (prise, perte ou maintenance).",
  },
  {
    icon: HeartHandshake,
    title: "Suivi humain, chaque semaine",
    body: "Bilans hebdomadaires, messagerie directe, check-ins photos, retours vidéo sur tes mouvements, appels live en groupe ou 1:1, accompagnement mindset. Quelqu'un qui connaît vraiment ta progression.",
  },
  {
    icon: Watch,
    title: "Bague Oura Ring offerte",
    body: "Ton sommeil, ta récupération et ta variabilité cardiaque connectés automatiquement à ton suivi. Aucune saisie manuelle, juste les bonnes décisions au bon moment.",
  },
  {
    icon: GraduationCap,
    title: "5 formations à venir",
    body: "Musculation, nutrition, training, entrepreneuriat, psychologie : environ 25h de contenu au total, en cours de tournage. Accessibles à vie une fois disponibles.",
  },
];

export const dynamic = "force-dynamic";

export default async function AbonnementPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const alreadySubscribed = isSubscribed(profile);
  const [points, coachAccepting, onWaitlist] = await Promise.all([
    getTotalPoints(user.id),
    // Item 45 : le coach du membre est-il à capacité ? Non pertinent si
    // déjà client (alreadySubscribed) ou pas encore de coach assigné.
    !alreadySubscribed && profile?.coach_id ? isCoachAcceptingNewClients(profile.coach_id) : Promise.resolve(true),
    !alreadySubscribed && profile?.coach_id ? isOnWaitlist(profile.coach_id, user.id) : Promise.resolve(false),
  ]);
  const showWaitlist = !alreadySubscribed && !coachAccepting;

  // Avant de prendre rendez-vous, le prospect passe par un questionnaire de
  // préqualification — plus de lien Calendly direct.
  const prequalificationUrl = "https://ep-coaching-formulaires.vercel.app/prequalification";

  return (
    <div
      className="page-transition"
      style={{ padding: "32px 20px 100px", maxWidth: 600, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 32 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(224,30,30,0.55)",
            marginBottom: 4,
          }}
        >
          Mon coaching
        </p>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: "-0.01em",
            color: "#F5EDED",
            margin: "0 0 12px",
            lineHeight: 1.0,
            textTransform: "uppercase",
          }}
        >
          Le coaching individuel
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(245,237,237,0.5)",
            lineHeight: 1.7,
            margin: "0 0 14px",
          }}
        >
          Cette page ne concerne que ça : avoir un vrai coach humain, en plus. Tout ce que tu utilises déjà dans l&apos;app (programme, logbook, nutrition, bilan, communauté...) reste gratuit, à vie, que tu réserves un appel ou non.
        </p>
        {/* Item 46 : distinct de "jamais été client" — quelqu'un qui vient de
            perdre l'accès mérite un message qui reconnaît ce qui s'est
            passé plutôt que le pitch marketing générique ci-dessous. */}
        {profile?.subscription_status === "canceled" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "var(--radius-lg)", padding: "12px 16px", marginBottom: 14,
          }}>
            <p style={{ margin: 0, fontSize: 12.5, color: "#fbbf24", fontWeight: 600, lineHeight: 1.5 }}>
              Ton coaching payant s&apos;est arrêté. Tu gardes l&apos;accès à tous les outils gratuits, pour
              réactiver le suivi avec ton coach, réserve un nouvel appel ci-dessous.
            </p>
          </div>
        )}
        {!alreadySubscribed && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 700, color: "#4ade80",
            border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.06)",
            borderRadius: 999, padding: "5px 12px",
          }}>
            <CheckCircle2 size={12} /> Aucune obligation, l&apos;appel est gratuit et sans engagement
          </div>
        )}
      </div>

      {alreadySubscribed ? (
        /* Already a paying client */
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(74,222,128,0.07)",
            border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "var(--radius-xl)",
            padding: "16px 20px",
            marginBottom: 28,
          }}
        >
          <CheckCircle2 size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#4ade80",
                margin: "0 0 2px",
              }}
            >
              Tu es déjà client EP Coaching
            </p>
            <p style={{ fontSize: 11, color: "rgba(74,222,128,0.6)", margin: 0 }}>
              Tout le contenu est débloqué pour toi.
            </p>
          </div>
        </div>
      ) : (
        /* Main CTA block */
        <div
          className="ep-card-hero animate-fade-up"
          style={{
            padding: "28px 24px",
            marginBottom: 28,
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(224,30,30,0.1) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(245,237,237,0.35)",
              marginBottom: 10,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Prochaine étape
          </p>
          {showWaitlist ? (
            <>
              <h2 className="ep-h2" style={{ marginBottom: 12 }}>
                Coaching complet pour le moment
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(245,237,237,0.45)",
                  lineHeight: 1.65,
                  margin: "0 0 24px",
                }}
              >
                Ton coach n&apos;ouvre pas de nouvelle place tout de suite. Rejoins la liste d&apos;attente,
                il te contactera dès qu&apos;une place se libère.
              </p>
              <WaitlistJoinButton alreadyOnWaitlist={onWaitlist} />
            </>
          ) : (
            <>
              <h2
                className="ep-h2"
                style={{ marginBottom: 12 }}
              >
                Un appel de 30 min pour voir si le coaching te correspond
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(245,237,237,0.45)",
                  lineHeight: 1.65,
                  margin: "0 0 24px",
                }}
              >
                Pas de pression. On fait le point sur tes objectifs, tes blocages, et on voit ensemble si l&apos;accompagnement est fait pour toi.
              </p>
              <a
                href={prequalificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#E01E1E",
                  color: "#fff",
                  padding: "14px 28px",
                  borderRadius: "var(--radius-lg)",
                  fontWeight: 800,
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  textDecoration: "none",
                  boxShadow: "0 4px 24px rgba(224,30,30,0.35)",
                }}
              >
                <PhoneCall size={16} />
                Réserve ton appel découverte
                <ArrowRight size={15} />
              </a>
            </>
          )}
        </div>
      )}

      {/* Ce qui change vraiment : coach humain, pas un algorithme */}
      <section
        className="animate-fade-up"
        style={{
          display: "flex",
          gap: 14,
          padding: "20px",
          marginBottom: 28,
          borderRadius: "var(--radius-xl)",
          background: "rgba(224,30,30,0.05)",
          border: "1px solid rgba(224,30,30,0.16)",
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "rgba(224,30,30,0.12)", border: "1px solid rgba(224,30,30,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <UserCheck size={18} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
        </div>
        <div>
          <h2
            style={{
              fontSize: 15, fontWeight: 900, letterSpacing: "-0.02em",
              color: "#F5EDED", margin: "0 0 6px",
            }}
          >
            Ton coach, c&apos;est moi. Pas un algorithme.
          </h2>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.55)", lineHeight: 1.7, margin: 0 }}>
            Je regarde ton programme, ton bilan et ta nutrition chaque semaine. J&apos;ajuste
            ce qui marche pas. Tu me parles, je te réponds, moi, pas un bot. Aucun plan
            généré automatiquement.
          </p>
        </div>
      </section>

      {/* Coaching pillars */}
      <section style={{ marginBottom: 28 }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(245,237,237,0.22)",
            marginBottom: 14,
          }}
        >
          Concrètement, ce que ça change au quotidien
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {COACHING_PILLARS.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className="ep-card animate-fade-up"
              style={{ animationDelay: `${i * 60}ms`, padding: "18px 20px" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(224,30,30,0.1)",
                    border: "1px solid rgba(224,30,30,0.18)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={16} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
                </div>
                <h3
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "-0.02em",
                    color: "#F5EDED",
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "rgba(245,237,237,0.5)",
                  lineHeight: 1.7,
                  margin: 0,
                  paddingLeft: 48,
                }}
              >
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Second CTA for non-subscribed (masqué si liste d'attente, déjà proposée ci-dessus) */}
      {!alreadySubscribed && !showWaitlist && (
        <section style={{ marginBottom: 28 }}>
          <div
            style={{
              background: "rgba(224,30,30,0.05)",
              border: "1px solid rgba(224,30,30,0.18)",
              borderRadius: "var(--radius-xl)",
              padding: "22px 20px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(245,237,237,0.5)",
                margin: "0 0 16px",
                lineHeight: 1.5,
              }}
            >
              Prêt à arrêter de tâtonner seul ?
            </p>
            <a
              href={prequalificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#E01E1E",
                padding: "12px 24px",
                borderRadius: "var(--radius-lg)",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.02em",
                textDecoration: "none",
                border: "1.5px solid rgba(224,30,30,0.4)",
              }}
            >
              <PhoneCall size={14} />
              Réserve ton appel découverte
            </a>
          </div>
        </section>
      )}

      {/* Points / gamification */}
      <section>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(245,237,237,0.22)",
            marginBottom: 12,
          }}
        >
          Ta progression dans l&apos;app
        </p>
        <PointsProgressCard points={points} isSubscribed={alreadySubscribed} />
      </section>
    </div>
  );
}
