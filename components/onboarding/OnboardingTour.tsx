"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dumbbell, Apple, Heart, Crown, ArrowRight, X,
  Image as ImageIcon, Sparkles, FlaskConical, Trophy,
  GraduationCap, Lightbulb,
} from "lucide-react";
import type { PersonalizationProfile } from "@/lib/personalization";

interface Slide {
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  desc: string;
  bullets?: string[];
}

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    eyebrow: "Bienvenue",
    title: "T'es officiellement dans la place 👋",
    desc: "1 minute pour tout comprendre : ton compte est gratuit, à vie. Un vrai coach en plus, c'est possible si tu veux — bilans persos, appels live, accompagnement mindset, et une bague Oura Ring offerte. 100% optionnel. Let's go.",
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
    bullets: ["Bilan quotidien", "Photos & posing", "Pas & routine", "Mindset"],
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
    title: "T'es plus seul·e",
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
    title: "80h+ de formations",
    desc: "Entraînement, nutrition, mental : des modules vidéo complets, accessibles à vie. C'est la seule chose réservée aux clients coachés (tout le reste que tu viens de voir est gratuit, ou débloquable par points).",
  },
  {
    icon: Crown,
    eyebrow: "Pour aller plus loin (optionnel)",
    title: "Un vrai coach, si tu le souhaites",
    desc: "Tout ce que tu viens de voir reste gratuit, sans limite de temps. En coaching payant, en plus du programme et de la nutrition sur-mesure : bilan chaque semaine, messages directs avec ton coach, appels live (groupe ou 1:1), accompagnement mindset, et une bague Oura Ring offerte pour connecter sommeil et récupération automatiquement. Réserve un appel découverte gratuit et sans engagement depuis \"Mon coaching\" — tu passes d'abord par un court questionnaire pour qu'on prépare l'appel ensemble.",
  },
];

// Insère un slide "on répond direct" juste après l'accueil quand le
// questionnaire de personnalisation a identifié des freins/idées reçues —
// jamais pour les profils confirmés qui n'en ont pas besoin.
function buildSlides(personalization: PersonalizationProfile): Slide[] {
  if (personalization.mythBusters.length === 0) return SLIDES;

  const mythSlide: Slide = {
    icon: Lightbulb,
    eyebrow: "On sait ce que tu penses",
    title: "On répond direct à ce qui te freine",
    desc: personalization.mythBusters.map((m) => `${m.title} — ${m.body}`).join("\n\n"),
    bullets: personalization.mythBusters.map((m) => m.title.replace(/^"|"$/g, "")),
  };

  return [SLIDES[0], mythSlide, ...SLIDES.slice(1)];
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
  onSkip,
  onFinish,
  finishing,
}: {
  personalization: PersonalizationProfile;
  onSkip: () => void;
  onFinish: () => void;
  finishing: boolean;
}) {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const slides = buildSlides(personalization);
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
          }}
        >
          Passer, accéder à l&apos;appli <X size={13} />
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
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
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
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Nav buttons */}
      <div style={{ padding: "0 24px 36px", display: "flex", gap: 10, maxWidth: 420, width: "100%", margin: "0 auto" }}>
        {step > 0 && (
          <button
            onClick={() => go(step - 1, -1)}
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
