// Force all dashboard routes to be server-rendered (required for auth middleware + Vercel)
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import DashboardNav from "@/components/ui/DashboardNav";
import { NavigationProgress } from "@/components/ui/NavigationProgress";
import ServiceWorkerRegister from "@/components/ui/ServiceWorkerRegister";
import EmailVerificationBanner from "@/components/ui/EmailVerificationBanner";
import TwoFactorNudgeBanner from "@/components/ui/TwoFactorNudgeBanner";
import DailyGateOverlay from "@/components/ui/DailyGateOverlay";
import type { NutritionTotals } from "@/components/ui/DailyBilanForm";
import type { DailyLog } from "@/utils/daily-logs";
import { getUser, getProfile, isSubscribed } from "@/utils/auth";
import { isEmailVerified } from "@/lib/email-verification";
import { createServerSupabase } from "@/lib/supabase-server";
import { isStrongSession } from "@/lib/mfa";
import { getDailyGateStatus } from "@/lib/daily-gate";
import { getTodayLog } from "@/utils/daily-logs";
import { getTodayLogs } from "@/utils/nutrition";
import { getTodayStepsActual } from "@/utils/steps";
import { todayInParis } from "@/lib/dates";
import { upsertDailyLog } from "@/app/dashboard/client/bilan/actions";
import { upsertCoachDailyLog } from "@/app/dashboard/coach/moi/bilan/actions";

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

  await requireStrongSessionIfNeeded(profile);

  const initialIsFreeTier = profile?.role === "client" && !isSubscribed(profile);
  // Bandeau non bloquant tant que l'email n'a pas été confirmé (voir
  // lib/email-verification.ts). Tous les comptes antérieurs sont considérés
  // vérifiés, seules les nouvelles inscriptions le voient.
  const showEmailBanner = !!profile && !isEmailVerified(profile);

  // Bilan en 2 temps + repas obligatoires (demande explicite, 2026-08-15,
  // voir lib/daily-gate.ts) : calculé pour TOUT compte connecté, client ou
  // coach (chacun a son propre bilan quotidien, via client_id = son propre
  // id dans les deux cas). Les données lourdes (bilan du jour, repas
  // loggués, pas auto) ne sont chargées que si un verrou est effectivement
  // actif — la grande majorité des chargements de page ne paient que le
  // coût de getDailyGateStatus lui-même.
  //
  // CORRIGÉ 2026-08-19 (retour direct, APRÈS l'Axe AB : "ya encore le bilan
  // qui revient à chaque action"). Le vrai fond du problème n'était pas
  // encore traité : <DailyGateOverlay> n'était rendu dans l'arbre que
  // lorsque gate.active était vrai (gateOverlay = null sinon). Or ce layout
  // est en dynamic = "force-dynamic", et la quasi-totalité des Server
  // Actions de l'appli appellent revalidatePath() — ce qui fait réexécuter
  // ce fichier côté serveur après CHAQUE action, pas seulement les actions
  // nutrition. À chaque fois que gate.active repassait par null (même un
  // aller-retour d'un seul re-rendu, par exemple juste après avoir loggué
  // le dernier aliment d'un repas, avant que la prochaine raison de
  // blocage éventuelle ne soit connue), <DailyGateOverlay> disparaissait de
  // l'arbre puis un TOUT NOUVEAU composant était monté au rendu suivant dès
  // que gate.active redevenait vrai — perdant tout son état interne
  // (dismissed, et surtout `active` lui-même, voir le composant) et
  // redémarrant sur le initialActive fraîchement recalculé côté serveur.
  // Perçu à raison comme "le bilan revient", pour une action qui n'avait
  // souvent rien à voir avec lui.
  //
  // Le composant reste maintenant TOUJOURS monté une fois la session
  // ouverte (jamais démonté/remonté par un simple aller-retour serveur) —
  // seul le calcul des données lourdes reste conditionné à gate.active
  // pour préserver l'optimisation de coût. Une fois monté, c'est le
  // composant lui-même qui décide seul quand revérifier (refreshSoft/
  // refreshFull) ; le serveur ne fournit plus qu'une valeur de départ.
  const gate =
    user && profile ? await getDailyGateStatus(user.id) : { active: null, pendingMeal: undefined };
  let existing: DailyLog | null = null;
  let nutritionTotals: NutritionTotals | null = null;
  let autoSteps: number | null = null;
  if (user && profile && gate.active) {
    const [existingRes, todayFoodLogs, autoStepsRes] = await Promise.all([
      getTodayLog(user.id),
      getTodayLogs(user.id, todayInParis()),
      getTodayStepsActual(user.id),
    ]);
    existing = existingRes;
    autoSteps = autoStepsRes;
    nutritionTotals =
      todayFoodLogs.length > 0
        ? todayFoodLogs.reduce(
            (acc, l) => ({
              calories: acc.calories + (l.calories ?? 0),
              proteins: acc.proteins + (l.proteins ?? 0),
              carbs: acc.carbs + (l.carbs ?? 0),
              fats: acc.fats + (l.fats ?? 0),
            }),
            { calories: 0, proteins: 0, carbs: 0, fats: 0 }
          )
        : null;
  }
  const isCoach = profile?.role === "coach";
  const gateOverlay: React.ReactNode =
    user && profile ? (
      <DailyGateOverlay
        initialActive={gate.active}
        initialPendingMeal={gate.pendingMeal}
        today={todayInParis()}
        existing={existing}
        action={isCoach ? upsertCoachDailyLog : upsertDailyLog}
        autoSteps={autoSteps}
        nutritionTotals={nutritionTotals}
        mealBaseHref={isCoach ? "/dashboard/coach/moi/nutrition" : "/dashboard/client/nutrition"}
      />
    ) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0D0000" }}>
      <ServiceWorkerRegister />
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
