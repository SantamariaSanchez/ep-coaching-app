"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { CalendarClock, Copy, MessageSquare } from "lucide-react";
import Link from "next/link";
import {
  engagementEndDate,
  engagementProgress,
  planEngagementBlocks,
  renewalMessage,
  reviewDate,
  reviewState,
  type EngagementRow,
  type RenewalStatus,
} from "@/lib/engagement";
import { updateEngagement } from "@/app/dashboard/coach/clients/[id]/engagement/actions";
import { safeAction } from "@/lib/safe-action";

const BLOCK_LABEL = { calibrage: "Calibrage", optimisation: "Optimisation", bilan: "Bilan et suite" } as const;

function fr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Panneau coach : engagement du client (6 mois par défaut, modifiable), mois
// en cours, appel bilan un mois avant la fin, plan de phases aligné et
// message modèle de renouvellement. Jamais rendu côté client.
export default function EngagementPanel({
  clientId,
  engagement,
  firstName,
  today,
  bookingUrl,
}: {
  clientId: string;
  engagement: EngagementRow | null;
  firstName: string | null;
  today: string;
  bookingUrl: string;
}) {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [months, setMonths] = useState(String(engagement?.duration_months ?? 6));
  const [startDate, setStartDate] = useState(engagement?.start_date ?? today);
  const [renewal, setRenewal] = useState<RenewalStatus | "">(engagement?.renewal_status ?? "");
  const [copied, setCopied] = useState(false);

  const monthsNum = Math.min(24, Math.max(1, Math.round(Number(months) || 6)));
  const end = engagementEndDate(startDate || today, monthsNum);
  const progress = engagement ? engagementProgress(engagement.start_date, engagement.end_date, today) : null;
  const state = engagement ? reviewState(engagement.end_date, today, engagement.renewal_status) : "none";
  const plan = planEngagementBlocks(monthsNum);
  const kind = engagement && today > engagement.end_date ? "fin" : "un_mois";
  const message = engagement ? renewalMessage({ firstName, kind, endDate: engagement.end_date, bookingUrl }) : "";

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const r = await safeAction(() => updateEngagement(clientId, { months: monthsNum, startDate, renewalStatus: renewal === "" ? null : renewal }));
      if (r.error) setError(r.error);
      else setSaved(true);
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const stateText =
    state === "late"
      ? t("Engagement terminé : propose l'appel bilan et la suite.")
      : state === "due"
        ? t("C'est le moment de proposer l'appel bilan (un mois avant la fin).")
        : state === "upcoming"
          ? t("Appel bilan à prévoir très bientôt.")
          : null;

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-(--ep-accent)/12 border border-(--ep-accent)/25 flex items-center justify-center flex-shrink-0">
          <CalendarClock size={16} className="text-(--ep-accent)" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-(--ep-strong)">{t("Engagement")}</p>
          {engagement && progress ? (
            <p className="text-[11px] text-(--ep-ink)/50 mt-0.5">
              {progress.status === "ended"
                ? `${t("Terminé le")} ${fr(engagement.end_date)}`
                : `${t("Mois")} ${progress.monthIndex} ${t("sur")} ${progress.months}, ${t("fin le")} ${fr(engagement.end_date)}`}
              {" · "}{t("appel bilan dès le")} {fr(reviewDate(engagement.end_date))}
            </p>
          ) : (
            <p className="text-[11px] text-(--ep-ink)/50 mt-0.5">{t("Aucun engagement enregistré : renseigne la durée et la date de début.")}</p>
          )}
        </div>
      </div>

      {stateText && (
        <p className="mt-3 rounded-lg border border-(--ep-accent)/30 bg-(--ep-accent)/10 px-3 py-2 text-xs text-(--ep-strong)">{stateText}</p>
      )}

      <div className="mt-3.5 pt-3.5 border-t border-(--ep-line)/15 grid grid-cols-2 gap-2">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
          {t("Durée (mois)")}
          <input
            type="number"
            min={1}
            max={24}
            inputMode="numeric"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
            className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
          />
        </label>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
          {t("Date de début")}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
          />
        </label>
        <label className="block col-span-2 text-[10px] font-semibold uppercase tracking-wider text-(--ep-ink)/40">
          {t("Suite décidée")}
          <select
            value={renewal}
            onChange={(e) => setRenewal(e.target.value as RenewalStatus | "")}
            className="mt-1 w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) focus:outline-none focus:border-(--ep-accent)/50"
          >
            <option value="">{t("Pas encore décidée")}</option>
            <option value="en_reflexion">{t("Le client y réfléchit")}</option>
            <option value="renouvele">{t("Renouvelé")}</option>
            <option value="arrete">{t("Arrêt")}</option>
          </select>
        </label>
      </div>
      <p className="mt-1.5 text-[10.5px] text-(--ep-ink)/40">{t("Fin calculée")} : {fr(end)}</p>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={save}
          disabled={isPending}
          className="flex-1 bg-(--ep-accent) hover:bg-(--ep-accent-2) text-(--ep-strong) text-[11px] font-bold uppercase tracking-widest px-3.5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? "..." : t("Enregistrer l'engagement")}
        </button>
        {saved && <span className="text-[11px] text-(--ep-ink)/50">{t("Enregistré")}</span>}
      </div>
      {error && <p className="text-[11px] text-(--ep-accent) mt-2">{t(error)}</p>}

      <details className="mt-3.5 pt-3.5 border-t border-(--ep-line)/15">
        <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40">{t("Plan de phases conseillé")}</summary>
        <ul className="mt-2 space-y-1">
          {plan.map((b) => (
            <li key={`${b.kind}-${b.startWeek}`} className="text-[11px] text-(--ep-ink)/60">
              {t("Semaines")} {b.startWeek} {t("à")} {b.startWeek + b.weeks - 1} : {t(BLOCK_LABEL[b.kind])} ({b.weeks} {t("semaines")})
            </li>
          ))}
        </ul>
      </details>

      {engagement && (
        <div className="mt-3.5 pt-3.5 border-t border-(--ep-line)/15">
          <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/40 mb-2">{t("Message de renouvellement (modèle à relire)")}</p>
          <textarea
            readOnly
            value={message}
            rows={8}
            className="w-full bg-(--ep-shade)/30 border border-(--ep-line)/30 rounded-lg px-2.5 py-2 text-xs text-(--ep-strong) leading-relaxed"
          />
          <div className="mt-2 flex items-center gap-2">
            <button onClick={copy} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-accent) hover:text-(--ep-accent-2)">
              <Copy size={12} />
              {copied ? t("Copié") : t("Copier le message")}
            </button>
            <Link href={`/dashboard/coach/messages/${clientId}`} className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-(--ep-ink)/50 hover:text-(--ep-ink)/80">
              <MessageSquare size={12} />
              {t("Ouvrir la conversation")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
