"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dumbbell, Apple, Heart, Crown, ArrowRight, X,
  Image as ImageIcon, Sparkles, FlaskConical, Trophy,
  GraduationCap,
} from "lucide-react";
import { completeOnboarding } from "@/app/onboarding/actions";

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
    desc: "1 minute, 9 écrans, et tu sauras exactement tout ce que tu peux faire ici — gratuitement et en payant. Let's go.",
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
    desc: "Bilan quotidien (poids, sommeil, ressenti), photos de transformation, pas & routine, mindset — tout ce qu'il faut pour suivre ton évolution semaine après semaine.",
  },
  {
    icon: FlaskConical,
    eyebrow: "Science",
    title: "Vérifie ce qu'on te raconte",
    desc: "Recherche en direct sur PubMed, actualité scientifique, bibliothèque de méta-analyses sur l'entraînement et la nutrition — fais-toi ton propre avis, sourcé.",
    bullets: ["Recherche PubMed live", "Actualité scientifique", "Bibliothèque de méta-analyses", "Nos propres études"],
  },
  {
    icon: Heart,
    eyebrow: "Communauté",
    title: "T'es plus seul·e",
    desc: "Partage tes victoires, pose tes questions — toute la communauté (et le coach) peut te répondre. Et chaque publication te rapporte des points.",
    bullets: ["Victoires", "Questions", "Ressources gratuites"],
  },
  {
    icon: Trophy,
    eyebrow: "Points & rang",
    title: "Plus tu joues le jeu, plus tu débloques",
    desc: "Bilan loggé, séance complétée, leçon vue, victoire publiée : chaque action te rapporte un peu de points. En grimpant les rangs (🌱 Débutant → 🐐 Légende), tu débloques progressivement du contenu sans jamais payer.",
    bullets: ["Recettes exclusives", "Vidéos de démonstration", "Participer à \"Nos études\""],
  },
  {
    icon: GraduationCap,
    eyebrow: "Contenu",
    title: "80h+ de formations",
    desc: "Entraînement, nutrition, mental — des modules vidéo complets, accessibles à vie. C'est le seul contenu réservé à l'abonnement (le reste est gratuit ou débloquable par points).",
  },
  {
    icon: Crown,
    eyebrow: "Pour aller plus loin",
    title: "Le coaching premium, quand tu veux",
    desc: "Programme et nutrition coachés sur-mesure, bilans hebdo, messages directs avec ton coach, formations complètes. Accessible à tout moment depuis Abonnement.",
  },
];

function BulletRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-5">
      {items.map((b) => (
        <span
          key={b}
          className="text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full bg-[var(--color-ep-red)]/10 border border-[var(--color-ep-red)]/25 text-[var(--color-ep-light)]/70"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

export default function OnboardingTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [finishing, setFinishing] = useState(false);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step];
  const Icon = slide.icon;

  function go(next: number, dir: 1 | -1) {
    setDirection(dir);
    setStep(next);
  }

  async function finish() {
    setFinishing(true);
    await completeOnboarding();
    router.push("/dashboard/client");
    router.refresh();
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
          {SLIDES.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? "var(--color-ep-red)" : "rgba(var(--color-ep-red-rgb),0.15)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>
        <button
          onClick={finish}
          disabled={finishing}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(var(--color-ep-light-rgb),0.3)", fontSize: 11, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em",
            flexShrink: 0, padding: "4px 0 4px 8px",
          }}
        >
          Passer <X size={12} />
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
                background: "linear-gradient(135deg, rgba(var(--color-ep-red-rgb),0.18), rgba(var(--color-ep-dark-red-rgb),0.1))",
                border: "1px solid rgba(var(--color-ep-red-rgb),0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon size={30} style={{ color: "var(--color-ep-red)" }} strokeWidth={1.6} />
            </div>

            <p style={{
              fontSize: 11, fontWeight: 800, letterSpacing: "0.18em",
              textTransform: "uppercase", color: "var(--color-ep-red)", margin: "0 0 10px",
            }}>
              {slide.eyebrow}
            </p>

            <h1 style={{
              fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 900,
              letterSpacing: "-0.03em", color: "var(--color-ep-light)", margin: "0 0 14px",
              lineHeight: 1.15,
            }}>
              {slide.title}
            </h1>

            <p style={{ fontSize: 14, color: "rgba(var(--color-ep-light-rgb),0.5)", lineHeight: 1.6, margin: 0 }}>
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
              border: "1px solid rgba(var(--color-ep-light-rgb),0.12)", background: "transparent",
              color: "rgba(var(--color-ep-light-rgb),0.4)", cursor: "pointer", fontSize: 18,
            }}
          >
            ←
          </button>
        )}
        {isLast ? (
          <button
            onClick={finish}
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
