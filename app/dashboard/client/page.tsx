import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getThisWeekCheckin, getISOWeek } from "@/utils/checkins";
import { getLatestCoachNote } from "@/utils/notes";
import ClientDashboardStats from "@/components/client/DashboardStats";
import {
  TrendingDown, TrendingUp, Minus, Star, MessageCircle, ChevronRight,
  Dumbbell, Apple, Trophy, HelpCircle, BookOpen, Crown, ArrowRight, GraduationCap, Lock,
  Map, ClipboardCheck, Image as ImageIcon,
} from "lucide-react";

// ── Free-tier welcome guide ──────────────────────────────────────────────────

const GUIDE_ITEMS = [
  {
    href: "/dashboard/client/program",
    icon: Dumbbell,
    title: "Mon programme",
    desc: "Crée et gère ton programme d'entraînement, en autonomie.",
    locked: false,
  },
  {
    href: "/dashboard/client/logbook",
    icon: BookOpen,
    title: "Logbook",
    desc: "Enregistre tes séances, séries et records personnels.",
    locked: false,
  },
  {
    href: "/dashboard/client/roadmap",
    icon: Map,
    title: "Road Map",
    desc: "Construis tes phases et tes objectifs court/moyen/long terme.",
    locked: false,
  },
  {
    href: "/dashboard/client/nutrition",
    icon: Apple,
    title: "Ma nutrition",
    desc: "Calcule tes besoins et suis tes repas au quotidien.",
    locked: false,
  },
  {
    href: "/dashboard/client/bilan",
    icon: ClipboardCheck,
    title: "Bilan quotidien",
    desc: "Note ton poids, ton sommeil et ton ressenti chaque jour.",
    locked: false,
  },
  {
    href: "/dashboard/client/photos",
    icon: ImageIcon,
    title: "Photos",
    desc: "Suis ta progression physique en photos.",
    locked: false,
  },
  {
    href: "/dashboard/client/communaute/victoires",
    icon: Trophy,
    title: "Victoires",
    desc: "Partage tes réussites (texte ou photo) avec la communauté.",
    locked: false,
  },
  {
    href: "/dashboard/client/communaute/questions",
    icon: HelpCircle,
    title: "Questions",
    desc: "Pose tes questions et échange avec la communauté.",
    locked: false,
  },
  {
    href: "/dashboard/client/ressources",
    icon: BookOpen,
    title: "Ressources",
    desc: "Guides et lead magnets gratuits, ajoutés régulièrement.",
    locked: false,
  },
  {
    href: "/dashboard/client/abonnement",
    icon: GraduationCap,
    title: "Formations",
    desc: "80h+ de contenu vidéo — débloquées avec le coaching premium.",
    locked: true,
  },
];

function WelcomeGuide({ firstName, goal, level }: { firstName: string; goal: string | null; level: string | null }) {
  return (
    <div
      className="page-transition"
      style={{ padding: "32px 20px 100px", maxWidth: 480, margin: "0 auto" }}
    >
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Bienvenue</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "#F5EDED", margin: 0, lineHeight: 1.1,
        }}>
          Salut {firstName} 👋
        </h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>
          Tu fais partie de la communauté EP Coaching. Ici, tu as accès à des
          outils gratuits pour avancer en autonomie — et tu peux passer
          premium quand tu veux pour un vrai accompagnement coaché.
        </p>
      </div>

      {/* État des lieux */}
      {(goal || level) && (
        <section className="animate-fade-up stagger-2" style={{ marginBottom: 24 }}>
          <p className="ep-section-title">Ton profil</p>
          <div className="ep-card" style={{ padding: "16px 20px", display: "flex", gap: 20 }}>
            {goal && (
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>Objectif</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{goal}</p>
              </div>
            )}
            {level && (
              <div>
                <p className="ep-label" style={{ marginBottom: 4 }}>Niveau</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{level}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Mini-guide */}
      <section className="animate-fade-up stagger-3" style={{ marginBottom: 24 }}>
        <p className="ep-section-title">Ce qui est disponible</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {GUIDE_ITEMS.map(({ href, icon: Icon, title, desc, locked }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", borderRadius: 12,
                background: locked ? "rgba(224,30,30,0.06)" : "rgba(31,1,1,0.7)",
                border: locked ? "1px solid rgba(224,30,30,0.25)" : "1px solid rgba(137,4,4,0.25)",
                textDecoration: "none",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={17} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{title}</p>
                  {locked && <Lock size={11} style={{ color: "#E01E1E" }} strokeWidth={2} />}
                </div>
                <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{desc}</p>
              </div>
              <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </section>

      {/* Premium CTA */}
      <Link
        href="/dashboard/client/abonnement"
        className="animate-fade-up stagger-4"
        style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "18px 20px", borderRadius: 14,
          background: "linear-gradient(135deg, rgba(224,30,30,0.14) 0%, rgba(137,4,4,0.08) 100%)",
          border: "1px solid rgba(224,30,30,0.3)", textDecoration: "none",
        }}
      >
        <Crown size={22} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
            Envie d&apos;aller plus loin ?
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
            Découvre le coaching premium — programme et nutrition coachés, suivi, bilans...
          </p>
        </div>
        <ArrowRight size={16} style={{ color: "#E01E1E", flexShrink: 0 }} />
      </Link>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WeightDelta({ delta, good }: { delta: number; good: boolean | null }) {
  const Icon = delta === 0 ? Minus : delta < 0 ? TrendingDown : TrendingUp;
  const color =
    good === true ? "#4ade80"
    : good === false ? "#E01E1E"
    : "rgba(245,237,237,0.45)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={13} style={{ color }} strokeWidth={2} />
      <span style={{ fontSize: 12, fontWeight: 700, color }}>
        {delta > 0 ? "+" : ""}{delta} kg depuis le départ
      </span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ClientDashboard() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  // Free community members get a welcome guide instead of the coached
  // dashboard (weight tracking, coach notes...) which doesn't apply to them.
  if (!isSubscribed(profile)) {
    return (
      <WelcomeGuide
        firstName={profile?.full_name?.split(" ")[0] ?? ""}
        goal={profile?.goal ?? null}
        level={profile?.level ?? null}
      />
    );
  }

  const [thisWeekCheckin, latestNote] = await Promise.all([
    getThisWeekCheckin(user.id),
    getLatestCoachNote(user.id),
  ]);

  const firstName = profile?.full_name?.split(" ")[0]?.toUpperCase() ?? "";
  const today = new Date();
  const formattedDate = (() => {
    const s = new Intl.DateTimeFormat("fr-FR", {
      weekday: "long", day: "numeric", month: "long",
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();
  const weekNumber = getISOWeek(today);

  const currentWeight = thisWeekCheckin?.weight ?? null;
  const startWeight   = profile?.weight_start ?? null;
  const weightDelta   = currentWeight != null && startWeight != null
    ? parseFloat((currentWeight - startWeight).toFixed(1))
    : null;
  const weeksSinceStart = profile?.start_date
    ? Math.floor(
        (today.getTime() - new Date(profile.start_date + "T12:00:00").getTime()) /
        (7 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div
      className="page-transition"
      style={{
        padding: "32px 20px 100px",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>
          {formattedDate}
        </p>
        <h1
          style={{
            fontSize: 34,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "#F5EDED",
            margin: 0,
            lineHeight: 1.05,
          }}
        >
          Bonjour {firstName}
        </h1>
        {weeksSinceStart != null && (
          <p style={{
            marginTop: 6,
            fontSize: 12,
            color: "rgba(245,237,237,0.3)",
            fontWeight: 500,
          }}>
            Sem. {weekNumber} &nbsp;·&nbsp; {weeksSinceStart} sem. de coaching
          </p>
        )}
      </div>

      {/* ── Today stats rings (client-side fetch) ───────────────────────────── */}
      <ClientDashboardStats />

      {/* ── Mon coach ───────────────────────────────────────────────────────── */}
      <section className="animate-fade-up stagger-3" style={{ marginBottom: 16 }}>
        <p className="ep-section-title">Mon coach</p>

        {latestNote ? (
          <div className="ep-card" style={{ padding: "20px 20px 16px" }}>
            {/* Header row */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 16,
              gap: 12,
            }}>
              <div>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#F5EDED",
                  letterSpacing: "-0.01em",
                }}>
                  Bilan — Semaine {latestNote.week_number ?? "—"}
                </p>
              </div>
              {latestNote.rating != null && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  flexShrink: 0,
                }}>
                  <Star size={11} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#fbbf24", letterSpacing: "-0.02em" }}>
                    {latestNote.rating}
                    <span style={{ fontSize: 10, fontWeight: 400, color: "rgba(251,191,36,0.4)" }}>/10</span>
                  </span>
                </div>
              )}
            </div>

            {latestNote.observations && (
              <div style={{ marginBottom: latestNote.next_actions ? 14 : 0 }}>
                <p className="ep-label" style={{ marginBottom: 6 }}>Observations</p>
                <p style={{
                  fontSize: 13,
                  color: "rgba(245,237,237,0.7)",
                  lineHeight: 1.6,
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {latestNote.observations}
                </p>
              </div>
            )}

            {latestNote.next_actions && (
              <div>
                <div className="ep-divider-subtle" style={{ margin: "12px 0" }} />
                <p className="ep-label" style={{ marginBottom: 6 }}>Actions prévues</p>
                <p style={{
                  fontSize: 13,
                  color: "rgba(245,237,237,0.7)",
                  lineHeight: 1.6,
                  margin: 0,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {latestNote.next_actions}
                </p>
              </div>
            )}

            {/* Link to messages */}
            <Link
              href="/dashboard/client/messages"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 16,
                padding: "9px 14px",
                background: "rgba(224,30,30,0.07)",
                border: "1px solid rgba(224,30,30,0.14)",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              <MessageCircle size={14} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(245,237,237,0.7)", flex: 1 }}>
                Ouvrir les messages
              </span>
              <ChevronRight size={13} style={{ color: "rgba(245,237,237,0.2)" }} />
            </Link>
          </div>
        ) : (
          <div className="ep-card" style={{ padding: "28px 20px" }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 10,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(137,4,4,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <Star size={18} style={{ color: "rgba(245,237,237,0.2)" }} strokeWidth={1.5} />
              </div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(245,237,237,0.45)" }}>
                Ton coach prépare ton bilan
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.22)" }}>
                Les retours apparaîtront ici chaque semaine
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ── Objectifs & poids ───────────────────────────────────────────────── */}
      {(startWeight != null || currentWeight != null || profile?.goal) && (
        <section className="animate-fade-up stagger-4" style={{ marginBottom: 16 }}>
          <p className="ep-section-title">Mes objectifs</p>
          <div className="ep-card" style={{ padding: "20px" }}>

            {/* Weight row */}
            {(startWeight != null || currentWeight != null) && (
              <>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: weightDelta != null ? 12 : 0,
                }}>
                  {[
                    { label: "Départ", val: startWeight },
                    { label: "Actuel", val: currentWeight },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <p className="ep-label" style={{ marginBottom: 4 }}>{label}</p>
                      <p style={{
                        fontSize: 28,
                        fontWeight: 900,
                        letterSpacing: "-0.04em",
                        color: "#F5EDED",
                        margin: 0,
                        lineHeight: 1,
                      }}>
                        {val != null ? (
                          <>
                            {val}
                            <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(245,237,237,0.3)", marginLeft: 3 }}>
                              kg
                            </span>
                          </>
                        ) : (
                          <span style={{ color: "rgba(245,237,237,0.2)" }}>—</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {weightDelta != null && (
                  <WeightDelta delta={weightDelta} good={null} />
                )}

                {(profile?.goal || weeksSinceStart != null) && (
                  <div className="ep-divider-subtle" style={{ margin: "14px 0" }} />
                )}
              </>
            )}

            {/* Info grid */}
            {weeksSinceStart != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: profile?.goal ? 12 : 0 }}>
                <span className="ep-label">Coaching</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,237,237,0.65)" }}>
                  {weeksSinceStart} semaine{weeksSinceStart !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {profile?.goal && (
              <div>
                <p className="ep-label" style={{ marginBottom: 6 }}>Mon objectif</p>
                <p style={{
                  fontSize: 13,
                  color: "rgba(245,237,237,0.65)",
                  lineHeight: 1.6,
                  margin: 0,
                }}>
                  {profile.goal}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
