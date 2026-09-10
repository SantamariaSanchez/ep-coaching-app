import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getCoachWaitlist } from "@/utils/waitlist";
import { createServerSupabase } from "@/lib/supabase-server";
import { getBusinessCanvas } from "@/lib/coach-business-canvas";
import CoachOnboardingFlow from "@/components/onboarding/CoachOnboardingFlow";

// Onboarding coach (Axe 9, VISION.md — gap confirmé 2026-08-19, retour
// direct : "je crois que ya que l'onboarding pour le membre et client...
// fait l'onboarding complet pour les coachs"). Miroir de /onboarding
// (client) mais pour un coach tiers qui vient de payer son abonnement
// plateforme : présentation rapide, puis 3 étapes qui remplissent ce que
// l'annuaire public /coachs et le lien d'inscription client montreront
// dès le premier vrai client — jamais avant, l'annuaire ne doit pas
// exposer une fiche vide.
export default async function CoachOnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/dashboard/client");
  if (profile.is_platform_owner) redirect("/dashboard/coach");
  if (profile.onboarding_completed_at) redirect("/dashboard/coach");

  const supabase = await createServerSupabase();
  const [{ data: extraRow }, waitlist, canvas] = await Promise.all([
    supabase.from("profiles").select("specializations, accepting_new_clients").eq("id", user.id).maybeSingle(),
    getCoachWaitlist(user.id),
    getBusinessCanvas(user.id),
  ]);

  return (
    <CoachOnboardingFlow
      fullName={profile.full_name ?? ""}
      phone={profile.phone}
      bio={profile.bio}
      instagramHandle={profile.instagram_handle}
      specializations={(extraRow?.specializations as string[] | null) ?? []}
      accepting={(extraRow?.accepting_new_clients as boolean | null) ?? true}
      waitlist={waitlist}
      inviteCode={profile.invite_code}
      canvas={canvas}
    />
  );
}
