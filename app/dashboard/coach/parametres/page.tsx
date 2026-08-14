import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachBillingInfo } from "@/lib/coach-billing";
import { getCoachWaitlist } from "@/utils/waitlist";
import AccountActions from "@/components/profile/AccountActions";
import AcceptingClientsCard from "@/components/coach/AcceptingClientsCard";
import PermissionsCard from "@/components/settings/PermissionsCard";
import InviteLinkCard from "@/components/coach/InviteLinkCard";
import PersonalCoachCard from "@/components/coach/PersonalCoachCard";
import PaymentLinkCard from "@/components/coach/PaymentLinkCard";
import MyPlatformSubscriptionCard from "@/components/coach/MyPlatformSubscriptionCard";
import LegalLinksCard from "@/components/settings/LegalLinksCard";
import TwoFactorCard from "@/components/settings/TwoFactorCard";

export default async function CoachParametresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/dashboard/client/parametres");

  const supabase = await createServerSupabase();
  const { data: pushSub } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let linkedCoachName: string | null = null;
  if (profile.coach_id) {
    const admin = createAdminClient();
    const { data: linkedCoach } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", profile.coach_id)
      .maybeSingle();
    linkedCoachName = linkedCoach?.full_name ?? "ton coach";
  }

  const myBilling = !profile.is_platform_owner
    ? await getCoachBillingInfo(profile.platform_stripe_customer_id, profile.platform_stripe_subscription_id)
    : null;

  // Item 45 : lecture ciblée (pas dans PROFILE_FIELDS), même convention que
  // referral_code/trial_ends_at côté client — évite d'alourdir getProfile()
  // utilisé partout avec des colonnes que seule cette page consulte.
  const [acceptingRow, waitlist] = await Promise.all([
    createAdminClient().from("profiles").select("accepting_new_clients").eq("id", user.id).maybeSingle(),
    getCoachWaitlist(user.id),
  ]);
  const accepting = (acceptingRow.data as { accepting_new_clients: boolean } | null)?.accepting_new_clients ?? true;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Paramètres</h1>
      </div>

      <PermissionsCard pushSubscribed={!!pushSub} stepsHref="/dashboard/coach/moi/steps" />

      <AccountActions email={profile.email} signOutRedirect="/auth/coach" />

      {/* Obligatoire pour le fondateur : ce compte voit tous les membres de la
          plateforme (voir proxy.ts, qui bloque le dashboard sans 2FA). */}
      <TwoFactorCard
        enabled={!!profile.mfa_enabled}
        mandatory={!!profile.is_platform_owner}
      />

      <AcceptingClientsCard initialAccepting={accepting} waitlist={waitlist} />

      {!profile.is_platform_owner && (
        <div className="mt-4">
          <MyPlatformSubscriptionCard billing={myBilling} />
          <InviteLinkCard inviteCode={profile.invite_code} />
          <PaymentLinkCard initialLink={profile.external_payment_link} />
          <PersonalCoachCard linkedCoachName={linkedCoachName} />
        </div>
      )}

      {/* Finance et gestion des coachs vivent désormais dans un vrai groupe
          de nav "Administration" (sidebar desktop + sous-bande Accueil sur
          mobile) — un tap depuis l'accueil au lieu de Paramètres → scroll →
          bouton. Rien à dupliquer ici. */}

      <LegalLinksCard />
    </div>
  );
}
