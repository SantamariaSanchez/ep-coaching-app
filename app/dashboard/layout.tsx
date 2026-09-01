// Force all dashboard routes to be server-rendered (required for auth middleware + Vercel)
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import AlarmPlayer from "@/components/ui/AlarmPlayer";
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner";
import TwoFactorNudgeBanner from "@/components/ui/TwoFactorNudgeBanner";
import DailyGateOverlay from "@/components/ui/DailyGateOverlay";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { createServerSupabase } from "@/lib/supabase-server";
import { isStrongSession } from "@/lib/mfa";
import { getDailyGateStatus } from "@/lib/daily-gate";
import { todayInParis } from "@/lib/dates";

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

  // L'obligation d'ENROLEMENT pour le fondateur sans 2FA reste desactivee
  // (incident du 2026-08-05, ou elle a verrouille l'acces au dashboard).
  //
  // Ce qui a ete corrige depuis, et verifie en production :
  //   * enroll / challenge / verify cote Supabase fonctionnent de bout en bout ;
  //   * le trigger qui remonte profiles.mfa_enabled fonctionne ;
  //   * le QR code passe par un Blob et non plus par une URL data: de 350 Ko
  //     non encodee, qui figeait l'affichage (voir TwoFactorSetup) ;
  //   * l'ecran ne peut plus rester bloque sans message (try/catch) ;
  //   * /auth/2fa choisit son mode d'apres les facteurs reels, plus d'apres la
  //     colonne miroir, donc une desynchronisation ne peut plus pieger personne ;
  //   * la boucle de redirection elle meme est morte : `strong` est desormais
  //     toujours calcule, alors qu'il restait faux dans la branche enrolement,
  //     ce qui renvoyait vers /auth/2fa meme avec une session aal2 valide.
  //
  // Elle reste neanmoins desactivee tant que le fondateur n'a pas active sa 2FA
  // au moins une fois depuis /dashboard/coach/parametres : reactiver un blocage
  // dur sur le seul compte qui administre la plateforme, sans avoir pu rejouer
  // le scenario exact dans un vrai navigateur, ferait courir le meme risque de
  // verrouillage qu'aujourd'hui pour un gain faible. Une fois la 2FA active,
  // mfa_enabled passe a true et le challenge ci dessous s'applique de toute
  // facon a chaque connexion, ainsi qu'a chaque action serveur
  // (voir lib/auth-guards.ts) : l'obligation d'enrolement ne sert alors plus.
  // Pour la retablir : remplacer la ligne ci dessous par
  //   const ownerMustEnroll = profile.is_platform_owner === true && !hasMfa;
  //   if (!hasMfa && !ownerMustEnroll) return;
  if (!hasMfa) return;

  // Échec fermé : session illisible pour une raison ou une autre, on redemande
  // le code plutôt que de laisser passer.
  let strong = false;
  try {
    const supabase = await createServerSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    strong = isStrongSession(session?.access_token);
  } catch {
    strong = false;
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

  // Perf (retour direct 2026-09-01, "j'ouvre l'appli c'est censé être
  // instantané au lieu de ça il y a un chargement de 10s") : ces deux appels
  // ne dépendent que de user/profile déjà résolus, pas l'un de l'autre —
  // ils tournaient avant en série (deux allers-retours Supabase de plus,
  // à chaque ouverture ET chaque rendu serveur de ce layout). En parallèle
  // ici économise un aller-retour complet sans rien changer au résultat :
  // requireStrongSessionIfNeeded ne fait que rediriger (throw) si besoin,
  // Promise.all propage ce throw normalement.
  const [, gate] = await Promise.all([
    requireStrongSessionIfNeeded(profile),
    // Rappel de bilan (demande explicite 2026-08-15, refondu 2026-08-19 —
    // voir lib/daily-gate.ts et components/ui/DailyGateOverlay.tsx pour
    // l'historique complet). Calculé pour TOUT compte connecté, client ou
    // coach (chacun a son propre bilan quotidien, via client_id = son propre
    // id dans les deux cas) — coût minimal, un seul appel à
    // getDailyGateStatus, plus aucune donnée lourde à charger ici : la carte
    // de rappel ne fait plus que renvoyer vers le bilan complet
    // (/dashboard/client/bilan ou /dashboard/coach/moi/bilan), elle
    // n'affiche plus les cartes elles-mêmes.
    user && profile ? getDailyGateStatus(user.id) : Promise.resolve({ active: null, pendingMeal: undefined }),
  ]);

  const initialIsFreeTier = profile?.role === "client" && !isSubscribed(profile);
  // Bandeau non bloquant tant que l'email n'a pas été confirmé (voir
  // lib/email-verification.ts). Tous les comptes antérieurs sont considérés
  // vérifiés, seules les nouvelles inscriptions le voient.
  const showEmailBanner = !!profile && !isEmailVerified(profile);
  const isCoach = profile?.role === "coach";
  const gateOverlay: React.ReactNode =
    user && profile ? (
      <DailyGateOverlay
        initialActive={gate.active}
        initialPendingMeal={gate.pendingMeal}
        today={todayInParis()}
        mealBaseHref={isCoach ? "/dashboard/coach/moi/nutrition" : "/dashboard/client/nutrition"}
        bilanHref={isCoach ? "/dashboard/coach/moi/bilan" : "/dashboard/client/bilan"}
      />
    ) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      <ServiceWorkerRegister />
      <AlarmPlayer />
      <NavigationProgress />
      {gateOverlay}
      {/* Dans les enfants et non au dessus de DashboardNav : la barre latérale
          desktop est en position fixed et recouvrirait les 220 premiers pixels
          du bandeau. Ici, il hérite du décalage du contenu. */}
      <DashboardNav initialIsFreeTier={initialIsFreeTier}>
        {showEmailBanner && <EmailVerificationBanner email={profile.email} />}
        {/* Item 47 : pousse sans forcer, voir requireStrongSessionIfNeeded
            ci-dessus pour pourquoi le blocage dur reste désactivé. */}
        {!!profile?.is_platform_owner && !profile.mfa_enabled && <TwoFactorNudgeBanner />}
        {children}
      </DashboardNav>
    </div>
  );
}
