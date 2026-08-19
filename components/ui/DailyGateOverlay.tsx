"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon as MoonIcon, UtensilsCrossed, X } from "lucide-react";
import {
  WeightCard,
  SleepCard,
  TrainingCard,
  LifestyleCard,
  NutritionCard,
  type BilanAction,
  type NutritionTotals,
} from "@/components/ui/DailyBilanForm";
import type { DailyLog } from "@/utils/daily-logs";
import { GATE_REFRESH_EVENT } from "@/lib/gate-events";

// Bilan en 2 temps + repas obligatoires (demande explicite, 2026-08-15) :
// tant que lib/daily-gate.ts dit qu'il y a quelque chose à faire, cet
// overlay recouvre TOUTE l'appli (fond flouté, aucune page en dessous
// n'est atteignable) — monté une seule fois dans app/dashboard/layout.tsx,
// partagé entre client et coach (les deux ont leur propre bilan quotidien).
//
// Le statut initial vient du serveur (calculé dans le layout, jamais
// recalculé côté client). Après une sauvegarde réussie dans une des
// cartes, on rappelle /api/gate-status pour savoir si on peut lever le
// verrou ou passer à l'étape suivante (matin -> repas -> soir) — jamais
// de logique "c'est fait" dupliquée ici, toujours revérifiée serveur.

export type GateReason = "morning" | "meal" | "evening";
export interface PendingMeal {
  slot: string;
  label: string;
}

interface GateStatusResponse {
  active: GateReason | null;
  pendingMeal?: PendingMeal;
}

export default function DailyGateOverlay({
  initialActive,
  initialPendingMeal,
  today,
  existing,
  action,
  autoSteps,
  nutritionTotals,
  mealBaseHref,
}: {
  initialActive: GateReason | null;
  initialPendingMeal?: PendingMeal;
  today: string;
  existing: DailyLog | null;
  action: BilanAction;
  autoSteps?: number | null;
  nutritionTotals?: NutritionTotals | null;
  mealBaseHref: string;
}) {
  const [active, setActive] = useState<GateReason | null>(initialActive);
  const [pendingMeal, setPendingMeal] = useState<PendingMeal | null>(initialPendingMeal ?? null);
  const pathname = usePathname();

  // Échappatoire (demande explicite 2026-08-19 : "des fois on n'a pas les
  // data et qu'on veut utiliser l'appli, sinon c'est chiant") : une petite
  // croix pour fermer le verrou ponctuellement sans rien valider côté
  // serveur — contrairement aux cartes de bilan, ça ne marque jamais rien
  // comme fait. Remis à zéro à chaque changement de page ou de raison de
  // blocage, pour que ça reste "je passe outre maintenant", pas "je
  // désactive le bilan" : le verrou revient à la prochaine navigation ou
  // au prochain rechargement tant que les données manquent vraiment.
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(false);
  }, [pathname, active]);

  // CORRIGÉ 2026-08-19 (retour direct : "il faut que le bilan ne revienne
  // pas à chaque action... je veux que le système de cochage marche
  // réellement"). Cause réelle trouvée : chaque micro-action (cocher UN
  // aliment) déclenchait un refresh() qui appliquait TOUJOURS la nouvelle
  // raison de blocage renvoyée par le serveur — y compris une raison
  // DIFFÉRENTE de celle affichée. Si le repas venait tout juste d'être
  // satisfait pendant qu'un bilan du soir était déjà dû, cocher le
  // dernier aliment d'un repas faisait apparaître le bilan du soir
  // PAR-DESSUS la checklist en cours, en pleine action — perçu à raison
  // comme "le cochage ne marche pas", alors que l'insertion elle-même
  // fonctionnait très bien (déjà vérifié à l'Axe W).
  //
  // Règle désormais : une micro-action (refresh "léger") peut UNIQUEMENT
  // lever le verrou actif ou en préciser les détails (ex. le prochain
  // repas), jamais le remplacer par une AUTRE raison de blocage — ce
  // remplacement ("escalade") n'a lieu que sur une vérification
  // volontaire : la sauvegarde explicite d'une carte de bilan (onSaved,
  // l'utilisateur vient justement de valider cette étape) ou la
  // vérification périodique toutes les 30 minutes ci-dessous.
  const refresh = useCallback(async (allowEscalation: boolean) => {
    try {
      const res = await fetch("/api/gate-status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as GateStatusResponse;
      setActive((current) => {
        if (
          allowEscalation ||
          data.active === null ||
          data.active === current ||
          current === null
        ) {
          return data.active;
        }
        // Une autre raison bloquante existe déjà en base, mais on ne
        // l'impose pas suite à une simple micro-action — elle apparaîtra
        // à la prochaine vérification volontaire (30 min, ou sauvegarde
        // d'une carte de bilan).
        return current;
      });
      setPendingMeal(data.pendingMeal ?? null);
    } catch {
      // Échec réseau : on laisse le verrou affiché tel quel plutôt que de le
      // lever sans confirmation du serveur — voir lib/daily-gate.ts pour la
      // règle inverse (le calcul serveur, lui, doit toujours fail-open).
    }
  }, []);
  const refreshSoft = useCallback(() => refresh(false), [refresh]);
  const refreshFull = useCallback(() => refresh(true), [refresh]);

  // BUG CORRIGÉ (2026-08-15, signalé en direct) : le bouton "Aller logger
  // mon repas" renvoie vers la page Nutrition, mais app/dashboard/layout.tsx
  // (le layout partagé) persiste entre navigations côté client sans
  // forcément se re-rendre — ses props (initialActive/initialPendingMeal)
  // ne se rafraîchissent donc pas tout seuls. Revérifie à chaque changement
  // de route pour détecter qu'un repas vient d'être loggué sur une autre
  // page — en mode "léger" (voir refresh ci-dessus) depuis le 2026-08-19,
  // pour ne jamais imposer une NOUVELLE raison de blocage juste parce
  // qu'on a cliqué un lien.
  useEffect(() => {
    refreshSoft();
  }, [pathname, refreshSoft]);

  // BUG CORRIGÉ (2026-08-16, signalé en direct : "je coche les aliments,
  // ça bloque le reste de l'appli, j'suis obligé de tout actualiser") : ce
  // composant ne se revérifiait qu'au changement de route. Or logger un
  // repas se fait sans navigation (on reste sur /nutrition), donc le
  // verrou "repas" ne se levait jamais tant qu'on ne quittait pas la page
  // par un lien. Écoute désormais un événement dédié, déclenché par
  // ClientNutritionView après chaque log de repas réussi (voir
  // lib/gate-events.ts) — en mode "léger" lui aussi (voir plus haut).
  useEffect(() => {
    window.addEventListener(GATE_REFRESH_EVENT, refreshSoft);
    return () => window.removeEventListener(GATE_REFRESH_EVENT, refreshSoft);
  }, [refreshSoft]);

  // Vérification périodique (2026-08-19, demande explicite : "toutes les
  // 30min si jamais pas fait manuellement") : seul moment, avec la
  // sauvegarde d'une carte de bilan, où une NOUVELLE raison de blocage
  // peut apparaître automatiquement.
  useEffect(() => {
    const id = setInterval(refreshFull, 30 * 60 * 1000);
    return () => clearInterval(id);
  }, [refreshFull]);

  if (!active) return null;
  if (active === "meal" && pathname === mealBaseHref) return null;
  if (dismissed) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        padding: "24px 16px",
        overflowY: "auto",
        background: "rgba(13,0,0,0.7)",
        backdropFilter: "blur(16px) saturate(140%)",
        WebkitBackdropFilter: "blur(16px) saturate(140%)",
      }}
    >
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fermer pour l'instant"
        title="Fermer pour l'instant"
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 2001,
          width: 34,
          height: 34,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(245,237,237,0.08)",
          border: "1px solid rgba(245,237,237,0.15)",
          color: "rgba(245,237,237,0.5)",
          cursor: "pointer",
        }}
      >
        <X size={16} />
      </button>
      <div style={{ width: "100%", maxWidth: 480, margin: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {active === "morning" && (
          <>
            <GateHeader
              icon={Sun}
              title="Bilan du matin"
              subtitle="Poids et sommeil d'abord, le reste de l'appli attend que ce soit fait."
            />
            <WeightCard today={today} existing={existing} action={action} onSaved={refreshFull} />
            <SleepCard today={today} existing={existing} action={action} onSaved={refreshFull} />
          </>
        )}

        {active === "meal" && pendingMeal && (
          <>
            <GateHeader
              icon={UtensilsCrossed}
              title="Un repas t'attend"
              subtitle={`C'est passé l'heure du ${pendingMeal.label}, logue-le pour continuer.`}
            />
            <div className="ep-card" style={{ padding: "20px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "rgba(245,237,237,0.6)", margin: "0 0 16px", lineHeight: 1.5 }}>
                {/* Le pré-remplissage depuis le plan alimentaire (avec surlignage
                    automatique du repas concerné) n'existe que côté client — voir
                    ClientNutritionView.tsx. Message volontairement générique pour
                    rester vrai aussi côté coach (CoachMoiNutritionTabs.tsx n'a pas
                    cette UI de plan), qui peut malgré tout logger normalement. */}
                Direction Nutrition pour le logger.
              </p>
              <a
                href={`${mealBaseHref}?meal=${pendingMeal.slot}`}
                className="ep-btn-primary"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%", textDecoration: "none" }}
              >
                Aller logger mon repas
              </a>
            </div>
          </>
        )}

        {active === "evening" && (
          <>
            <GateHeader
              icon={MoonIcon}
              title="Bilan du soir"
              subtitle="C'est l'heure de faire le point avant de dormir."
            />
            <TrainingCard today={today} existing={existing} action={action} onSaved={refreshFull} />
            <LifestyleCard today={today} existing={existing} action={action} autoSteps={autoSteps} onSaved={refreshFull} />
            <NutritionCard today={today} existing={existing} action={action} nutritionTotals={nutritionTotals} onSaved={refreshFull} />
          </>
        )}
      </div>
    </div>
  );
}

function GateHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 4 }}>
      <div
        style={{
          width: 52, height: 52, borderRadius: 16, margin: "0 auto 14px",
          background: "linear-gradient(135deg, rgba(224,30,30,0.22), rgba(137,4,4,0.12))",
          border: "1px solid rgba(224,30,30,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon size={22} style={{ color: "#E01E1E" }} strokeWidth={1.8} />
      </div>
      <h2 className="ep-h2" style={{ margin: "0 0 6px" }}>{title}</h2>
      <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
    </div>
  );
}
