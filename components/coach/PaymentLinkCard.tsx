"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Link as LinkIcon } from "lucide-react";
import { updateExternalPaymentLink } from "@/app/dashboard/coach/profile/actions";
import { safeAction } from "@/lib/safe-action";

export default function PaymentLinkCard({ initialLink }: { initialLink: string | null }) {
  const t = useT();
  const router = useRouter();
  const [url, setUrl] = useState(initialLink ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const result = await safeAction(() => updateExternalPaymentLink(url));
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="bg-(--ep-s1) border border-(--ep-line)/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/35 mb-2 flex items-center gap-1.5">
        <LinkIcon size={12} style={{ color: "var(--ep-accent)" }} />
        {t("Mon lien de paiement")}
      </p>
      <p className="text-sm text-(--ep-ink)/50 mb-4 leading-relaxed">
        {t("Renseigne ton propre lien de paiement Stripe (ou tout autre lien de paiement) pour pouvoir l'envoyer facilement à tes clients. EP Coaching ne prélève aucune commission sur ce que tu factures toi-même.")}
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("https://buy.stripe.com/...")} aria-label={t("https://buy.stripe.com/...")}
          className="ep-input"
          style={{ flex: 1 }}
        />
        <button onClick={handleSave} disabled={isPending} className="ep-btn-primary" style={{ fontSize: 11 }}>
          {saved ? <Check size={14} /> : isPending ? "..." : t("Enregistrer")}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs font-semibold mt-3">{t(error)}</p>}
    </div>
  );
}
