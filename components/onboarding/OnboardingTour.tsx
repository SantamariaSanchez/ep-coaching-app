"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dumbbell, Apple, Heart, Crown, ArrowRight, X,
  Image as ImageIcon, Sparkles,
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
    desc: "30 secondes, 5 écrans, et tu sauras exactement tout ce que tu peux faire ici. Let's go.",
  },
  {
    icon: Dumbbell,
    eyebrow: "Training",
    title: "Construis ton entraînement",
    desc: "Crée ton programme, logue chaque séance en temps réel, et garde tes records personnels sous la main.",
    bullets: ["Programme sur-mesure", "Logbook de séance", "Records personnels"],
  },
  {
    icon: Apple,
    eyebrow: "Nutrition",
    title: "Maîtrise ton assiette",
    desc: "Calcule tes besoins caloriques, logue tes repas en 2 clics, et choisis le mode qui te convient.",
    bullets: ["Calcul TDEE & macros", "Journal alimentaire", "Mode flexible ou plan fixe"],
  },
  {
    icon: ImageIcon,
    eyebrow: "Suivi",
    title: "Vois ta progression",
    desc: "Un bilan quotidien (poids, sommeil, ressenti) et des photos pour suivre ta transformation, semaine après semaine.",
  },
  {
    icon: Heart,
    eyebrow: "Communauté",
    title: "T'es plus seul·e",
    desc: "Partage tes victoires, pose tes questions — toute la communauté (et le coach) peut te répondre.",
    bullets: ["Victoires", "Questions", "Ressources gratuites"],
  },
  {
    icon: Crown,
    eyebrow: "Pour aller plus loin",
    title: "Le coaching premium, quand tu veux",
    desc: "Programme et nutrition coachés sur-mesure, bilans hebdo, messages directs avec ton coach. Accessible à tout moment depuis Abonnement.",
  },
];

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
                background: i <= step ? "#E01E1E" : "rgba(224,30,30,0.15)",
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
            color: "rgba(245,237,237,0.3)", fontSize: 11, fontWeight: 700,
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

            <p style={{ fontSize: 14, color: "rgba(245,237,237,0.5)", lineHeight: 1.6, margin: 0 }}>
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
