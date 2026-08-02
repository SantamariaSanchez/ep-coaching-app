import { CreditCard } from "lucide-react";
import type { CoachBillingInfo } from "@/lib/coach-billing";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trialing: { label: "Essai gratuit", color: "#facc15" },
  active: { label: "Actif", color: "#4ade80" },
  past_due: { label: "Paiement en retard", color: "#E01E1E" },
  unpaid: { label: "Impayé", color: "#E01E1E" },
  canceled: { label: "Annulé", color: "rgba(245,237,237,0.4)" },
  incomplete: { label: "Incomplet", color: "rgba(245,237,237,0.4)" },
  erreur: { label: "Erreur Stripe", color: "#E01E1E" },
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
  const statusInfo = billing?.status ? STATUS_LABELS[billing.status] : null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <CreditCard size={14} className="text-[#E01E1E]" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-white">Mon abonnement plateforme</p>
      </div>

      {!billing || !statusInfo ? (
        <p className="text-[11.5px] text-[#F5EDED]/40 leading-relaxed">
          Pas encore de paiement enregistré. Ton essai gratuit de 2 mois est en cours ou n&apos;a pas encore démarré.
        </p>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            style={{
              fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em",
              color: statusInfo.color, border: `1px solid ${statusInfo.color}55`, borderRadius: 999, padding: "2px 8px",
            }}
          >
            {statusInfo.label}
          </span>
          {billing.amount != null && (
            <span className="text-xs text-[#F5EDED]/55">
              {billing.amount}€ / {billing.intervalMonths === 1 ? "mois" : `${billing.intervalMonths} mois`}
            </span>
          )}
          {billing.status === "trialing" && billing.trialEnd && (
            <span className="text-[11px] text-[#F5EDED]/40">Essai jusqu&apos;au {formatDate(billing.trialEnd)}</span>
          )}
          {billing.status === "active" && billing.currentPeriodEnd && (
            <span className="text-[11px] text-[#F5EDED]/40">Prochain prélèvement le {formatDate(billing.currentPeriodEnd)}</span>
          )}
        </div>
      )}
    </div>
  );
}
