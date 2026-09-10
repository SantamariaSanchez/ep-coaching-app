import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import AccountActions from "@/components/profile/AccountActions";
import PermissionsCard from "@/components/settings/PermissionsCard";
import NotificationPreferencesCard from "@/components/settings/NotificationPreferencesCard";
import NewsletterPreferenceCard from "@/components/settings/NewsletterPreferenceCard";
import LegalLinksCard from "@/components/settings/LegalLinksCard";
import TwoFactorCard from "@/components/settings/TwoFactorCard";
import { MUTABLE_CATEGORIES, type NotificationCategory, type NotificationPreferences } from "@/lib/notification-preferences";
import { getNewsletterSubscriptionStatus } from "@/app/actions/newsletter";

export default async function ClientParametresPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile) redirect("/");
  if (profile.role === "coach") redirect("/dashboard/coach/parametres");

  const supabase = await createServerSupabase();
  const [{ data: pushSub }, { data: notifRow }, newsletterSubscribed] = await Promise.all([
    supabase
      .from("push_subscriptions")
      .select("id, quiet_hours_start, quiet_hours_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    // Colonne consultée uniquement ici, pas dans PROFILE_FIELDS (même
    // convention que accepting_new_clients côté coach) : lecture ciblée
    // plutôt que d'alourdir getProfile() utilisé partout dans l'appli.
    supabase.from("profiles").select("notification_preferences").eq("id", user.id).maybeSingle(),
    getNewsletterSubscriptionStatus(),
  ]);
  const notifPrefs = (notifRow?.notification_preferences as NotificationPreferences | null) ?? {};
  const mutedCategories = MUTABLE_CATEGORIES.filter((c) => notifPrefs[c] === true) as NotificationCategory[];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Paramètres</h1>
      </div>

      <PermissionsCard
        pushSubscribed={!!pushSub}
        stepsHref="/dashboard/client/steps"
        quietHoursStart={pushSub?.quiet_hours_start ?? null}
        quietHoursEnd={pushSub?.quiet_hours_end ?? null}
      />

      <NotificationPreferencesCard initialMuted={mutedCategories} />

      <NewsletterPreferenceCard initialSubscribed={newsletterSubscribed} />

      <AccountActions email={profile.email} signOutRedirect="/auth/client" />

      {/* Optionnelle côté membre : personne n'est forcé, mais l'option existe. */}
      <TwoFactorCard enabled={!!profile.mfa_enabled} mandatory={false} />

      <div className="mt-4">
        <LegalLinksCard />
      </div>
    </div>
  );
}
