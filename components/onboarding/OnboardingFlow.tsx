"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileSetupStep from "./ProfileSetupStep";
import PersonalizationQuiz from "./PersonalizationQuiz";
import OnboardingTour from "./OnboardingTour";
import { completeOnboarding, getWelcomeGuide, saveMemberPreferences } from "@/app/onboarding/actions";
import {
  derivePersonalization,
  type MemberPreferences,
  type PersonalizationProfile,
} from "@/lib/personalization";
import type { GuideRef } from "@/lib/reengagement";

type Step = "profile" | "quiz" | "tour";

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [personalization, setPersonalization] = useState<PersonalizationProfile>(() =>
    derivePersonalization(null)
  );
  // Chargé en tâche de fond pendant le quiz déjà terminé : le tour a
  // plusieurs slides avant celui du guide, largement le temps que cette
  // requête revienne. Reste null (slide simplement absente) si elle échoue.
  const [guide, setGuide] = useState<GuideRef | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Skip et fin de tour font strictement la même chose : on marque
  // l'onboarding comme fait et on atterrit direct dans l'appli, sans détour.
  // Navigation instantanée : on ne bloque jamais l'utilisateur en attendant
  // la réponse serveur (fire-and-forget), le dashboard accepte ?onboarded=1
  // en filet de sécurité si l'écriture n'a pas encore atterri en base.
  function goToApp() {
    setFinishing(true);
    completeOnboarding().catch(() => {
      // Ignoré volontairement — best-effort.
    });
    router.push("/dashboard/client?onboarded=1");
    router.refresh();
  }

  function handleQuizComplete(answers: Partial<MemberPreferences>) {
    saveMemberPreferences(answers).catch(() => {
      // Best-effort — si la sauvegarde échoue, l'utilisateur voit quand
      // même un tour personnalisé pour cette session (juste pas persisté).
    });
    getWelcomeGuide(answers.primary_goal ?? null)
      .then(setGuide)
      .catch(() => {
        // Best-effort — le tour reste utilisable sans slide guide.
      });
    setPersonalization(
      derivePersonalization({
        experience_level: answers.experience_level ?? null,
        primary_goal: answers.primary_goal ?? null,
        training_frequency: answers.training_frequency ?? null,
        tracks_nutrition: answers.tracks_nutrition ?? null,
        biggest_obstacle: answers.biggest_obstacle ?? null,
      })
    );
    setStep("tour");
  }

  if (step === "profile") {
    return <ProfileSetupStep onDone={() => setStep("quiz")} finishing={finishing} />;
  }

  if (step === "quiz") {
    return (
      <PersonalizationQuiz onComplete={handleQuizComplete} onSkipAll={goToApp} finishing={finishing} />
    );
  }

  return (
    <OnboardingTour
      personalization={personalization}
      guide={guide}
      onSkip={goToApp}
      onFinish={goToApp}
      finishing={finishing}
    />
  );
}
