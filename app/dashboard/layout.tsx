// Force all dashboard routes to be server-rendered (required for auth middleware + Vercel)
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import AlarmPlayer from "@/components/ui/AlarmPlayer";
import PermissionsPrimer from "@/components/ui/PermissionsPrimer";
import FreeTierGate from "@/components/ui/FreeTierGate";
import FreeTierBanner from "@/components/ui/FreeTierBanner";
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner";
import TwoFactorNudgeBanner from "@/components/ui/TwoFactorNudgeBanner";
import DailyGateOverlay from "@/components/ui/DailyGateOverlay";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { createServerSupabase } from "@/lib/supabase-server";
import { isStrongSession } from "@/lib/mfa";
import { getDailyGateStatus } from "@/lib/daily-gate";
import { freeTierStatus, freeTierUrgencyLabel } from "@/lib/free-tier";
import { getAccessType } from "@/utils/auth-client";

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

// Perf (repasse masterclass 2026-09-10, retour direct : "le chargement au
// logo est trop long, changer d'onglet prend 3s") : ce composant fait son
// propre aller-retour Supabase (getDailyGateStatus, qui en enchaîne
// lui-même jusqu'à 3 en série dans le pire cas — voir lib/daily-gate.ts)
// et est rendu dans une <Suspense> dédiée plus bas. Avant cette passe,
// cet appel était awaited AU NIVEAU DU LAYOUT LUI-MÊME (Promise.all avec
// requireStrongSessionIfNeeded) : comme DashboardLayout est une async
// function qui n'avait encore rien retourné à ce stade, TOUTE la réponse
// HTTP — y compris {children}, donc la vraie page demandée — restait
// bloquée derrière cette chaîne de requêtes, sur CHAQUE navigation, alors
// que la carte de rappel elle-même est déjà non bloquante côté UX (voir
// DailyGateOverlay.tsx, "carte de rappel compacte, non bloquante"). La
// isoler dans sa propre Suspense laisse le layout retourner dès que
// user/profile sont connus, donc {children} peut commencer à streamer
// immédiatement : la carte de rappel, elle, apparaît quelques centaines de
// ms plus tard sans rien bloquer, exactement comme son propre design le
// prévoyait déjà.
async function DailyGateLoader({
  userId,
  isCoach,
}: {
  userId: string;
  isCoach: boolean;
}) {
  const gate = await getDailyGateStatus(userId);
  return (
    <DailyGateOverlay
      initialActive={gate.active}
      initialPendingMeal={gate.pendingMeal}
      mealBaseHref={isCoach ? "/dashboard/coach/moi/nutrition" : "/dashboard/client/nutrition"}
      bilanHref={isCoach ? "/dashboard/coach/moi/bilan" : "/dashboard/client/bilan"}
    />
  );
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Résolu côté serveur pour éviter le flash "mauvais onglet actif" au chargement :
  // DashboardNav défaillait un instant sur les onglets/segments du compte payant
  // (isFreeTier=false par défaut) avant que le fetch client ne corrige le tir,
  // ce qui donnait l'impression que la nav "dupliquait" ou redirigeait au hasard.
  const user = await getUser();
  const profile = user ? await getProfile(user.id) : null;

  // Garde de sécurité dure (redirige si besoin) : doit rester bloquante,
  // mais ne coûte rien pour l'immense majorité des comptes (sans MFA
  // active, retourne immédiatement sans aucun aller-retour réseau — voir
  // la fonction plus haut).
  await requireStrongSessionIfNeeded(profile);

  const initialIsFreeTier = profile?.role === "client" && !isSubscribed(profile);

  // Verrou du compte gratuit à 60 jours (voir lib/free-tier.ts). Calculé côté
  // serveur à chaque rendu du layout : dès que subscription_status repasse à
  // "active", ce calcul redevient neutre au prochain chargement, sans action
  // manuelle ni cron à attendre pour débloquer quelqu'un qui vient de payer.
  const tierStatus = freeTierStatus(profile, getAccessType(profile));
  const urgencyLabel = freeTierUrgencyLabel(tierStatus);
  // Bandeau non bloquant tant que l'email n'a pas été confirmé (voir
  // lib/email-verification.ts). Tous les comptes antérieurs sont considérés
  // vérifiés, seules les nouvelles inscriptions le voient.
  const showEmailBanner = !!profile && !isEmailVerified(profile);
  const isCoach = profile?.role === "coach";
  // Suspense fallback={null} : rien ne s'affiche tant que le calcul n'est
  // pas prêt (la carte n'apparaissait déjà qu'après coup dans l'ancien
  // comportement bloquant, ce n'est donc pas une régression visuelle,
  // seulement un déblocage du reste de la page pendant ce temps-là).
  const gateOverlay: React.ReactNode =
    user && profile ? (
      <Suspense fallback={null}>
        <DailyGateLoader userId={user.id} isCoach={isCoach} />
      </Suspense>
    ) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      <ServiceWorkerRegister />
      <AlarmPlayer />
      {/* Demande les vraies autorisations systeme au premier lancement : sans
          appel effectif aux API du navigateur, le telephone n'affiche aucune
          autorisation pour l'appli (voir PermissionsPrimer). */}
      <PermissionsPrimer />
      <NavigationProgress />
      {/* Verrou dur : rien d'autre ne doit rester utilisable en dessous tant
          que le compte gratuit est verrouillé (voir lib/free-tier.ts). */}
      {tierStatus.locked && <FreeTierGate />}
      {gateOverlay}
      {/* Dans les enfants et non au dessus de DashboardNav : la barre latérale
          desktop est en position fixed et recouvrirait les 220 premiers pixels
          du bandeau. Ici, il hérite du décalage du contenu. */}
      <DashboardNav initialIsFreeTier={initialIsFreeTier}>
        {/* Compte à rebours doux avant le verrou dur ci-dessus (21 puis 7
            jours restants). Jamais affiché en même temps que le verrou :
            urgencyLabel devient null dès que locked est vrai. */}
        {!tierStatus.locked && urgencyLabel && <FreeTierBanner label={urgencyLabel} />}
        {showEmailBanner && <EmailVerificationBanner email={profile.email} />}
        {/* Item 47 : pousse sans forcer, voir requireStrongSessionIfNeeded
            ci-dessus pour pourquoi le blocage dur reste désactivé. */}
        {!!profile?.is_platform_owner && !profile.mfa_enabled && <TwoFactorNudgeBanner />}
        {children}
      </DashboardNav>
    </div>
  );
}
