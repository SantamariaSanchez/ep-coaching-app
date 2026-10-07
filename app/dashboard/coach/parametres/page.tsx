import { getT } from "@/lib/i18n-server";
import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCoachBillingInfo } from "@/lib/coach-billing";
import { getCoachWaitlist } from "@/utils/waitlist";
import AccountActions from "@/components/profile/AccountActions";
import AcceptingClientsCard from "@/components/coach/AcceptingClientsCard";
import CoachSpecializationsCard from "@/components/coach/CoachSpecializationsCard";
import PrivacyCard from "@/components/settings/PrivacyCard";
import AccessibilityCard from "@/components/settings/AccessibilityCard";
import PermissionsCard from "@/components/settings/PermissionsCard";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import NewsletterPreferenceCard from "@/components/settings/NewsletterPreferenceCard";
import { MUTABLE_CATEGORIES, type NotificationCategory, type NotificationPreferences } from "@/lib/notification-preferences";
import { getNewsletterSubscriptionStatus } from "@/app/actions/newsletter";
import InviteLinkCard from "@/components/coach/InviteLinkCard";
import PersonalCoachCard from "@/components/coach/PersonalCoachCard";
import PaymentLinkCard from "@/components/coach/PaymentLinkCard";
import MyPlatformSubscriptionCard from "@/components/coach/MyPlatformSubscriptionCard";
import LegalLinksCard from "@/components/settings/LegalLinksCard";
import TwoFactorCard from "@/components/settings/TwoFactorCard";
import ConnectionsCard from "@/components/settings/ConnectionsCard";
import { isOuraConfigured } from "@/lib/oura";
import LanguageDisplayCard from "@/components/settings/LanguageDisplayCard";
import TrainingNutritionCard from "@/components/settings/TrainingNutritionCard";
import DeviceAboutCard from "@/components/settings/DeviceAboutCard";
import SettingsShell from "@/components/settings/SettingsShell";
import ClaudeConnect from "@/components/notes/ClaudeConnect";
import { getUserSettingsAction } from "@/app/actions/user-settings";
import { appVersion } from "@/lib/app-version";

export default async function CoachParametresPage() {
  const t = await getT();
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "client") redirect("/dashboard/client/parametres");

  const supabase = await createServerSupabase();
  const { data: pushSub } = await supabase
    .from("push_subscriptions")
    .select("id, quiet_hours_start, quiet_hours_end")
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
  const [acceptingRow, waitlist, notifRow, ouraRow, newsletterSubscribed] = await Promise.all([
    createAdminClient()
      .from("profiles")
      .select("accepting_new_clients, specializations, directory_visible")
      .eq("id", user.id)
      .maybeSingle(),
    getCoachWaitlist(user.id),
    supabase.from("profiles").select("notification_preferences").eq("id", user.id).maybeSingle(),
    // Nouveau : carte "Connexions" — statut Oura visible depuis Paramètres,
    // pas seulement sur Moi > Sommeil.
    createAdminClient().from("oura_connections").select("client_id").eq("client_id", user.id).maybeSingle(),
    getNewsletterSubscriptionStatus(),
  ]);
  const [settings, { data: tokens }] = await Promise.all([
    getUserSettingsAction(),
    createAdminClient().from("api_tokens").select("id, name, created_at, last_used_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  const acceptingData = acceptingRow.data as { accepting_new_clients: boolean; specializations: string[] | null; directory_visible: boolean | null } | null;
  const accepting = acceptingData?.accepting_new_clients ?? true;
  const specializations = acceptingData?.specializations ?? [];
  const directoryVisible = acceptingData?.directory_visible !== false;
  const notifPrefs = (notifRow.data?.notification_preferences as NotificationPreferences | null) ?? {};
  const mutedCategories = MUTABLE_CATEGORIES.filter((c) => notifPrefs[c] === true) as NotificationCategory[];

  return (
    <SettingsShell
      sections={[
        {
          id: "affichage",
          title: t("Langue et affichage"),
          keywords: "langue anglais english français page d'ouverture accueil vibration haptique mon appli rubriques disciplines personnalisation taille du texte animations accessibilité",
          node: (
            <>
              <LanguageDisplayCard space="coach" />
              <AccessibilityCard />
            </>
          ),
        },
        {
          id: "activite",
          title: t("Mon activité de coach"),
          keywords: "nouveaux clients liste d'attente spécialisations niches annuaire visibilité",
          node: (
            <>
              <AcceptingClientsCard initialAccepting={accepting} waitlist={waitlist} />
              <CoachSpecializationsCard initialSpecializations={specializations} />
              <PrivacyCard initialVisible={directoryVisible} />
            </>
          ),
        },
        ...(!profile.is_platform_owner
          ? [{
              id: "abonnement",
              title: t("Abonnement et paiements"),
              keywords: "abonnement facture stripe paiement lien d'invitation code coach personnel",
              node: (
                <>
                  <MyPlatformSubscriptionCard billing={myBilling} />
                  <InviteLinkCard inviteCode={profile.invite_code} />
                  <PaymentLinkCard initialLink={profile.external_payment_link} />
                  <PersonalCoachCard linkedCoachName={linkedCoachName} />
                </>
              ),
            }]
          : []),
        {
          id: "entrainement",
          title: t("Séance et courses"),
          keywords: "repos minuteur chrono son bip vibration séance entraînement courses stock inventaire aliments repas",
          node: <TrainingNutritionCard initialPantryAuto={settings.pantryAuto} />,
        },
        {
          id: "notifications",
          title: t("Notifications"),
          keywords: "notifications rappels push autorisations heures calmes silence newsletter email pas podomètre",
          node: (
            <>
              <PermissionsCard
                pushSubscribed={!!pushSub}
                stepsHref="/dashboard/coach/moi/steps"
                quietHoursStart={pushSub?.quiet_hours_start ?? null}
                quietHoursEnd={pushSub?.quiet_hours_end ?? null}
              />
              <NotificationPreferencesCard initialMuted={mutedCategories} />
              <NewsletterPreferenceCard initialSubscribed={newsletterSubscribed} />
            </>
          ),
        },
        {
          id: "connexions",
          title: t("Claude, Notion et objets"),
          keywords: "claude ia intelligence artificielle notion connecteur clé oura bague montre connexion",
          node: (
            <>
              <ClaudeConnect tokens={(tokens ?? []) as { id: string; name: string; created_at: string; last_used_at: string | null }[]} />
              <ConnectionsCard ouraConnected={!!ouraRow.data} ouraConfigured={isOuraConfigured()} ouraHref="/dashboard/coach/moi/tracking" />
            </>
          ),
        },
        {
          id: "securite",
          title: t("Compte et sécurité"),
          keywords: "compte email mot de passe déconnexion déconnecter partout appareils sessions supprimer exporter données double authentification 2fa sécurité",
          node: (
            <>
              <AccountActions email={profile.email} signOutRedirect="/auth/coach" />
              {/* Obligatoire pour le fondateur : ce compte voit tous les membres de la plateforme. */}
              <TwoFactorCard enabled={!!profile.mfa_enabled} mandatory={!!profile.is_platform_owner} />
            </>
          ),
        },
        {
          id: "appareil",
          title: t("Appareil et à propos"),
          keywords: "cache version mise à jour appareil mentions légales cgu confidentialité",
          node: (
            <>
              <DeviceAboutCard version={appVersion()} />
              <LegalLinksCard />
            </>
          ),
        },
      ]}
    />
  );
}
