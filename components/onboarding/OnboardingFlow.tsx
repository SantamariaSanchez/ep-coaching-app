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

export default function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("profile");
  const [personalization, setPersonalization] = useState<PersonalizationProfile>(() =>
    derivePersonalization(null)
  );
  const [finishing, setFinishing] = useState(false);

  // Skip et fin de tour font strictement la même chose : on marque
  // l'onboarding comme fait et on atterrit direct dans l'appli, sans détour.
  async function goToApp() {
    setFinishing(true);
    try {
      await completeOnboarding();
    } catch {
      // Best-effort — un souci réseau ne doit jamais bloquer l'utilisateur ici.
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
