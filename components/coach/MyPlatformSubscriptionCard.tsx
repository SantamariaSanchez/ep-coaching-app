"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { CreditCard } from "lucide-react";
import type { CoachBillingInfo } from "@/lib/coach-billing";
import { withAlpha } from "@/lib/theme-color";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: "Essai gratuit", color: "var(--ep-yellow)" },
  active: { label: "Actif", color: "var(--ep-ok)" },
  past_due: { label: "Paiement en retard", color: "var(--ep-accent)" },
  unpaid: { label: "Impayé", color: "var(--ep-accent)" },
  canceled: { label: "Annulé", color: "rgba(var(--ep-ink-rgb),0.4)" },
  incomplete: { label: "Incomplet", color: "rgba(var(--ep-ink-rgb),0.4)" },
  erreur: { label: "Erreur Stripe", color: "var(--ep-accent)" },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

// Un coach tiers ne pouvait jusqu'ici jamais voir l'état réel de son propre
// abonnement plateforme (réservé à la page admin du fondateur) — carte de
// lecture seule, aucune action de gestion ici (résiliation = via Stripe
// directement ou demande au fondateur).
export default function MyPlatformSubscriptionCard({ billing }: { billing: CoachBillingInfo | null }) {
  const t = useT();
  const statusInfo = billing?.status ? STATUS_LABELS[billing.status] : null;

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl px-4 py-3.5 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard size={14} className="text-(--ep-accent)" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-strong)">{t("Mon abonnement plateforme")}</p>
      </div>

      {!billing || !statusInfo ? (
        <p className="text-[11.5px] text-(--ep-ink)/40 leading-relaxed">
          {t("Pas encore de paiement enregistré.")}
        </p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
              color: statusInfo.color, border: `1px solid ${withAlpha(statusInfo.color, "55")}`, borderRadius: 999, padding: "2px 8px",
            }}
          >
            {t(statusInfo.label)}
          </span>
          {billing.amount != null && (
            <span className="text-xs text-(--ep-ink)/55">
              {billing.amount}€ / {billing.intervalMonths === 1 ? t("mois") : `${billing.intervalMonths} mois`}
            </span>
          )}
          {billing.status === "trialing" && billing.trialEnd && (
            <span className="text-[11px] text-(--ep-ink)/40">{t("Essai jusqu'au")}{" "}{formatDate(billing.trialEnd)}</span>
          )}
          {billing.status === "active" && billing.currentPeriodEnd && (
            <span className="text-[11px] text-(--ep-ink)/40">{t("Prochain prélèvement le")}{" "}{formatDate(billing.currentPeriodEnd)}</span>
          )}
        </div>
      )}
    </div>
  );
}
