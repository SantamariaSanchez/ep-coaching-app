// Force all dashboard routes to be server-rendered (required for auth middleware + Vercel)
export const dynamic = "force-dynamic";

import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { isEmailVerified } from "@/lib/email-verification";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Résolu côté serveur pour éviter le flash "mauvais onglet actif" au chargement :
  // DashboardNav défaillait un instant sur les onglets/segments du compte payant
  // (isFreeTier=false par défaut) avant que le fetch client ne corrige le tir,
  // ce qui donnait l'impression que la nav "dupliquait" ou redirigeait au hasard.
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;
  const initialIsFreeTier = profile?.role === "client" && !isSubscribed(profile);
  // Bandeau non bloquant tant que l'email n'a pas été confirmé (voir
  // lib/email-verification.ts). Tous les comptes antérieurs sont considérés
  // vérifiés, seules les nouvelles inscriptions le voient.
  const showEmailBanner = !!profile && !isEmailVerified(profile);

  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      <ServiceWorkerRegister />
      <NavigationProgress />
      {showEmailBanner && <EmailVerificationBanner email={profile.email} />}
      <DashboardNav initialIsFreeTier={initialIsFreeTier}>{children}</DashboardNav>
    </div>
  );
}
