"use client";

import { useState, useTransition } from "react";
import { RefreshCw, AlertTriangle, TrendingDown } from "lucide-react";
import { refreshMailingStatsAction } from "@/app/dashboard/coach/mailing/actions";
import type { CampaignStats } from "@/lib/coach-mailings";

// Suivi de performance mailing (2026-09-16, retour direct : "travaille
// encore plus sur le mailing et derrière le tracking des données : taux
// d'ouverture, de clic etc"). Lecture à la demande de l'API Brevo (bouton
// "Rafraîchir"), jamais automatique au chargement de la page — les stats
// Brevo ne sont pas temps réel juste après l'envoi, et ça éviterait de
// consommer le quota d'appels API pour rien à chaque visite de la page
// (voir lib/brevo-stats.ts).
//
// Seuils de couleur : un taux d'ouverture email correct tourne autour de
// 20 à 30%, un bon taux de clic autour de 2 à 5% (ordres de grandeur email
// marketing généralistes, pas propres à EP Coaching — affiché en clair
// sous les chiffres pour donner un repère à un coach qui n'en a pas).
export function rateColor(rate: number, thresholds: [number, number]): string {
  if (rate >= thresholds[1]) return "#4ade80"; // vert : bon
  if (rate >= thresholds[0]) return "#fbbf24"; // orange : moyen
  return "#f87171"; // rouge : faible
}

export function pct(rate: number): string {
  return `${Math.round(rate * 1000) / 10}%`;
}

const OPEN_RATE_THRESHOLDS: [number, number] = [0.1, 0.2];
const CLICK_RATE_THRESHOLDS: [number, number] = [0.01, 0.02];

export default function MailingStatsCard({
  mailingId,
  brevoCampaignId,
  stats,
  fetchedAt,
  lowOpenRateWarning,
  onRefreshed,
}: {
  mailingId: string;
  brevoCampaignId: number | null;
  stats: CampaignStats | null;
  fetchedAt: string | null;
  lowOpenRateWarning: boolean;
  onRefreshed: (stats: CampaignStats, fetchedAt: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Envoi 1-1 transactionnel (sendSingleMailing) : jamais de campagne
  // Brevo créée, donc jamais de statistiques possibles. Rien à afficher
  // plutôt qu'un bouton qui échouerait à chaque clic.
  if (!brevoCampaignId) return null;

  function refresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshMailingStatsAction(mailingId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.stats && result.fetchedAt) onRefreshed(result.stats, result.fetchedAt);
    });
  }

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-[#890404]/15">
      {!stats ? (
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#E01E1E] disabled:opacity-40 transition-colors"
        >
          <RefreshCw size={11} className={isPending ? "animate-spin" : ""} />
          {isPending ? "Récupération…" : "Voir les statistiques"}
        </button>
      ) : (
        <div>
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
            <span className="text-[11px] font-bold" style={{ color: rateColor(stats.openRate, OPEN_RATE_THRESHOLDS) }}>
              {pct(stats.openRate)} ouverture
            </span>
            <span className="text-[11px] font-bold" style={{ color: rateColor(stats.clickRate, CLICK_RATE_THRESHOLDS) }}>
              {pct(stats.clickRate)} clic
            </span>
            {stats.unsubscriptions > 0 && (
              <span className="text-[11px] text-[#F5EDED]/40">
                {stats.unsubscriptions} désabonnement{stats.unsubscriptions > 1 ? "s" : ""}
              </span>
            )}
            {stats.hardBounces > 0 && (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-400">
                <AlertTriangle size={11} />
                {stats.hardBounces} email{stats.hardBounces > 1 ? "s" : ""} invalide{stats.hardBounces > 1 ? "s" : ""} à nettoyer
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              disabled={isPending}
              aria-label="Rafraîchir les stats"
              title="Rafraîchir les stats"
              className="text-[#F5EDED]/25 hover:text-[#E01E1E] disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={isPending ? "animate-spin" : ""} />
            </button>
          </div>
          {lowOpenRateWarning && (
            <p className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-amber-400">
              <TrendingDown size={11} />
              Taux d&apos;ouverture nettement plus bas que tes autres envois : l&apos;objet mérite peut-être d&apos;être retravaillé.
            </p>
          )}
          {fetchedAt && (
            <p className="mt-1 text-[9.5px] text-[#F5EDED]/25">
              Stats au{" "}
              {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
                new Date(fetchedAt)
              )}{" "}
              (pas en temps réel)
            </p>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-[10.5px] text-red-400">{error}</p>}
    </div>
  );
}
