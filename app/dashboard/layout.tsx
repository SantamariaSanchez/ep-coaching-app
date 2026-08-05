// Force all dashboard routes to be server-rendered (required for auth middleware + Vercel)
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { createServerSupabase } from "@/lib/supabase-server";
import { isStrongSession } from "@/lib/mfa";

// Double authentification : le mot de passe seul ne donne accès à aucune page
// du dashboard tant que la session n'est pas passée en aal2.
//   - compte ayant activé la 2FA → code à 6 chiffres demandé à la connexion ;
//   - compte fondateur (is_platform_owner) sans 2FA → activation obligatoire,
//     vu que ce compte voit tous les membres de la plateforme.
// Ce contrôle vit ici plutôt que dans proxy.ts : le middleware mutualise ses
// vérifications de session entre requêtes concurrentes, y relire la session
// rouvrirait la course à la rotation du jeton de rafraîchissement.
async function requireStrongSessionIfNeeded(
  profile: { mfa_enabled?: boolean; is_platform_owner?: boolean } | null
) {
  if (!profile) return;
  const hasMfa = profile.mfa_enabled === true;
  const ownerMustEnroll = profile.is_platform_owner === true && !hasMfa;
  if (!hasMfa && !ownerMustEnroll) return;

  // Échec fermé : session illisible pour une raison ou une autre, on redemande
  // le code plutôt que de laisser passer.
  let strong = false;
  if (hasMfa) {
    try {
      const supabase = await createServerSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      strong = isStrongSession(session?.access_token);
    } catch {
      strong = false;
    }
  }
  if (!strong) redirect("/auth/2fa");
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Résolu côté serveur pour éviter le flash "mauvais onglet actif" au chargement :
  // DashboardNav défaillait un instant sur les onglets/segments du compte payant
  // (isFreeTier=false par défaut) avant que le fetch client ne corrige le tir,
  // ce qui donnait l'impression que la nav "dupliquait" ou redirigeait au hasard.
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;

  await requireStrongSessionIfNeeded(profile);

  const initialIsFreeTier = profile?.role === "client" && !isSubscribed(profile);
  // Bandeau non bloquant tant que l'email n'a pas été confirmé (voir
  // lib/email-verification.ts). Tous les comptes antérieurs sont considérés
  // vérifiés, seules les nouvelles inscriptions le voient.
  const showEmailBanner = !!profile && !isEmailVerified(profile);

  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      <ServiceWorkerRegister />
      <NavigationProgress />
      {/* Dans les enfants et non au dessus de DashboardNav : la barre latérale
          desktop est en position fixed et recouvrirait les 220 premiers pixels
          du bandeau. Ici, il hérite du décalage du contenu. */}
      <DashboardNav initialIsFreeTier={initialIsFreeTier}>
        {showEmailBanner && <EmailVerificationBanner email={profile.email} />}
        {children}
      </DashboardNav>
    </div>
  );
}
