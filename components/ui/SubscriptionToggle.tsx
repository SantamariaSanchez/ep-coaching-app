"use client";

import { useEffect, useState, useTransition } from "react";
import { Crown, CheckCircle2, ChevronDown, ChevronUp, History } from "lucide-react";
import { setClientSubscriptionStatus, getSubscriptionHistory, startCoachingTrial } from "@/app/dashboard/coach/clients/actions";
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans";

interface HistoryEntry {
  id: string;
  status: string;
  plan: string | null;
  next_billing_date: string | null;
  note: string | null;
  created_at: string;
}

function planLabel(planId: string | null): string {
  if (!planId) return "Plan non renseigné";
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId)?.label ?? planId;
}

export default function SubscriptionToggle({
  clientId,
  currentStatus,
  currentPlan,
  currentNextBillingDate,
}: {
  clientId: string;
  currentStatus: "free" | "active" | "canceled";
  currentPlan?: string | null;
  currentNextBillingDate?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [plan, setPlan] = useState(currentPlan ?? "");
  const [nextBillingDate, setNextBillingDate] = useState(currentNextBillingDate ?? "");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  // État local plutôt que router.refresh() après chaque bascule : la fiche
  // client charge ~20 sources de données en parallèle sur la page parente,
  // un refresh() les relance toutes juste pour ce simple toggle — visible
  // et lent. Le serveur reste la source de vérité (revalidatePath rafraîchit
  // les autres écrans qui dépendent de ce statut), mais cet écran-ci n'a
  // pas besoin d'attendre un aller-retour complet pour se mettre à jour.
  const [status, setStatus] = useState(currentStatus);
  const [displayPlan, setDisplayPlan] = useState(currentPlan ?? null);
  const [displayBillingDate, setDisplayBillingDate] = useState(currentNextBillingDate ?? null);
  // MASTERCLASS.md Axe E : le commentaire ci-dessus explique pourquoi ce
  // composant n'attend pas de refresh après SA PROPRE bascule (évite de
  // relancer les ~20 sources de la page parente) — mais si un refresh a
  // quand même lieu pour une autre raison (une autre section de la page),
  // ces 3 valeurs doivent rester justes plutôt que rester figées sur le
  // premier rendu.
  useEffect(() => {
    setStatus(currentStatus);
    setDisplayPlan(currentPlan ?? null);
    setDisplayBillingDate(currentNextBillingDate ?? null);
  }, [currentStatus, currentPlan, currentNextBillingDate]);
  // Item 43 : essai coaching limité dans le temps, en plus de l'activation
  // classique ci-dessous.
  const [trialPending, setTrialPending] = useState(false);
  const [trialStarted, setTrialStarted] = useState(false);

  const isActive = status === "active";

  function startTrial(days: number) {
    setError(null);
    setTrialPending(true);
    startTransition(async () => {
      const result = await startCoachingTrial(clientId, days);
      setTrialPending(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus("active");
      setTrialStarted(true);
      setHistory(null);
    });
  }

  useEffect(() => {
    if (expanded && history === null) {
      getSubscriptionHistory(clientId).then(setHistory);
    }
  }, [expanded, history, clientId]);

  function toggle() {
    setError(null);
    const nextStatus = isActive ? "free" : "active";
    startTransition(async () => {
      const result = await setClientSubscriptionStatus(clientId, nextStatus, {
        plan: plan || null,
        nextBillingDate: nextBillingDate || null,
        note: note || null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setStatus(nextStatus);
      setDisplayPlan(plan || null);
      setDisplayBillingDate(nextBillingDate || null);
      setNote("");
      setHistory(null);
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-3">
        {isActive ? (
          <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
        ) : (
          <Crown size={18} className="text-[#E01E1E] flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">
            {isActive ? "Client coaché (payant)" : "Membre gratuit"}
          </p>
          <p className="text-[11px] text-[#F5EDED]/40">
            {isActive
              ? `${planLabel(displayPlan)}${displayBillingDate ? ` · échéance le ${new Date(displayBillingDate).toLocaleDateString("fr-FR")}` : ""}`
              : "Autonome, accès aux outils gratuits uniquement."}
          </p>
          {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-shrink-0 text-[#F5EDED]/30 hover:text-[#F5EDED]/60"
          aria-label="Détails"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3.5 pt-3.5 border-t border-[#890404]/15 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                Plan
              </label>
              <select aria-label="Plan"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full bg-black/30 border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E01E1E]/50"
              >
                <option value="">Non renseigné</option>
                {SUBSCRIPTION_PLANS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({p.priceLabel})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
                Prochaine échéance
              </label>
              <input aria-label="Prochaine échéance"
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                className="w-full bg-black/30 border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#E01E1E]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
              Note (visible dans l&apos;historique)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: paiement reçu par virement le..." aria-label="Ex: paiement reçu par virement le..."
              className="w-full bg-black/30 border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
            />
          </div>

          <button
            onClick={toggle}
            disabled={isPending}
            className={`w-full text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50 ${
              isActive
                ? "border border-[#890404]/40 text-[#F5EDED]/60 hover:text-white"
                : "bg-[#E01E1E] hover:bg-[#B00202] text-white"
            }`}
          >
            {isPending ? "..." : isActive ? "Repasser gratuit" : "Activer le coaching"}
          </button>

          {/* Item 43 : alternative à l'activation définitive ci-dessus —
              accès complet, mais qui repasse en gratuit tout seul à
              l'échéance (cron expire-trials). */}
          {!isActive && !trialStarted && (
            <div className="flex gap-2">
              {[7, 14].map((days) => (
                <button
                  key={days}
                  onClick={() => startTrial(days)}
                  disabled={trialPending || isPending}
                  className="flex-1 border border-[#890404]/40 text-[#F5EDED]/60 hover:text-white text-[10.5px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {trialPending ? "..." : `Essai ${days}j`}
                </button>
              ))}
            </div>
          )}
          {trialStarted && (
            <p className="text-[10.5px] text-green-400 font-semibold text-center">✓ Essai gratuit démarré</p>
          )}

          {history && history.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[#F5EDED]/30 flex items-center gap-1 mb-2">
                <History size={10} />
                Historique
              </p>
              <div className="space-y-1.5">
                {history.map((h) => (
                  <div key={h.id} className="text-[10.5px] text-[#F5EDED]/45 flex items-start gap-2">
                    <span className="text-[#F5EDED]/25 flex-shrink-0">
                      {new Date(h.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <span>
                      {h.status === "active" ? "Activé" : h.status === "canceled" ? "Résilié" : "Repassé gratuit"}
                      {h.plan ? ` · ${planLabel(h.plan)}` : ""}
                      {h.note ? ` · ${h.note}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
