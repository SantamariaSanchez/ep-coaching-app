"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon as MoonIcon, UtensilsCrossed } from "lucide-react";
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

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/gate-status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as GateStatusResponse;
      setActive(data.active);
      setPendingMeal(data.pendingMeal ?? null);
    } catch {
      // Échec réseau : on laisse le verrou affiché tel quel plutôt que de le
      // lever sans confirmation du serveur — voir lib/daily-gate.ts pour la
      // règle inverse (le calcul serveur, lui, doit toujours fail-open).
    }
  }, []);

  // BUG CORRIGÉ (2026-08-15, signalé en direct) : le bouton "Aller logger
  // mon repas" renvoie vers la page Nutrition, mais app/dashboard/layout.tsx
  // (le layout partagé) persiste entre navigations côté client sans
  // forcément se re-rendre — ses props (initialActive/initialPendingMeal)
  // ne se rafraîchissent donc pas tout seuls. Deux correctifs :
  //   1. Revérifier le statut à CHAQUE changement de route, pas seulement
  //      après une sauvegarde dans une carte du bilan (matin/soir), pour
  //      détecter qu'un repas vient d'être loggué sur une autre page.
  //   2. Ne jamais afficher le verrou "repas" par-dessus la page Nutrition
  //      elle-même — sinon il recouvre la page censée permettre de le
  //      lever, et personne ne peut plus jamais l'atteindre.
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  if (!active) return null;
  if (active === "meal" && pathname === mealBaseHref) return null;

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
      <div style={{ width: "100%", maxWidth: 480, margin: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        {active === "morning" && (
          <>
            <GateHeader
              icon={Sun}
              title="Bilan du matin"
              subtitle="Poids et sommeil d'abord, le reste de l'appli attend que ce soit fait."
            />
            <WeightCard today={today} existing={existing} action={action} onSaved={refresh} />
            <SleepCard today={today} existing={existing} action={action} onSaved={refresh} />
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
            <TrainingCard today={today} existing={existing} action={action} onSaved={refresh} />
            <LifestyleCard today={today} existing={existing} action={action} autoSteps={autoSteps} onSaved={refresh} />
            <NutritionCard today={today} existing={existing} action={action} nutritionTotals={nutritionTotals} onSaved={refresh} />
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
