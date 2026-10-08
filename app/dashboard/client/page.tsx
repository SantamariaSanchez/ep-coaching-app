import { getT, getLocale } from "@/lib/i18n-server";
import IntentLauncher from "@/components/home/IntentLauncher";
import { loadLauncher } from "@/lib/launcher-server";
import { intlLocale } from "@/lib/i18n";
import { timeAwareGreeting, nowInParis } from "@/lib/dates";
import { getAppSetup } from "@/lib/app-setup-server";
import { isOn } from "@/lib/app-setup";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getAccessType } from "@/utils/auth-client";
import { getThisWeekCheckin, getWeekStart } from "@/utils/checkins";
import { createServerSupabase } from "@/lib/supabase-server";
import { getLatestCoachNote } from "@/utils/notes";
import { getClientIntake } from "@/utils/client-intake";
import { getPeriodLogs } from "@/utils/period-tracking";
import { getTrialDaysLeft } from "@/utils/coaching-trial";
import { getMemberPreferences } from "@/utils/member-preferences";
import { derivePersonalization } from "@/lib/personalization";
import { getOnboardingChecklist, type OnboardingChecklistItem } from "@/lib/onboarding-checklist";
import StagnationBanner from "@/components/client/StagnationBanner";
import { PushPermission } from "@/components/messaging/PushPermission";
import StreakChip from "@/components/home/StreakChip";
import { getClientActivityStreak } from "@/lib/client-activity";
import { getTotalPoints } from "@/lib/gamification";
import { Star, MessageCircle, ChevronRight, Trophy, Crown, Circle, Droplet, Gift } from "lucide-react";

// Item 32 : le suivi de cycle existe déjà (onglet Cycle, réservé aux
// clientes) mais rien ne le signale tant qu'on n'a pas ouvert cet onglet
// soi-même — la seule relance existante vivait côté coach (fiche client),
// invisible pour la cliente elle-même. Discret, ne s'affiche que si le
// genre déclaré est "Femme" et qu'aucun cycle n'a encore été loggé.
async function CycleTrackingNudge() {
  const t = await getT();
  return (
    <SlimRow
      href="/dashboard/client/cycle"
      icon={Droplet}
      title={t("Active le suivi de ton cycle")}
      sub={t("Utile pour comprendre tes fluctuations d'énergie, de poids d'eau et de performance.")}
    />
  );
}

async function NoCoachBanner({ pitch }: { pitch: { title: string; subtitle: string } }) {
  const t = await getT();
  return <SlimRow href="/dashboard/client/abonnement" icon={Crown} title={t(pitch.title)} sub={t(pitch.subtitle)} />;
}

async function StartChecklist({ items }: { items: OnboardingChecklistItem[] }) {
  const t = await getT();
  const todo = items.filter((i) => !i.done);
  // Tout est fait (ou rien à faire) : la checklist disparaît de l'accueil.
  if (items.length === 0 || todo.length === 0) return null;
  const doneCount = items.length - todo.length;
  return (
    <section style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="ep-label" style={{ margin: 0 }}>{t("Pour bien démarrer")}</p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.45)" }}>{doneCount}/{items.length}</p>
      </div>
      <div className="ep-card" style={{ padding: 4 }}>
        <div style={{ height: 3, borderRadius: 999, background: "rgba(137,4,4,0.2)", overflow: "hidden", margin: "6px 10px 2px" }}>
          <div style={{ height: "100%", borderRadius: 999, background: "#E01E1E", width: `${(doneCount / items.length) * 100}%` }} />
        </div>
        {todo.slice(0, 2).map(({ key, href, title, description }, i) => (
          <Link
            key={key}
            href={href}
            className="ep-press"
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", minHeight: 52, textDecoration: "none", borderTop: i === 0 ? "none" : "1px solid rgba(137,4,4,0.18)" }}
          >
            <Circle size={16} style={{ color: "rgba(245,237,237,0.3)", flexShrink: 0 }} strokeWidth={1.8} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{t(title)}</span>
              <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{description}</span>
            </span>
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.22)", flexShrink: 0 }} />
          </Link>
        ))}
      </div>
    </section>
  );
}

// Une ligne fine (relances : cycle, victoire, coaching), même gabarit partout.
function SlimRow({ href, icon: Icon, title, sub }: { href: string; icon: React.ElementType; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="ep-press"
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", minHeight: 52, marginBottom: 8, borderRadius: 14, background: "rgba(31,1,1,0.7)", border: "1px solid rgba(137,4,4,0.25)", textDecoration: "none" }}
    >
      <Icon size={17} style={{ color: "#E01E1E", flexShrink: 0 }} strokeWidth={1.8} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: "#F5EDED" }}>{title}</span>
        <span style={{ display: "block", fontSize: 11.5, color: "rgba(245,237,237,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</span>
      </span>
      <ChevronRight size={15} style={{ color: "rgba(245,237,237,0.25)", flexShrink: 0 }} />
    </Link>
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

// Accueil membre (2026-10-08, retour direct : « l'onglet est devenu long,
// mets vraiment les choses utiles et pas des cards qui prennent tout
// l'espace »). Avant : bandeau coach, carte régularité, anneaux, checklist
// complète, profil, idées reçues, catalogue de 13 rubriques et encart
// premium. Maintenant : bonjour + régularité en pastille, « Je veux » (avec
// « Tout » pour le catalogue complet), les 2 prochaines étapes de démarrage
// tant qu'il en reste, et une seule ligne coaching.
async function WelcomeGuide({
  firstName,
  dateLabel,
  hasCoach,
  personalization,
  checklist,
  activityStreak,
  totalPoints,
  launcher,
}: {
  launcher: React.ReactNode;
  firstName: string;
  dateLabel: string;
  hasCoach: boolean;
  personalization: ReturnType<typeof derivePersonalization>;
  checklist: OnboardingChecklistItem[];
  activityStreak: number;
  totalPoints: number;
}) {
  const t = await getT();
  const pitch = upsellPitch(checklist, activityStreak);
  const started = checklist.some((i) => i.done);
  return (
    <div className="page-transition ep-page-medium" style={{ padding: "20px 16px 100px" }}>
      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(245,237,237,0.45)" }}>{dateLabel}</p>
          <h1 className="ep-h1" style={{ margin: "2px 0 0", fontSize: 24 }}>{t("Salut")}{firstName ? ` ${firstName}` : ""}</h1>
          {!started && (
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "rgba(245,237,237,0.5)", lineHeight: 1.5 }}>{personalization.welcomeSubtitle}</p>
          )}
        </div>
        <StreakChip streakDays={activityStreak} points={totalPoints} href="/dashboard/client/profile" label={t("Ma régularité")} />
      </header>

      {launcher}

      <StartChecklist items={checklist} />

      {hasCoach ? <StagnationBanner /> : <NoCoachBanner pitch={pitch} />}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

async function homeDateLabel(): Promise<string> {
  const locale = await getLocale();
  const s = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function ClientDashboard({
  searchParams,
}: {
  searchParams: Promise<{ onboarded?: string }>;
}) {
  const t = await getT();
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

  // « Je veux... » : lancé tout de suite, en parallèle du reste de l'accueil.
  const launcherP = loadLauncher(user.id, "client");

  // Free community members get a welcome guide instead of the coached
  // dashboard (weight tracking, coach notes...) which doesn't apply to them.
  if (getAccessType(profile) === "membre_gratuit") {
    const [preferences, checklist, activityStreak, totalPoints] = await Promise.all([
      getMemberPreferences(user.id),
      getOnboardingChecklist(user.id),
      // Item 42 : signal de constance déjà calculé pour item 20, réutilisé
      // ici pour rendre la relance premium contextuelle plutôt que générique.
      getClientActivityStreak(user.id),
      getTotalPoints(user.id),
    ]);
    return (
      <>
        <PushPermission userId={user.id} />
        <WelcomeGuide
          firstName={profile?.full_name?.split(" ")[0] ?? ""}
          dateLabel={await homeDateLabel()}
          hasCoach={!!profile?.coach_id}
          personalization={derivePersonalization(preferences)}
          checklist={checklist}
          activityStreak={activityStreak}
          totalPoints={totalPoints}
          launcher={<IntentLauncher {...(await launcherP)} space="client" />}
        />
      </>
    );
  }

  // Tout début du coaching : le client remplit sa fiche complète une seule
  // fois, avant de voir le dashboard coaché — remplace l'ancien passage par
  // formulaire externe + email, les réponses vont directement dans sa fiche.
  const intake = await getClientIntake(user.id);
  if (!intake) redirect("/onboarding/intake");

  const [thisWeekCheckin, latestNote, victoryPostedThisWeek, activityStreak, totalPoints, periodLogsCount, trialDaysLeft, appSetup] = await Promise.all([
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
    getAppSetup(user.id),
  ]);
  // Bilan de la semaine déjà envoyé mais rien partagé à la communauté :
  // moment naturel pour relancer, sans être insistant (une fois par semaine).
  const showVictoryNudge = !!thisWeekCheckin && !victoryPostedThisWeek;

  // Même salutation que l'accueil coach : selon l'heure, prénom normal.
  const rawFirst = profile?.full_name?.split(" ")[0] ?? "";
  const firstName = rawFirst ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase() : "";
  const greeting = t(timeAwareGreeting(Number(nowInParis().hhmm.split(":")[0])));
  const locale = await getLocale();
  const today = new Date();
  const formattedDate = (() => {
    const s = new Intl.DateTimeFormat(intlLocale(locale), {
      weekday: "long", day: "numeric", month: "long",
    }).format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  const weeksSinceStart = profile?.start_date
    ? Math.floor((today.getTime() - new Date(profile.start_date + "T12:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  // Accueil client coaché, version courte (2026-10-08) : bonjour + semaine
  // de coaching + régularité, « Je veux », le dernier retour du coach en
  // quelques lignes, puis les relances utiles en lignes fines. Poids et
  // objectifs vivent dans Progression, la communauté dans son onglet.
  return (
    <div className="page-transition ep-page-wide" style={{ padding: "20px 16px 100px", position: "relative" }}>
      <PushPermission userId={user.id} />

      {trialDaysLeft != null && (
        <SlimRow
          href="/dashboard/client/abonnement"
          icon={Gift}
          title={t("Essai coaching gratuit")}
          sub={t("Se termine dans {n} jour(s)", { n: trialDaysLeft })}
        />
      )}

      <header style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "rgba(245,237,237,0.45)" }}>
            {formattedDate}
            {weeksSinceStart != null && ` · ${t("sem. {n} de coaching", { n: weeksSinceStart + 1 })}`}
          </p>
          <h1 className="ep-h1" style={{ margin: "2px 0 0", fontSize: 24 }}>{greeting}{firstName ? `, ${firstName}` : ""}</h1>
        </div>
        <StreakChip streakDays={activityStreak} points={totalPoints} href="/dashboard/client/profile" label={t("Ma régularité")} />
      </header>

      <IntentLauncher {...(await launcherP)} space="client" />

      {latestNote && (
        <Link
          href="/dashboard/client/messages"
          className="ep-card ep-press"
          style={{ display: "block", padding: "12px 14px", marginBottom: 12, textDecoration: "none", color: "#F5EDED" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <MessageCircle size={14} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
            <span style={{ flex: 1, fontSize: 12, fontWeight: 800 }}>{t("Retour de ton coach")} · {t("semaine")} {latestNote.week_number ?? "·"}</span>
            {latestNote.rating != null && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 900, color: "#fbbf24" }}>
                <Star size={11} fill="#fbbf24" style={{ color: "#fbbf24" }} /> {latestNote.rating}/10
              </span>
            )}
            <ChevronRight size={14} style={{ color: "rgba(245,237,237,0.25)" }} />
          </span>
          {(latestNote.next_actions || latestNote.observations) && (
            <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12.5, lineHeight: 1.5, color: "rgba(245,237,237,0.65)" }}>
              {latestNote.next_actions || latestNote.observations}
            </span>
          )}
        </Link>
      )}

      {showVictoryNudge && (
        <SlimRow
          href="/dashboard/client/communaute/victoires"
          icon={Trophy}
          title={t("Bilan envoyé, et ta victoire de la semaine ?")}
          sub={t("Partage la avec la communauté, ça motive tout le monde (et ça rapporte des points).")}
        />
      )}

      {intake.gender === "Femme" && periodLogsCount === 0 && isOn(appSetup, "cycle") && <CycleTrackingNudge />}
    </div>
  );
}
