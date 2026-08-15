import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { getThisWeekCheckin, getISOWeek, getWeekStart } from "@/utils/checkins";
import { createServerSupabase } from "@/lib/supabase-server";
import { getLatestCoachNote } from "@/utils/notes";
import { getClientIntake } from "@/utils/client-intake";
import { getPeriodLogs } from "@/utils/period-tracking";
import { getTrialDaysLeft } from "@/utils/coaching-trial";
import { getMemberPreferences } from "@/utils/member-preferences";
import { derivePersonalization, reorderByPriority } from "@/lib/personalization";
import { getOnboardingChecklist, type OnboardingChecklistItem } from "@/lib/onboarding-checklist";
import ClientDashboardStats from "@/components/client/DashboardStats";
import StagnationBanner from "@/components/client/StagnationBanner";
import { PushPermission } from "@/components/messaging/PushPermission";
import RegularityCard from "@/components/ui/RegularityCard";
import { getClientActivityStreak } from "@/lib/client-activity";
import { getTotalPoints } from "@/lib/gamification";
import {
  TrendingDown, TrendingUp, Minus, Star, MessageCircle, ChevronRight,
  Dumbbell, Apple, Trophy, HelpCircle, BookOpen, Crown, ArrowRight, GraduationCap, Lock,
  Map, ClipboardCheck, Image as ImageIcon, UtensilsCrossed, Video, Lightbulb, Sunrise, CheckCircle2, Circle,
  Droplet,
  Gift,
} from "lucide-react";

const ENGAGEMENT_ITEMS = [
  {
    href: "/dashboard/client/communaute/victoires",
    icon: Trophy,
    title: "Partage une victoire",
    desc: "Même petite, elle compte. La régularité se fête aussi.",
  },
  {
    href: "/dashboard/client/communaute/questions",
    icon: HelpCircle,
    title: "Pose ta question",
    desc: "N'hésite pas à détailler, plus c'est précis, mieux c'est répondu.",
  },
  {
    href: "/dashboard/client/live",
    icon: Video,
    title: "Prochain live",
    desc: "Rejoins les sessions en direct avec le coach et le groupe.",
  },
];

// ── Free-tier welcome guide ──────────────────────────────────────────────────

const GUIDE_ITEMS = [
  {
    href: "/dashboard/client/aujourdhui",
    icon: Sunrise,
    title: "Aujourd'hui",
    desc: "Ton programme du jour, tes habitudes et ton journal, au même endroit.",
    locked: false,
  },
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
    href: "/dashboard/client/recettes",
    icon: UtensilsCrossed,
    title: "Recettes",
    desc: "Des idées de repas triées par régime, phase et macros.",
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
    desc: "80h+ de contenu vidéo. Réservé aux clients coachés (optionnel).",
    locked: true,
  },
];

// Item 32 : le suivi de cycle existe déjà (onglet Cycle, réservé aux
// clientes) mais rien ne le signale tant qu'on n'a pas ouvert cet onglet
// soi-même — la seule relance existante vivait côté coach (fiche client),
// invisible pour la cliente elle-même. Discret, ne s'affiche que si le
// genre déclaré est "Femme" et qu'aucun cycle n'a encore été loggé.
function CycleTrackingNudge() {
  return (
    <section className="animate-fade-up stagger-2" style={{ marginBottom: 16 }}>
      <Link
        href="/dashboard/client/cycle"
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 18px", borderRadius: 14, textDecoration: "none",
          background: "rgba(31,1,1,0.7)", border: "1px solid rgba(137,4,4,0.22)",
        }}
      >
        <Droplet size={18} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
            Active le suivi de ton cycle
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}>
            Utile pour comprendre tes fluctuations d&apos;énergie, de poids d&apos;eau et de performance.
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
      </Link>
    </section>
  );
}

function NoCoachBanner() {
  return (
    <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
      <div
        className="ep-card-highlighted"
        style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
            Tu n&apos;as plus de coach attitré
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.6 }}>
            Envie que Santamaria devienne ton coach ? Écris-lui directement sur Instagram. Tu peux
            aussi choisir un autre coach actif sur la plateforme.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a
            href="https://instagram.com/santamariasanchez_"
            target="_blank"
            rel="noopener noreferrer"
            className="ep-btn-primary"
            style={{ textDecoration: "none", fontSize: 10.5, padding: "10px 16px" }}
          >
            Contacter Santamaria
          </a>
          <Link
            href="/dashboard/client/coachs"
            className="ep-btn-secondary"
            style={{ textDecoration: "none", fontSize: 10.5, padding: "10px 16px" }}
          >
            Voir les coachs actifs
          </Link>
        </div>
      </div>
    </section>
  );
}

function StartChecklist({ items }: { items: OnboardingChecklistItem[] }) {
  if (items.length === 0) return null;
  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) {
    return (
      <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
        <div
          className="ep-card"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            border: "1px solid rgba(74,222,128,0.25)",
            background: "rgba(74,222,128,0.06)",
          }}
        >
          <CheckCircle2 size={20} style={{ color: "#4ade80", flexShrink: 0 }} strokeWidth={1.8} />
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
              Bien joué, tu as pris en main l&apos;appli
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
              Programme, calories, bilan, communauté : tout est lancé.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="ep-section-title" style={{ marginBottom: 0 }}>Pour bien démarrer</p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.35)" }}>
          {doneCount}/{items.length}
        </p>
      </div>
      <div
        style={{
          height: 4, borderRadius: 999, background: "rgba(137,4,4,0.2)",
          overflow: "hidden", marginBottom: 12,
        }}
      >
        <div
          style={{
            height: "100%", borderRadius: 999, background: "#E01E1E",
            width: `${(doneCount / items.length) * 100}%`,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(({ key, href, title, description, done }) => (
          <Link
            key={key}
            href={href}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "13px 16px", borderRadius: 12,
              background: done ? "rgba(74,222,128,0.05)" : "rgba(31,1,1,0.7)",
              border: done ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(137,4,4,0.25)",
              textDecoration: "none",
            }}
          >
            {done ? (
              <CheckCircle2 size={18} style={{ color: "#4ade80", flexShrink: 0 }} strokeWidth={1.8} />
            ) : (
              <Circle size={18} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} strokeWidth={1.8} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 800,
                color: done ? "rgba(245,237,237,0.5)" : "#F5EDED",
                textDecoration: done ? "line-through" : "none",
              }}>
                {title}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{description}</p>
            </div>
            {!done && <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />}
          </Link>
        ))}
      </div>
    </section>
  );
}

// Item 42 : le CTA premium était un texte générique identique pour tout le
// monde, tout le temps. Ici la relance s'appuie sur un signal comportemental
// concret plutôt qu'un calendrier — priorité à ce qui est le plus parlant
// pour CE membre à CET instant.
function upsellPitch(
  checklist: OnboardingChecklistItem[],
  streakDays: number
): { title: string; subtitle: string } {
  const allDone = checklist.length > 0 && checklist.every((i) => i.done);
  if (allDone) {
    return {
      title: "Tu as fait le tour de l'appli gratuite",
      subtitle: "Un coach peut aller plus loin avec toi : programme et suivi sur mesure, pas juste des outils en libre-service.",
    };
  }
  if (streakDays >= 7) {
    return {
      title: `${streakDays} jours d'affilée, une vraie régularité`,
      subtitle: "Un coach peut transformer cette constance en résultats concrets, avec un vrai suivi derrière.",
    };
  }
  return {
    title: "Envie d'un vrai coach, en plus ? (optionnel)",
    subtitle: "Un appel de 30 min, sans engagement, pour voir si ça peut t'aider.",
  };
}

function WelcomeGuide({
  firstName,
  goal,
  level,
  hasCoach,
  personalization,
  checklist,
  activityStreak,
}: {
  firstName: string;
  goal: string | null;
  level: string | null;
  hasCoach: boolean;
  personalization: ReturnType<typeof derivePersonalization>;
  checklist: OnboardingChecklistItem[];
  activityStreak: number;
}) {
  const items = reorderByPriority(GUIDE_ITEMS, personalization.priorityHrefs);
  const pitch = upsellPitch(checklist, activityStreak);
  return (
    <div
      className="page-transition ep-page-medium"
      style={{ padding: "32px 20px 100px" }}
    >
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 24 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Bienvenue</p>
        <h1 className="ep-h1">Salut {firstName} 👋</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "rgba(245,237,237,0.45)", lineHeight: 1.6 }}>
          {personalization.welcomeSubtitle}
        </p>
      </div>

      {!hasCoach && <NoCoachBanner />}
      {hasCoach && <StagnationBanner />}

      <StartChecklist items={checklist} />

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

      {/* Idées reçues, adressées direct pour les profils qui en ont besoin */}
      {personalization.mythBusters.length > 0 && (
        <section className="animate-fade-up stagger-2" style={{ marginBottom: 24 }}>
          <p className="ep-section-title">On répond direct</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {personalization.mythBusters.map((m) => (
              <div
                key={m.id}
                className="ep-card"
                style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <Lightbulb size={16} style={{ color: "#E01E1E", flexShrink: 0, marginTop: 2 }} strokeWidth={1.8} />
                <div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{m.title}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.6 }}>{m.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mini-guide */}
      <section className="animate-fade-up stagger-3" style={{ marginBottom: 24 }}>
        <p className="ep-section-title">Ce qui est disponible</p>
        <div className="ep-cols-2" style={{ gap: 8 }}>
          {items.map(({ href, icon: Icon, title, desc, locked }) => (
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
                  {locked ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                      color: "rgba(245,237,237,0.4)", border: "1px solid rgba(245,237,237,0.2)",
                      borderRadius: 999, padding: "1px 7px",
                    }}>
                      <Lock size={9} strokeWidth={2} /> Coaching
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                      color: "#4ade80", border: "1px solid rgba(74,222,128,0.35)",
                      borderRadius: 999, padding: "1px 7px",
                    }}>
                      Gratuit
                    </span>
                  )}
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
            {pitch.title}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
            {pitch.subtitle}
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

export default async function ClientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  // Brand-new signups get a one-time animated tour before anything else —
  // existing profiles were grandfathered in via migration (onboarding_completed_at
  // backfilled), so this only ever fires once per new member. La sortie de
  // l'onboarding navigue ici sans attendre la confirmation serveur (retour
  // instantané voulu) : ?onboarded=1 evite un aller-retour vers /onboarding
  // si l'ecriture onboarding_completed_at n'a pas encore atterri en base.
  const { onboarded } = await searchParams;
  if (profile && !profile.onboarding_completed_at && onboarded !== "1") redirect("/onboarding");

  // Free community members get a welcome guide instead of the coached
  // dashboard (weight tracking, coach notes...) which doesn't apply to them.
  if (!isSubscribed(profile)) {
    const [preferences, checklist, activityStreak] = await Promise.all([
      getMemberPreferences(user.id),
      getOnboardingChecklist(user.id),
      // Item 42 : signal de constance déjà calculé pour item 20, réutilisé
      // ici pour rendre la relance premium contextuelle plutôt que générique.
      getClientActivityStreak(user.id),
    ]);
    return (
      <>
        <PushPermission userId={user.id} />
        <WelcomeGuide
          firstName={profile?.full_name?.split(" ")[0] ?? ""}
          goal={profile?.goal ?? null}
          level={profile?.level ?? null}
          hasCoach={!!profile?.coach_id}
          personalization={derivePersonalization(preferences)}
          checklist={checklist}
          activityStreak={activityStreak}
        />
      </>
    );
  }

  // Tout début du coaching : le client remplit sa fiche complète une seule
  // fois, avant de voir le dashboard coaché — remplace l'ancien passage par
  // formulaire externe + email, les réponses vont directement dans sa fiche.
  const intake = await getClientIntake(user.id);
  if (!intake) redirect("/onboarding/intake");

  const [thisWeekCheckin, latestNote, victoryPostedThisWeek, activityStreak, totalPoints, periodLogsCount, trialDaysLeft] = await Promise.all([
    getThisWeekCheckin(user.id),
    getLatestCoachNote(user.id),
    (async () => {
      try {
        const supabase = await createServerSupabase();
        const { count } = await supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("type", "victory")
          .gte("created_at", `${getWeekStart()}T00:00:00`);
        return (count ?? 0) > 0;
      } catch {
        return true; // fail-safe : n'affiche pas la relance en cas d'erreur
      }
    })(),
    // Item 20 : régularité mise en avant dès l'accueil, au lieu d'un
    // système de points qui n'existait qu'au fond du profil.
    getClientActivityStreak(user.id),
    getTotalPoints(user.id),
    // Item 32 : uniquement pour savoir si la relance ci-dessous doit
    // s'afficher, évite d'aller chercher les logs pour tout le monde.
    intake.gender === "Femme" ? getPeriodLogs(user.id).then((l) => l.length) : Promise.resolve(0),
    // Item 43 : null pour la quasi-totalité des clients (coaching payant
    // classique, pas d'essai en cours) — juste une lecture ciblée en plus.
    getTrialDaysLeft(user.id),
  ]);
  // Bilan de la semaine déjà envoyé mais rien partagé à la communauté :
  // moment naturel pour relancer, sans être insistant (une fois par semaine).
  const showVictoryNudge = !!thisWeekCheckin && !victoryPostedThisWeek;

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
      className="page-transition ep-page-wide"
      style={{
        padding: "32px 20px 100px",
        position: "relative",
      }}
    >
      <PushPermission userId={user.id} />

      {/* ── Essai coaching en cours (item 43) ─────────────────────────────────── */}
      {trialDaysLeft != null && (
        <div
          className="animate-fade-up"
          style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
            padding: "14px 18px", borderRadius: 14,
            background: "linear-gradient(135deg, rgba(224,30,30,0.14) 0%, rgba(137,4,4,0.08) 100%)",
            border: "1px solid rgba(224,30,30,0.3)",
          }}
        >
          <Gift size={20} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#F5EDED", flex: 1 }}>
            Essai coaching gratuit — se termine dans {trialDaysLeft} jour{trialDaysLeft > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>
          {formattedDate}
        </p>
        <h1 className="ep-h1">Bonjour {firstName}</h1>
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

      {/* ── Régularité + rang (item 20) ──────────────────────────────────────── */}
      <RegularityCard streakDays={activityStreak} points={totalPoints} />

      {/* ── Relance suivi de cycle (item 32) ─────────────────────────────────── */}
      {intake.gender === "Femme" && periodLogsCount === 0 && <CycleTrackingNudge />}

      {/* ── Today stats rings (client-side fetch) ───────────────────────────── */}
      <ClientDashboardStats />

      {/* ── Aujourd'hui ─────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/client/aujourdhui"
        className="ep-card animate-fade-up stagger-2"
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
          marginBottom: 16, textDecoration: "none",
        }}
      >
        <Sunrise size={18} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>Aujourd&apos;hui</p>
          <p style={{ margin: 0, fontSize: 11.5, color: "rgba(245,237,237,0.45)" }}>
            Programme, habitudes, sommeil et journal du jour
          </p>
        </div>
        <ChevronRight size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} />
      </Link>

      {/* Sur grand écran le retour du coach (colonne principale) et le suivi
          personnel (colonne latérale) se lisent côte à côte plutôt que l'un
          sous l'autre dans une colonne étroite. Empilé sur mobile. */}
      <div className="ep-cols-main">
      <div>
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
                  Bilan · Semaine {latestNote.week_number ?? "·"}
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

      </div>

      <div>
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
                          <span style={{ color: "rgba(245,237,237,0.2)" }}>···</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {weightDelta != null && (
                  <WeightDelta
                    delta={weightDelta}
                    good={
                      weightDelta === 0 || !profile?.goal
                        ? null
                        : profile.goal === "Perte de poids"
                        ? weightDelta < 0
                        : profile.goal === "Prise de muscle"
                        ? weightDelta > 0
                        : null // "Muscle sec" et autres : sens ambigu, pas de couleur plutôt qu'une couleur fausse
                    }
                  />
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

      {/* ── Relance victoire — bilan envoyé cette semaine, rien partagé ──────── */}
      {showVictoryNudge && (
        <section className="animate-fade-up stagger-5" style={{ marginBottom: 16 }}>
          <Link
            href="/dashboard/client/communaute/victoires"
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "16px 18px", borderRadius: 14, textDecoration: "none",
              background: "linear-gradient(135deg, rgba(224,30,30,0.14) 0%, rgba(137,4,4,0.08) 100%)",
              border: "1px solid rgba(224,30,30,0.3)",
            }}
          >
            <Trophy size={20} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>
                Bilan envoyé, et ta victoire de la semaine ?
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.45)" }}>
                Partage la avec la communauté, ça motive tout le monde (et ça rapporte des points).
              </p>
            </div>
            <ArrowRight size={16} style={{ color: "#E01E1E", flexShrink: 0 }} />
          </Link>
        </section>
      )}

      {/* ── Partage & échange ───────────────────────────────────────────────── */}
      <section className="animate-fade-up stagger-5">
        <p className="ep-section-title">Partage & échange</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ENGAGEMENT_ITEMS.map(({ href, icon: Icon, title, desc }) => (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "13px 16px", borderRadius: 12,
                background: "rgba(31,1,1,0.7)",
                border: "1px solid rgba(137,4,4,0.22)",
                textDecoration: "none",
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: "rgba(224,30,30,0.1)", border: "1px solid rgba(224,30,30,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon size={16} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#F5EDED" }}>{title}</p>
                <p style={{ margin: 0, fontSize: 10, color: "rgba(245,237,237,0.4)" }}>{desc}</p>
              </div>
              <ChevronRight size={13} style={{ color: "rgba(245,237,237,0.2)", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </section>
      </div>
      </div>
    </div>
  );
}
