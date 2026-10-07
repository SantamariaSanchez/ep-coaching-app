import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import AccountActions from "@/components/profile/AccountActions";
import PermissionsCard from "@/components/settings/PermissionsCard";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import NewsletterPreferenceCard from "@/components/settings/NewsletterPreferenceCard";
import PreferencesCard from "@/components/settings/PreferencesCard";
import AccessibilityCard from "@/components/settings/AccessibilityCard";
import MemberPrivacyCard from "@/components/settings/MemberPrivacyCard";
import LegalLinksCard from "@/components/settings/LegalLinksCard";
import TwoFactorCard from "@/components/settings/TwoFactorCard";
import ConnectionsCard from "@/components/settings/ConnectionsCard";
import LanguageDisplayCard from "@/components/settings/LanguageDisplayCard";
import TrainingNutritionCard from "@/components/settings/TrainingNutritionCard";
import DeviceAboutCard from "@/components/settings/DeviceAboutCard";
import SettingsShell from "@/components/settings/SettingsShell";
import ClaudeConnect from "@/components/notes/ClaudeConnect";
import { MUTABLE_CATEGORIES, type NotificationCategory, type NotificationPreferences } from "@/lib/notification-preferences";
import { getNewsletterSubscriptionStatus } from "@/app/actions/newsletter";
import { getUserSettingsAction } from "@/app/actions/user-settings";
import { getMemberPreferences } from "@/utils/member-preferences";
import { isOuraConfigured } from "@/lib/oura";
import { appVersion } from "@/lib/app-version";

export default async function ClientParametresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach/parametres");

  const supabase = await createServerSupabase();
  const admin = createAdminClient();
  const [{ data: pushSub }, { data: notifRow }, newsletterSubscribed, memberPreferences, settings, { data: tokens }, { data: oura }] = await Promise.all([
    supabase
      .from("push_subscriptions")
      .select("id, quiet_hours_start, quiet_hours_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    // Colonne consultée uniquement ici, pas dans PROFILE_FIELDS (même
    // convention que accepting_new_clients côté coach) : lecture ciblée
    // plutôt que d'alourdir getProfile() utilisé partout dans l'appli.
    supabase.from("profiles").select("notification_preferences, leaderboard_visible").eq("id", user.id).maybeSingle(),
    getNewsletterSubscriptionStatus(),
    getMemberPreferences(user.id),
    getUserSettingsAction(),
    admin.from("api_tokens").select("id, name, created_at, last_used_at").eq("owner_id", user.id).order("created_at", { ascending: false }),
    admin.from("oura_connections").select("client_id").eq("client_id", user.id).maybeSingle(),
  ]);
  const notifPrefs = (notifRow?.notification_preferences as NotificationPreferences | null) ?? {};
  const mutedCategories = MUTABLE_CATEGORIES.filter((c) => notifPrefs[c] === true) as NotificationCategory[];

  return (
    <SettingsShell
      sections={[
        {
          id: "affichage",
          title: "Langue et affichage",
          keywords: "langue anglais english français page d'ouverture accueil vibration haptique mon appli rubriques disciplines personnalisation objectif niveau taille du texte animations accessibilité",
          node: (
            <>
              <LanguageDisplayCard space="client" />
              <PreferencesCard initialPreferences={memberPreferences} />
              <AccessibilityCard />
            </>
          ),
        },
        {
          id: "entrainement",
          title: "Séance et courses",
          keywords: "repos minuteur chrono son bip vibration séance entraînement courses stock inventaire aliments repas",
          node: <TrainingNutritionCard initialPantryAuto={settings.pantryAuto} />,
        },
        {
          id: "notifications",
          title: "Notifications",
          keywords: "notifications rappels push autorisations heures calmes silence newsletter email pas podomètre caméra micro",
          node: (
            <>
              <PermissionsCard
                pushSubscribed={!!pushSub}
                stepsHref="/dashboard/client/steps"
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
          title: "Claude, Notion et objets",
          keywords: "claude ia intelligence artificielle notion connecteur clé oura bague montre connexion",
          node: (
            <>
              <ClaudeConnect tokens={(tokens ?? []) as { id: string; name: string; created_at: string; last_used_at: string | null }[]} />
              <ConnectionsCard ouraConnected={!!oura} ouraConfigured={isOuraConfigured()} ouraHref="/dashboard/client/tracking" />
            </>
          ),
        },
        {
          id: "confidentialite",
          title: "Confidentialité",
          keywords: "confidentialité visibilité classement communauté données vie privée",
          node: <MemberPrivacyCard initialVisible={notifRow?.leaderboard_visible !== false} />,
        },
        {
          id: "securite",
          title: "Compte et sécurité",
          keywords: "compte email mot de passe déconnexion déconnecter partout appareils sessions supprimer exporter données double authentification 2fa sécurité",
          node: (
            <>
              <AccountActions email={profile.email} signOutRedirect="/auth/client" />
              {/* Optionnelle côté membre : personne n'est forcé, mais l'option existe. */}
              <TwoFactorCard enabled={!!profile.mfa_enabled} mandatory={false} />
            </>
          ),
        },
        {
          id: "appareil",
          title: "Appareil et à propos",
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
