"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfileSetupStep from "./ProfileSetupStep";
import PersonalizationQuiz from "./PersonalizationQuiz";
import OnboardingTour from "./OnboardingTour";
import { completeOnboarding, saveMemberPreferences } from "@/app/onboarding/actions";
import {
  derivePersonalization,
  type MemberPreferences,
  type PersonalizationProfile,
} from "@/lib/personalization";

type Step = "profile" | "quiz" | "tour";

// Empêche un appel serveur qui traîne (ou qui ne répond jamais) de laisser
// l'utilisateur bloqué sur un bouton en chargement à vie.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([
    promise,
    new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms)),
  ]);
}

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [personalization, setPersonalization] = useState<PersonalizationProfile>(() =>
    derivePersonalization(null)
  );
  const [finishing, setFinishing] = useState(false);

  // Skip et fin de tour font strictement la même chose : on marque
  // l'onboarding comme fait et on atterrit direct dans l'appli, sans détour.
  // Best-effort avec timeout : un souci réseau ou un appel qui ne répond
  // jamais ne doit jamais bloquer l'utilisateur ici.
  async function goToApp() {
    setFinishing(true);
    try {
      await withTimeout(completeOnboarding(), 4000);
    } catch {
      // Ignoré volontairement.
    }
    router.push("/dashboard/client");
    router.refresh();
  }

  function handleQuizComplete(answers: Partial<MemberPreferences>) {
    saveMemberPreferences(answers).catch(() => {
      // Best-effort — si la sauvegarde échoue, l'utilisateur voit quand
      // même un tour personnalisé pour cette session (juste pas persisté).
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
      onSkip={goToApp}
      onFinish={goToApp}
      finishing={finishing}
    />
  );
}
