"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dumbbell, Apple, Heart, Crown, ArrowRight, X,
  Image as ImageIcon, Sparkles, FlaskConical, Trophy,
  GraduationCap, Lightbulb, BookOpen,
} from "lucide-react";
import type { PersonalizationProfile } from "@/lib/personalization";
import type { GuideRef } from "@/lib/reengagement";

interface Slide {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  desc: string;
  bullets?: string[];
  benefits?: { title: string; body: string }[];
  guideLink?: { href: string; label: string };
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "Bienvenue",
    title: "T'es officiellement dans la place 👋",
    desc: "1 minute pour tout comprendre : ton compte est gratuit, à vie. Un vrai coach en plus, c'est possible si tu veux : bilans persos, appels live, accompagnement mindset, et une bague Oura Ring offerte. 100% optionnel. Let's go.",
  },
  {
    icon: Dumbbell,
    eyebrow: "Training",
    title: "Construis ton entraînement",
    desc: "Crée ton programme, logue chaque séance en temps réel, garde tes records personnels sous la main, et pioche dans la bibliothèque d'exercices et de salles partenaires.",
    bullets: ["Programme sur-mesure", "Logbook de séance", "Road Map d'objectifs", "Bibliothèque d'exercices & salles"],
  },
  {
    icon: Apple,
    eyebrow: "Nutrition",
    title: "Maîtrise ton assiette",
    desc: "Calcule tes besoins caloriques, logue tes repas en 2 clics, et pioche dans des centaines de recettes triées par régime, phase et macros.",
    bullets: ["Calcul TDEE & macros", "Journal alimentaire", "Bibliothèque de recettes", "Créateur de repas"],
  },
  {
    icon: ImageIcon,
    eyebrow: "Suivi",
    title: "Vois ta progression",
    desc: "Bilan quotidien (poids, sommeil, ressenti), photos de transformation et posing, pas & routine, mindset : tout ce qu'il faut pour suivre ton évolution semaine après semaine.",
    bullets: ["Bilan quotidien", "Photos & posing", "Steps", "Mindset"],
  },
  {
    icon: FlaskConical,
    eyebrow: "Science",
    title: "Vérifie ce qu'on te raconte",
    desc: "Recherche en direct sur PubMed, actualité scientifique, bibliothèque de méta-analyses sur l'entraînement et la nutrition. Fais-toi ton propre avis, sourcé.",
    bullets: ["Recherche PubMed live", "Actualité scientifique", "Bibliothèque de méta-analyses", "Nos propres études"],
  },
  {
    icon: Heart,
    eyebrow: "Communauté",
    title: "Tu n'avances plus dans ton coin",
    desc: "Partage tes victoires, pose tes questions. Toute la communauté peut te répondre et t'encourager. Chaque publication te rapporte des points.",
    bullets: ["Victoires", "Questions", "Ressources gratuites"],
  },
  {
    icon: Trophy,
    eyebrow: "Points & rang",
    title: "Plus tu joues le jeu, plus tu débloques",
    desc: "Bilan loggé, séance complétée, leçon vue, victoire publiée : chaque action te rapporte des points. En grimpant les rangs (🌱 Débutant → 🐐 Légende), tu débloques du contenu bonus gratuitement, juste en étant actif·ve.",
    bullets: ["Recettes exclusives", "Vidéos de démonstration", "Participer à \"Nos études\""],
  },
  {
    icon: GraduationCap,
    eyebrow: "Contenu",
    title: "5 formations à venir",
    desc: "Musculation, nutrition, training, entrepreneuriat, psychologie : environ 25h de contenu au total, en cours de tournage. Une fois disponibles, ce sera la seule chose réservée aux clients coachés (tout le reste que tu viens de voir est gratuit, ou débloquable par points).",
  },
  {
    icon: Crown,
    eyebrow: "Pour aller plus loin (optionnel)",
    title: "Un vrai coach, si tu le souhaites",
    desc: "Tout ce que tu viens de voir reste gratuit, sans limite de temps. En plus, si tu veux :",
    benefits: [
      { title: "Bilan chaque semaine", body: "Ton coach ajuste ton programme selon tes vrais résultats, pas un algorithme qui devine." },
      { title: "Messages directs", body: "Tu écris, tu as une réponse de ton coach. Pas d'un bot." },
      { title: "Appels live", body: "Groupe ou 1:1, un vrai échange vocal quand t'en as besoin." },
      { title: "Bague Oura offerte", body: "Sommeil et récupération trackés automatiquement, connectés à ton suivi." },
    ],
  },
];

// Insère un slide "on répond direct" juste après l'accueil quand le
// questionnaire de personnalisation a identifié des freins/idées reçues —
// jamais pour les profils confirmés qui n'en ont pas besoin. Insère aussi,
// juste après, un slide "premier guide" quand un guide a pu être choisi
// (voir OnboardingFlow.tsx) : volontairement tôt dans le tour, avant que le
// bouton "Passer" ait une chance d'être utilisé, pour maximiser les chances
// qu'un membre gratuit reparte avec un vrai contenu reçu, pas juste une
// visite guidée de fonctionnalités.
function buildSlides(personalization: PersonalizationProfile, guide: GuideRef | null): Slide[] {
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
            background: "rgba(224,30,30,0.06)", border: "1px solid rgba(224,30,30,0.22)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 800, color: "#F5EDED", margin: "0 0 3px" }}>{b.title}</p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", lineHeight: 1.5, margin: 0 }}>{b.body}</p>
        </div>
      ))}
    </div>
  );
}

function BulletRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-5">
      {items.map((b) => (
        <span
          key={b}
          className="text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-[#E01E1E]/10 border border-[#E01E1E]/25 text-[#F5EDED]/70"
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
  onSkip,
  onFinish,
  finishing,
}: {
  personalization: PersonalizationProfile;
  guide: GuideRef | null;
  onSkip: () => void;
  onFinish: () => void;
  finishing: boolean;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const slides = buildSlides(personalization, guide);
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
                background: i <= step ? "#E01E1E" : "rgba(224,30,30,0.15)",
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
            background: "rgba(245,237,237,0.06)",
            border: "1px solid rgba(245,237,237,0.18)",
            borderRadius: 999,
            cursor: "pointer",
            color: "rgba(245,237,237,0.75)", fontSize: 12, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            flexShrink: 0, padding: "7px 12px", whiteSpace: "nowrap",
            opacity: finishing ? 0.6 : 1,
          }}
        >
          {finishing ? (
            <div style={{ width: 12, height: 12, border: "2px solid rgba(245,237,237,0.75)", borderTopColor: "transparent", borderRadius: "50%" }} className="animate-spin" />
          ) : (
            <>Passer, accéder à l&apos;appli <X size={13} /></>
          )}
        </button>
      </div>

      {/* Slide content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px 24px",
          overflow: "hidden",
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
            style={{ width: "100%", maxWidth: 420, textAlign: "center" }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: 22, margin: "0 auto 24px",
                background: "linear-gradient(135deg, rgba(224,30,30,0.18), rgba(137,4,4,0.1))",
                border: "1px solid rgba(224,30,30,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon size={30} style={{ color: "#E01E1E" }} strokeWidth={1.6} />
            </div>

            <p style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#E01E1E", margin: "0 0 10px",
            }}>
              {slide.eyebrow}
            </p>

            <h1 style={{
              fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900,
              letterSpacing: "-0.03em", color: "#F5EDED", margin: "0 0 14px",
              lineHeight: 1.15,
            }}>
              {slide.title}
            </h1>

            <p style={{ fontSize: 14, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
              {slide.desc}
            </p>

            {slide.bullets && <BulletRow items={slide.bullets} />}
            {slide.benefits && <BenefitCards items={slide.benefits} />}
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
            aria-label="Étape précédente"
            style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              border: "1px solid rgba(245,237,237,0.12)", background: "transparent",
              color: "rgba(245,237,237,0.4)", cursor: "pointer", fontSize: 18,
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
            {finishing ? "Un instant…" : <>À toi de jouer <ArrowRight size={16} /></>}
          </button>
        ) : (
          <button
            onClick={() => go(step + 1, 1)}
            className="ep-btn-primary"
            style={{ flex: 1, height: 52, fontSize: 13 }}
          >
            Suivant <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
