import { getT } from "@/lib/i18n-server";
import { intlLocale, type Locale } from "@/lib/i18n";
import { INSTAGRAM_URL } from "@/lib/brand-links";
import { timeAwareGreeting } from "@/lib/dates";
import { isOn, type AppSetup } from "@/lib/app-setup";
import Link from "next/link";
import type { Profile } from "@/utils/auth";
import type { CheckIn } from "@/utils/checkins";
import type { CoachNote } from "@/utils/notes";
import { reorderByPriority, type derivePersonalization } from "@/lib/personalization";
import type { OnboardingChecklistItem } from "@/lib/onboarding-checklist";
import { visibleTodos, type HomeDayData } from "@/lib/client-home";
import StagnationBanner from "@/components/client/StagnationBanner";
import HomeQuickBilan from "@/components/tracking/HomeQuickBilan";
import type { HomeQuickData } from "@/lib/tracking-home-server";
import type { QuickAction } from "@/components/tracking/QuickBilan";
import { HomeAutoRefresh, HomeHeaderTools } from "@/components/client/home/HomeClient";
import { HomeHeader, NowCard, NutritionMini, Shortcuts, TodayPair, TodoList, TrainingMini } from "@/components/client/home/HomeToday";
import {
  TrendingDown, TrendingUp, Minus, Star, ChevronRight, Flame,
  Dumbbell, Apple, Trophy, HelpCircle, BookOpen, Crown, ArrowRight, GraduationCap, Lock,
  Map, ClipboardCheck, Image as ImageIcon, UtensilsCrossed, Video, Lightbulb, Sunrise, CheckCircle2, Circle,
  Gift, Award, ChevronDown,
} from "lucide-react";

// Accueil « Aujourd'hui » de l'espace client (gratuit et coaché), rendu à
// l'identique dans l'aperçu « Voir comme mon client » de la fiche coach : la
// page charge les données de la personne connectée, l'aperçu celles du
// client regardé (lecture seule, `preview`).
//
// Refonte 2026-10-21 (« cohérente, connectée, très efficace ») : le tableau
// de bord du jour qui relie tout, sans surcharge. En haut la salutation et
// la date, note rapide et loupe sur la même ligne ; puis « maintenant » (le
// bloc d'agenda en cours ou le prochain, avec le bon raccourci), la journée
// en une bande, la séance et la nutrition du jour côte à côte, et une seule
// liste « À faire » faite uniquement de ce qui attend vraiment. Les anneaux
// et chiffres de la semaine vivent dans Suivi.

const SHORTCUTS = [
  { href: "/dashboard/client/aujourdhui", icon: Sunrise, label: "Habitudes et journal" },
  { href: "/dashboard/client/communaute/victoires", icon: Trophy, label: "Victoires" },
  { href: "/dashboard/client/communaute/questions", icon: HelpCircle, label: "Questions" },
  { href: "/dashboard/client/communaute/classement", icon: Award, label: "Classement" },
  { href: "/dashboard/client/live", icon: Video, label: "Lives" },
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
    title: "Trajectoire",
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
    href: "/dashboard/client/communaute/classement",
    icon: Award,
    title: "Classement",
    desc: "Vois où tu te situes parmi les membres les plus actifs.",
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
    desc: "5 formations à venir (~25h). Réservé aux clients coachés (optionnel).",
    locked: true,
  },
];

async function NoCoachBanner() {
  const t = await getT();
  return (
    <section className="animate-fade-up stagger-1" style={{ marginBottom: 24 }}>
      <div
        className="ep-card-highlighted"
        style={{ padding: "20px 20px", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>
            {t("Tu n'as plus de coach attitré")}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.6 }}>
            {t("Envie que Santamaria devienne ton coach ? Écris-lui directement sur Instagram. Tu peux aussi choisir un autre coach actif sur la plateforme.")}
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ep-btn-primary"
            style={{ textDecoration: "none", fontSize: 10.5, padding: "10px 16px" }}
          >
            {t("Contacter Santamaria")}
          </a>
          <Link
            href="/dashboard/client/coachs"
            className="ep-btn-secondary"
            style={{ textDecoration: "none", fontSize: 10.5, padding: "10px 16px" }}
          >
            {t("Voir les coachs actifs")}
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Checklist de départ, en une seule carte compacte. `hide` : étapes déjà
 * proposées ailleurs sur l'écran (le bilan du jour dans « À faire »), comptées
 * mais pas répétées.
 */
async function StartChecklist({ items, hide = [] }: { items: OnboardingChecklistItem[]; hide?: string[] }) {
  const t = await getT();
  if (items.length === 0) return null;
  const doneCount = items.filter((i) => i.done).length;
  // Tout fait : plus rien à montrer (la carte « bien joué » restait à vie).
  if (doneCount === items.length) return null;
  const shown = items.filter((i) => i.done || !hide.includes(i.key));

  return (
    <section className="animate-fade-up stagger-3" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="ep-section-title" style={{ marginBottom: 0 }}>{t("Pour bien démarrer")}</p>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "rgba(var(--ep-ink-rgb),0.4)" }}>
          {doneCount}/{items.length}
        </p>
      </div>
      <div className="ep-card" style={{ padding: "4px 0", overflow: "hidden" }}>
        <div style={{ height: 3, margin: "0 14px 2px", borderRadius: 999, background: "rgba(var(--ep-ink-rgb),0.07)", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 999, background: "var(--ep-accent)", width: `${(doneCount / items.length) * 100}%` }} />
        </div>
        {shown.map(({ key, href, title, description, done }, i) => (
          <Link
            key={key}
            href={href}
            style={{
              display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", minHeight: 48,
              textDecoration: "none", borderTop: i ? "1px solid rgba(var(--ep-line-rgb),0.14)" : "none",
            }}
          >
            {done ? (
              <CheckCircle2 size={18} style={{ color: "var(--ep-ok)", flexShrink: 0 }} strokeWidth={1.9} />
            ) : (
              <Circle size={18} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} strokeWidth={1.8} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0, fontSize: 13, fontWeight: 800,
                color: done ? "rgba(var(--ep-ink-rgb),0.45)" : "var(--ep-ink)",
                textDecoration: done ? "line-through" : "none",
              }}>
                {t(title)}
              </p>
              {!done && (
                <p style={{ margin: "1px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t(description)}
                </p>
              )}
            </div>
            {!done && <ChevronRight size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} />}
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


// ── Pièces communes ────────────────────────────────────────────────────────────

function dateLabel(date: string, locale: Locale): string {
  const s = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function niceFirstName(raw: string): string {
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";
}

async function StreakMeta({ streakDays }: { streakDays: number }) {
  const t = await getT();
  if (streakDays <= 0) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Flame size={13} strokeWidth={2} style={{ color: "var(--ep-orange)" }} />
      <b style={{ color: "rgba(var(--ep-ink-rgb),0.8)" }}>{streakDays}{" "}{t("j")}</b>{" "}{t("de régularité")}
    </span>
  );
}

async function GuideGrid({ items }: { items: typeof GUIDE_ITEMS }) {
  const t = await getT();
  return (
    <div className="ep-cols-2" style={{ gap: 8 }}>
      {items.map(({ href, icon: Icon, title, desc, locked }) => (
        <Link
          key={href}
          href={href}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "14px 16px", borderRadius: 12,
            background: locked ? "rgba(var(--ep-accent-rgb),0.06)" : "rgba(var(--ep-s1-rgb),0.7)",
            border: locked ? "1px solid rgba(var(--ep-accent-rgb),0.25)" : "1px solid rgba(var(--ep-line-rgb),0.25)",
            textDecoration: "none",
          }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: "rgba(var(--ep-accent-rgb),0.1)", border: "1px solid rgba(var(--ep-accent-rgb),0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={17} style={{ color: "var(--ep-accent)" }} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>{t(title)}</p>
              {locked && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                  color: "rgba(var(--ep-ink-rgb),0.4)", border: "1px solid rgba(var(--ep-ink-rgb),0.2)",
                  borderRadius: 999, padding: "1px 7px",
                }}>
                  <Lock size={9} strokeWidth={2} />{" "}{t("Coaching")}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t(desc)}</p>
          </div>
          <ChevronRight size={14} style={{ color: "rgba(var(--ep-ink-rgb),0.2)", flexShrink: 0 }} />
        </Link>
      ))}
    </div>
  );
}

async function PremiumCta({ pitch }: { pitch: { title: string; subtitle: string } }) {
  const t = await getT();
  return (
    <Link
      href="/dashboard/client/abonnement"
      className="animate-fade-up stagger-4"
      style={{
        display: "flex", alignItems: "center", gap: 14, marginBottom: 16,
        padding: "16px 18px", borderRadius: 14,
        background: "linear-gradient(135deg, rgba(var(--ep-accent-rgb),0.14) 0%, rgba(var(--ep-line-rgb),0.08) 100%)",
        border: "1px solid rgba(var(--ep-accent-rgb),0.3)", textDecoration: "none",
      }}
    >
      <Crown size={22} style={{ color: "var(--ep-accent)", flexShrink: 0 }} strokeWidth={1.8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>{t(pitch.title)}</p>
        <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.5)" }}>{t(pitch.subtitle)}</p>
      </div>
      <ArrowRight size={16} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
    </Link>
  );
}

// ── Membre gratuit ──────────────────────────────────────────────────────────

export async function WelcomeGuide({
  firstName,
  hasCoach,
  personalization,
  checklist,
  activityStreak,
  show,
  day,
  locale,
  preview = false,
  quick = null,
  quickAction,
}: {
  quick?: HomeQuickData | null;
  quickAction?: QuickAction;
  firstName: string;
  hasCoach: boolean;
  personalization: ReturnType<typeof derivePersonalization>;
  checklist: OnboardingChecklistItem[];
  activityStreak: number;
  show: { nutrition: boolean; entrainement: boolean };
  day: HomeDayData;
  locale: Locale;
  /** Aperçu coach : aucune lecture côté navigateur (elle serait celle du coach). */
  preview?: boolean;
}) {
  const t = await getT();
  const items = reorderByPriority(GUIDE_ITEMS, personalization.priorityHrefs);
  const pitch = upsellPitch(checklist, activityStreak);
  // Dès la première vraie action (ou dès qu'il y a quelque chose de prévu :
  // agenda, programme, diète), l'accueil devient le tableau de bord du jour.
  // Avant, seule la checklist de démarrage et le guide s'affichent, pour ne
  // pas lui proposer deux fois les mêmes premières actions.
  const hasStarted =
    checklist.some((i) => i.done) || day.blocks.length > 0 || day.training.hasProgram || day.nutrition.hasPlan;
  const name = niceFirstName(firstName);
  const hour = Number(day.now.slice(0, 2));
  return (
    <div className="page-transition ep-page-medium" style={{ padding: "20px 16px 100px" }}>
      {!preview && <HomeAutoRefresh />}
      <HomeHeader
        eyebrow={dateLabel(day.date, locale)}
        title={`${t(timeAwareGreeting(hour))}${name ? `, ${name}` : ""}`}
        meta={hasStarted ? <StreakMeta streakDays={activityStreak} /> : <span>{personalization.welcomeSubtitle}</span>}
        tools={<HomeHeaderTools />}
      />

      {!hasCoach && <NoCoachBanner />}
      {hasCoach && !preview && <StagnationBanner />}

      {hasStarted ? (
        <div className="ep-cols-main">
          <div style={{ minWidth: 0 }}>
            {quick && quickAction && !preview && <HomeQuick quick={quick} action={quickAction} />}
            <NowCard day={day} />
          </div>
          <div style={{ minWidth: 0 }}>
            {(show.entrainement || show.nutrition) && (
              <TodayPair>
                {show.entrainement && <TrainingMini day={day} coached={false} />}
                {show.nutrition && <NutritionMini day={day} habits={!!quick?.nutritionHabits} />}
              </TodayPair>
            )}
            <TodoList todos={visibleTodos(day)} />
            <StartChecklist items={checklist} hide={visibleTodos(day).some((x) => x.kind === "bilan") ? ["bilan"] : []} />
            <PremiumCta pitch={pitch} />
          </div>
        </div>
      ) : (
        <>
          <StartChecklist items={checklist} />
          {personalization.mythBusters.length > 0 && (
            <section className="animate-fade-up stagger-2" style={{ marginBottom: 24 }}>
              <p className="ep-section-title">{t("On répond direct")}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {personalization.mythBusters.map((m) => (
                  <div key={m.id} className="ep-card" style={{ padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <Lightbulb size={16} style={{ color: "var(--ep-accent)", flexShrink: 0, marginTop: 2 }} strokeWidth={1.8} />
                    <div>
                      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>{m.title}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.6 }}>{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Le catalogue de l'appli : ouvert pour un nouveau, replié ensuite. */}
      <details open={!hasStarted} className="animate-fade-up stagger-3 ep-home-details" style={{ marginBottom: 16 }}>
        <summary style={{ listStyle: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 36, marginBottom: 8 }}>
          <span className="ep-section-title" style={{ margin: 0 }}>{t("Ce qui est disponible")}</span>
          <ChevronDown size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.4)" }} />
        </summary>
        <GuideGrid items={items} />
      </details>

      {!hasStarted && <PremiumCta pitch={pitch} />}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

async function WeightDelta({ delta, good }: { delta: number; good: boolean | null }) {
  const t = await getT();
  const Icon = delta === 0 ? Minus : delta < 0 ? TrendingDown : TrendingUp;
  const color =
    good === true ? "var(--ep-ok)"
    : good === false ? "var(--ep-accent)"
    : "rgba(var(--ep-ink-rgb),0.5)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color, whiteSpace: "nowrap" }}>
      <Icon size={13} strokeWidth={2} />
      {delta > 0 ? "+" : ""}{delta.toLocaleString("fr-FR")}{" "}{t("kg")}
    </span>
  );
}

/** Retour de la semaine du coach, en compact : note, deux lignes, prochaine action. */
async function CoachNoteMini({ note }: { note: CoachNote }) {
  const t = await getT();
  return (
    <section className="animate-fade-up stagger-3" style={{ marginBottom: 16 }}>
      <p className="ep-section-title" style={{ marginBottom: 8 }}>{t("Retour de ton coach")}</p>
      <Link href="/dashboard/client/messages" className="ep-card" style={{ display: "block", padding: "14px 16px", textDecoration: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "var(--ep-ink)" }}>
            {t("Bilan · Semaine")}{" "}{note.week_number ?? "·"}
          </p>
          {note.rating != null && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 900, color: "var(--ep-warn)" }}>
              <Star size={11} fill="var(--ep-warn)" style={{ color: "var(--ep-warn)" }} />
              {note.rating}
              <span style={{ fontSize: 10, fontWeight: 500, color: "rgba(var(--ep-warn-rgb),0.55)" }}>/10</span>
            </span>
          )}
        </div>
        {note.observations && (
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "rgba(var(--ep-ink-rgb),0.7)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {note.observations}
          </p>
        )}
        {note.next_actions && (
          <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.45, color: "rgba(var(--ep-ink-rgb),0.6)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            <b style={{ color: "var(--ep-accent)" }}>{t("À faire")} :</b>{" "}{note.next_actions}
          </p>
        )}
      </Link>
    </section>
  );
}

/** Poids de départ → actuel, en une ligne (le détail vit dans Suivi). */
async function ProgressRow({ start, current, goal }: { start: number | null; current: number | null; goal: string | null }) {
  const t = await getT();
  // Sans pesée récente, rien à montrer ici (la courbe vit dans Suivi).
  if (current == null) return null;
  const delta = start != null && current != null ? parseFloat((current - start).toFixed(1)) : null;
  const good =
    delta == null || delta === 0 || !goal ? null
    : goal === "Perte de poids" ? delta < 0
    : goal === "Prise de muscle" ? delta > 0
    : null; // "Muscle sec" et autres : sens ambigu, pas de couleur plutôt qu'une couleur fausse
  const kg = (v: number | null) => (v != null ? `${v.toLocaleString("fr-FR")} ${t("kg")}` : "···");
  return (
    <section className="animate-fade-up stagger-4" style={{ marginBottom: 16 }}>
      <p className="ep-section-title" style={{ marginBottom: 8 }}>{t("Ma progression")}</p>
      <Link href="/dashboard/client/progress" className="ep-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", textDecoration: "none" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: "var(--ep-ink)", fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "rgba(var(--ep-ink-rgb),0.5)", fontWeight: 700 }}>{kg(start)}</span>
            {" → "}
            {kg(current)}
          </p>
          {goal && <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{goal}</p>}
        </div>
        {delta != null && <WeightDelta delta={delta} good={good} />}
        <ChevronRight size={15} style={{ color: "rgba(var(--ep-ink-rgb),0.25)", flexShrink: 0 }} />
      </Link>
    </section>
  );
}

function HomeQuick({ quick, action }: { quick: HomeQuickData; action: QuickAction }) {
  return (
    <HomeQuickBilan
      today={quick.today}
      existing={quick.existing}
      action={action}
      fields={quick.fields}
      extraFields={[]}
      minimum={quick.minimum}
      isWeighDay={quick.isWeighDay}
      nextWeighLabel={quick.nextWeighLabel}
      lastWeight={quick.lastWeight}
      lastSleep={quick.lastSleep}
      autoSteps={quick.autoSteps}
      tone={quick.tone}
      doneAtLoad={quick.doneAtLoad}
      summary={quick.summary}
    />
  );
}

// ── Client accompagné ───────────────────────────────────────────────────────

export async function CoachedHome({
  profile,
  thisWeekCheckin,
  latestNote,
  activityStreak,
  trialDaysLeft,
  appSetup,
  locale,
  day,
  checklist = [],
  preview = false,
  quick = null,
  quickAction,
}: {
  /** Saisie rapide du jour (moteur de tracking), absente en aperçu coach. */
  quick?: HomeQuickData | null;
  quickAction?: QuickAction;
  profile: Profile | null;
  thisWeekCheckin: CheckIn | null;
  latestNote: CoachNote | null;
  activityStreak: number;
  trialDaysLeft: number | null;
  appSetup: AppSetup;
  locale: Locale;
  day: HomeDayData;
  /** Checklist de départ (premières semaines seulement, sinon vide). */
  checklist?: OnboardingChecklistItem[];
  /** Aperçu coach : rien ne se recharge ni ne s'écrit. */
  preview?: boolean;
}) {
  const t = await getT();
  const name = niceFirstName(profile?.full_name?.split(" ")[0] ?? "");
  const hour = Number(day.now.slice(0, 2));
  const weeksSinceStart = profile?.start_date
    ? Math.max(0, Math.floor((new Date(`${day.date}T12:00:00`).getTime() - new Date(`${profile.start_date}T12:00:00`).getTime()) / (7 * 86400000)))
    : null;
  const showTraining = isOn(appSetup, "entrainement");
  const showNutrition = isOn(appSetup, "nutrition");

  return (
    <div className="page-transition ep-page-wide" style={{ padding: "20px 16px 100px", position: "relative" }}>
      {!preview && <HomeAutoRefresh />}
      <HomeHeader
        eyebrow={dateLabel(day.date, locale)}
        title={`${t(timeAwareGreeting(hour))}${name ? `, ${name}` : ""}`}
        meta={
          <>
            <StreakMeta streakDays={activityStreak} />
            {weeksSinceStart != null && (
              <span>
                {t("Sem.")}{" "}{weeksSinceStart + 1}{" "}{t("de coaching")}
              </span>
            )}
            {trialDaysLeft != null && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ep-accent)", fontWeight: 800 }}>
                <Gift size={13} strokeWidth={2} />
                {t("Essai")} : {trialDaysLeft}{" "}{trialDaysLeft > 1 ? t("jours restants") : t("jour restant")}
              </span>
            )}
          </>
        }
        tools={<HomeHeaderTools />}
      />

      {/* Grand écran : la journée à gauche, séance, nutrition et à faire à
          droite. Téléphone : dans l'ordre de lecture. */}
      <div className="ep-cols-main">
        <div style={{ minWidth: 0 }}>
          {quick && quickAction && !preview && <HomeQuick quick={quick} action={quickAction} />}
          <NowCard day={day} />
          {latestNote && <div className="hidden min-[1000px]:block"><CoachNoteMini note={latestNote} /></div>}
        </div>
        <div style={{ minWidth: 0 }}>
          {(showTraining || showNutrition) && (
            <TodayPair>
              {showTraining && <TrainingMini day={day} coached />}
              {showNutrition && <NutritionMini day={day} coached habits={!!quick?.nutritionHabits} />}
            </TodayPair>
          )}
          <TodoList todos={visibleTodos(day)} />
          {latestNote && <div className="min-[1000px]:hidden"><CoachNoteMini note={latestNote} /></div>}
          <StartChecklist items={checklist} hide={visibleTodos(day).some((x) => x.kind === "bilan") ? ["bilan"] : []} />
          <ProgressRow start={profile?.weight_start ?? null} current={thisWeekCheckin?.weight ?? null} goal={profile?.goal ?? null} />
          <Shortcuts title="Raccourcis" items={SHORTCUTS} />
        </div>
      </div>
    </div>
  );
}
