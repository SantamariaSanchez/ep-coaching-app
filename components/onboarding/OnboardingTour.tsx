"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dumbbell, Crown, ArrowRight, X, Lightbulb, BookOpen, Play,
  Palette, LayoutGrid, ClipboardCheck, Bell, Home, TrendingUp, MessageCircle,
} from "lucide-react";
import AmbiancePicker from "@/components/settings/AmbiancePicker";
import type { PersonalizationProfile } from "@/lib/personalization";
import type { GuideRef } from "@/lib/reengagement";
import type { PresetRecommendation } from "@/lib/preset-programs";
import { completeOnboarding, installStarterProgram } from "@/app/onboarding/actions";

interface Slide {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  desc: string;
  bullets?: string[];
  benefits?: { title: string; body: string }[];
  guideLink?: { href: string; label: string };
  starter?: PresetRecommendation;
  /** Écran spécial : choix de l'ambiance, carte des onglets, bilans. */
  kind?: "ambiance" | "tabs" | "bilans";
}

// Visite refaite le 2026-10-13 (« que le gars arrive et sache exactement les
// espaces et onglets qu'il a, que ses bilans il sache les faire, zéro
// friction ») : plus une vitrine de fonctionnalités, un mode d'emploi. Les
// 5 onglets réels de la barre du bas, comment faire ses bilans, sa séance,
// ses rappels.
function baseSlides(coached: boolean, checkinDayLabel: string | null): Slide[] {
  const slides: Slide[] = [
    {
      icon: Palette,
      eyebrow: "Bienvenue",
      title: "D'abord, ton ambiance",
      desc: "Claire, douce ou sombre. Tu pourras changer quand tu veux dans Paramètres.",
      kind: "ambiance",
    },
    {
      icon: LayoutGrid,
      eyebrow: "Ton appli",
      title: "5 onglets, tout est dedans",
      desc: "En bas de l'écran, toujours au même endroit :",
      kind: "tabs",
    },
    {
      icon: ClipboardCheck,
      eyebrow: "Tes bilans",
      title: coached ? "Ton coach suit tout, toi tu remplis" : "Ton suivi en 30 secondes",
      desc: coached
        ? `Un rappel arrive à chaque fois, tu n'as rien à retenir.${checkinDayLabel ? ` Ton check-in est prévu le ${checkinDayLabel}.` : ""}`
        : "Un rappel arrive chaque matin, tu n'as rien à retenir.",
      kind: "bilans",
    },
    {
      icon: Dumbbell,
      eyebrow: "Ta séance",
      title: "À la salle, un seul bouton",
      desc: "Training, puis « Démarrer cette séance ». Tu notes ta charge et tes reps, tu valides la série : le chrono de repos part tout seul et l'appli te propose la charge de la prochaine fois.",
      bullets: ["Démarrer", "Noter kg et reps", "Valider", "Repos auto"],
    },
    {
      icon: Bell,
      eyebrow: "Tes rappels",
      title: "L'appli pense pour toi",
      desc: "Séance, repas, bilan, messages de ton coach : une notification arrive au bon moment. Ton téléphone va te demander l'autorisation, réponds oui. Tout se règle ensuite dans les réglages du téléphone (Applications > EP Coaching).",
    },
  ];
  if (!coached) {
    slides.push({
      icon: Crown,
      eyebrow: "Pour aller plus loin (optionnel)",
      title: "Un vrai coach, si tu le souhaites",
      desc: "Tout ce que tu viens de voir reste gratuit, sans limite de temps. En plus, si tu veux :",
      benefits: [
        { title: "Bilan chaque semaine", body: "Ton coach ajuste ton programme selon tes vrais résultats." },
        { title: "Messages directs", body: "Tu écris, ton coach te répond. Pas un bot." },
        { title: "Appels live", body: "Groupe ou 1:1, quand t'en as besoin." },
      ],
    });
  }
  return slides;
}

const TABS = [
  { icon: Home, label: "Aujourd'hui", body: "Ta journée : séance, repas, ce qu'il reste à faire." },
  { icon: Dumbbell, label: "Training", body: "Ton programme et le bouton pour démarrer ta séance." },
  { icon: TrendingUp, label: "Suivi", body: "Bilan du matin, poids, photos, nutrition, agenda." },
  { icon: MessageCircle, label: "Coach", body: "Messages, check-in de la semaine, appels." },
  { icon: LayoutGrid, label: "Plus", body: "Formations, recettes, communauté, réglages." },
];

function TabsMap() {
  const t = useT();
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
      {TABS.map(({ icon: I, label, body }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14, background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)" }}>
          <span style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(var(--ep-accent-rgb),0.12)" }}>
            <I size={17} style={{ color: "var(--ep-accent)" }} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--ep-strong)" }}>{t(label)}</span>
            <span style={{ display: "block", fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.6)", lineHeight: 1.4 }}>{t(body)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function BilansSteps({ coached }: { coached: boolean }) {
  const t = useT();
  const steps = [
    { n: "1", title: "Bilan du matin", where: "Suivi > Bilan", body: "Poids, sommeil, énergie. 30 secondes, au réveil." },
    ...(coached
      ? [{ n: "2", title: "Check-in de la semaine", where: "Coach > Check-in", body: "5 minutes : ta semaine, tes victoires, tes photos. Ton coach te répond avec ton bilan." }]
      : []),
    { n: coached ? "3" : "2", title: "Photos de progression", where: "Suivi > Photos", body: "Face, profil, dos, toutes les 2 semaines. C'est ce qui montre le vrai changement." },
  ];
  return (
    <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, textAlign: "left" }}>
      {steps.map((s) => (
        <div key={s.n} style={{ display: "flex", gap: 12, padding: "11px 12px", borderRadius: 14, background: "rgba(var(--ep-ink-rgb),0.04)", border: "1px solid rgba(var(--ep-line-rgb),0.25)" }}>
          <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ep-accent)", color: "#fff", fontSize: 12.5, fontWeight: 900 }}>
            {s.n}
          </span>
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: "var(--ep-strong)" }}>
              {t(s.title)} <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ep-accent)" }}>· {t(s.where)}</span>
            </span>
            <span style={{ display: "block", fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.6)", lineHeight: 1.45, marginTop: 2 }}>{t(s.body)}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// Insère un slide "on répond direct" juste après l'accueil quand le
// questionnaire de personnalisation a identifié des freins/idées reçues —
// jamais pour les profils confirmés qui n'en ont pas besoin. Insère aussi,
// juste après, un slide "premier guide" quand un guide a pu être choisi
// (voir OnboardingFlow.tsx) : volontairement tôt dans le tour, avant que le
// bouton "Passer" ait une chance d'être utilisé, pour maximiser les chances
// qu'un membre gratuit reparte avec un vrai contenu reçu, pas juste une
// visite guidée de fonctionnalités.
function buildSlides(
  personalization: PersonalizationProfile,
  guide: GuideRef | null,
  starter: PresetRecommendation | null,
  coached: boolean,
  checkinDayLabel: string | null
): Slide[] {
  const SLIDES = baseSlides(coached, checkinDayLabel);
  let slides = SLIDES;

  if (personalization.mythBusters.length > 0) {
    const mythSlide: Slide = {
      icon: Lightbulb,
      eyebrow: "On sait ce que tu penses",
      title: "On répond direct à ce qui te freine",
      desc: personalization.mythBusters.map((m) => `${m.title} : ${m.body}`).join("\n\n"),
      bullets: personalization.mythBusters.map((m) => m.title.replace(/^"|"$/g, "")),
    };
    slides = [SLIDES[0], mythSlide, ...SLIDES.slice(1)];
  }

  if (guide) {
    const guideSlide: Slide = {
      icon: BookOpen,
      eyebrow: "Cadeau de bienvenue",
      title: guide.title,
      desc: guide.hook?.trim() || "Un guide choisi pour toi selon ton objectif, à lire en 5 minutes.",
      guideLink: { href: `/ressources/${guide.slug}`, label: "Lire le guide" },
    };
    slides = [slides[0], guideSlide, ...slides.slice(1)];
  }

  // Programme de départ (membre gratuit sans programme, voir
  // OnboardingFlow) : en tout premier après l'accueil, parce que c'est la
  // seule slide qui débouche sur une vraie action (une séance prête à
  // lancer) et pas sur une présentation de fonctionnalité.
  if (starter) {
    const starterSlide: Slide = {
      icon: Dumbbell,
      eyebrow: "Ton programme de départ",
      title: "Ta première séance est prête",
      desc: starter.reason,
      starter,
    };
    slides = [slides[0], starterSlide, ...slides.slice(1)];
  }

  return slides;
}

function BenefitCards({ items }: { items: { title: string; body: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18, textAlign: "left" }}>
      {items.map((b) => (
        <div
          key={b.title}
          style={{
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(var(--ep-accent-rgb),0.06)", border: "1px solid rgba(var(--ep-accent-rgb),0.22)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--ep-ink)", margin: "0 0 3px" }}>{b.title}</p>
          <p style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.5, margin: 0 }}>{b.body}</p>
        </div>
      ))}
    </div>
  );
}

function StarterCard({ starter }: { starter: PresetRecommendation }) {
  const t = useT();
  const router = useRouter();
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { preset } = starter;

  async function install() {
    setInstalling(true);
    setError(null);
    const res = await installStarterProgram(preset.id).catch(() => ({ error: "Erreur inattendue." }));
    if (res.error) {
      setError(res.error);
      setInstalling(false);
      return;
    }
    // Attendu ici (contrairement à goToApp) : la page programme ne renvoie
    // pas vers /onboarding, mais l'accueil oui tant que l'écriture n'a pas
    // atterri, et c'est là que la personne reviendra ensuite.
    await completeOnboarding().catch(() => {});
    router.push("/dashboard/client/program");
    router.refresh();
  }

  return (
    <div style={{ marginTop: 18, textAlign: "left" }}>
      <div
        style={{
          padding: "14px 16px", borderRadius: 14,
          background: "rgba(var(--ep-accent-rgb),0.06)", border: "1px solid rgba(var(--ep-accent-rgb),0.22)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--ep-ink)", margin: 0 }}>{preset.name}</p>
          <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)", whiteSpace: "nowrap" }}>
            {preset.frequency}{t("x / semaine")}
          </span>
        </div>
        {preset.input.days.map((day) => (
          <p key={day.day_label} style={{ fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.5, margin: "4px 0 0" }}>
            <span style={{ fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.8)" }}>{day.day_label}</span>
            {" · "}
            {day.exercises.map((ex) => ex.name).join(", ")}
          </p>
        ))}
      </div>
      <button
        onClick={install}
        disabled={installing}
        className="ep-btn-primary"
        style={{ marginTop: 14, width: "100%", height: 48, fontSize: 13 }}
      >
        {installing ? t("Installation…") : <><Play size={14} fill="currentColor" />{" "}{t("Je le prends et je vois ma séance")}</>}
      </button>
      <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.35)", textAlign: "center", margin: "8px 0 0" }}>
        {t("Modifiable ou remplaçable à tout moment dans Mon programme.")}
      </p>
      {error && <p style={{ fontSize: 12, color: "var(--ep-bad)", textAlign: "center", margin: "8px 0 0" }}>{t(error)}</p>}
    </div>
  );
}

function BulletRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-5">
      {items.map((b) => (
        <span
          key={b}
          className="text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-(--ep-accent)/10 border border-(--ep-accent)/25 text-(--ep-ink)/70"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

export default function OnboardingTour({
  personalization,
  guide,
  starter,
  onSkip,
  onFinish,
  finishing,
  coached = false,
  checkinDayLabel = null,
}: {
  coached?: boolean;
  checkinDayLabel?: string | null;
  personalization: PersonalizationProfile;
  guide: GuideRef | null;
  starter: PresetRecommendation | null;
  onSkip: () => void;
  onFinish: () => void;
  finishing: boolean;
}) {
  const t = useT();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const slides = buildSlides(personalization, guide, starter, coached, checkinDayLabel);
  const isLast = step === slides.length - 1;
  const slide = slides[step];
  const Icon = slide.icon;

  function go(next: number, dir: 1 | -1) {
    setDirection(dir);
    setStep(next);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Progress dots + skip */}
      <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          {slides.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "var(--ep-accent)" : "rgba(var(--ep-accent-rgb),0.15)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <button
          onClick={onSkip}
          disabled={finishing}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(var(--ep-ink-rgb),0.06)",
            border: "1px solid rgba(var(--ep-ink-rgb),0.18)",
            borderRadius: 999,
            cursor: "pointer",
            color: "rgba(var(--ep-ink-rgb),0.75)", fontSize: 12, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            flexShrink: 0, padding: "7px 12px", whiteSpace: "nowrap",
            opacity: finishing ? 0.6 : 1,
          }}
        >
          {finishing ? (
            <div style={{ width: 12, height: 12, border: "2px solid rgba(var(--ep-ink-rgb),0.75)", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
          ) : (
            <>{t("Passer, accéder à l'appli")}{" "}<X size={13} /></>
          )}
        </button>
      </div>

      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          padding: "20px 24px",
          // Défilement vertical plutôt que coupure : la slide du programme de
          // départ est plus haute que les autres sur un petit téléphone. Le
          // centrage vertical passe par margin auto sur la slide (un
          // alignItems center rendrait le haut inaccessible au défilement).
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            // transform en toutes lettres plutôt que le raccourci x de Framer
            // Motion : x/y/scale passent par un rendu piloté en JS
            // (requestAnimationFrame, thread principal) tandis qu'un vrai
            // "transform" anime via le thread de composition du navigateur —
            // reste fluide même si le thread principal est occupé (ex.
            // chargement d'une étape suivante).
            initial={{ opacity: 0, transform: `translateX(${direction > 0 ? 40 : -40}px)` }}
            animate={{ opacity: 1, transform: "translateX(0px)" }}
            exit={{ opacity: 0, transform: `translateX(${direction > 0 ? -40 : 40}px)` }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: "100%", maxWidth: 420, textAlign: "center", margin: "auto 0" }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: 22, margin: "0 auto 24px",
                background: "linear-gradient(135deg, rgba(var(--ep-accent-rgb),0.18), rgba(var(--ep-line-rgb),0.1))",
                border: "1px solid rgba(var(--ep-accent-rgb),0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon size={30} style={{ color: "var(--ep-accent)" }} strokeWidth={1.6} />
            </div>

            <p style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--ep-accent)", margin: "0 0 10px",
            }}>
              {slide.eyebrow}
            </p>

            <h1 style={{
              fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900,
              letterSpacing: "-0.03em", color: "var(--ep-ink)", margin: "0 0 14px",
              lineHeight: 1.15,
            }}>
              {slide.title}
            </h1>

            <p style={{ fontSize: 14, color: "rgba(var(--ep-ink-rgb),0.5)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
              {slide.desc}
            </p>

            {slide.kind === "ambiance" && <div style={{ marginTop: 18 }}><AmbiancePicker /></div>}
            {slide.kind === "tabs" && <TabsMap />}
            {slide.kind === "bilans" && <BilansSteps coached={coached} />}
            {slide.bullets && <BulletRow items={slide.bullets} />}
            {slide.benefits && <BenefitCards items={slide.benefits} />}
            {slide.starter && <StarterCard starter={slide.starter} />}
            {slide.guideLink && (
              <a
                href={slide.guideLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ep-btn-primary"
                style={{ marginTop: 22, textDecoration: "none" }}
              >
                {slide.guideLink.label} <ArrowRight size={16} />
              </a>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <div style={{ padding: "0 24px 36px", display: "flex", gap: 10, maxWidth: 420, width: "100%", margin: "0 auto" }}>
        {step > 0 && (
          <button
            onClick={() => go(step - 1, -1)}
            aria-label={t("Étape précédente")}
            style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              border: "1px solid rgba(var(--ep-ink-rgb),0.12)", background: "transparent",
              color: "rgba(var(--ep-ink-rgb),0.4)", cursor: "pointer", fontSize: 18,
            }}
          >
            ←
          </button>
        )}
        {isLast ? (
          <button
            onClick={onFinish}
            disabled={finishing}
            className="ep-btn-primary"
            style={{ flex: 1, height: 52, fontSize: 13 }}
          >
            {finishing ? t("Un instant…") : <>{t("À toi de jouer")}{" "}<ArrowRight size={16} /></>}
          </button>
        ) : (
          <button
            onClick={() => go(step + 1, 1)}
            className="ep-btn-primary"
            style={{ flex: 1, height: 52, fontSize: 13 }}
          >
            {t("Suivant")}{" "}<ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
