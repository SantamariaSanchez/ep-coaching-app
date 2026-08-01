"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Link as LinkIcon } from "lucide-react";
import { updateExternalPaymentLink } from "@/app/dashboard/coach/profile/actions";

export default function PaymentLinkCard({ initialLink }: { initialLink: string | null }) {
  const router = useRouter();
  const [url, setUrl] = useState(initialLink ?? "");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const result = await updateExternalPaymentLink(url);
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
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2 flex items-center gap-1.5">
        <LinkIcon size={12} style={{ color: "#E01E1E" }} />
        Mon lien de paiement
      </p>
      <p className="text-sm text-[#F5EDED]/50 mb-4 leading-relaxed">
        Renseigne ton propre lien de paiement Stripe (ou tout autre lien de paiement) pour
        pouvoir l&apos;envoyer facilement à tes clients. EP Coaching ne prélève aucune commission
        sur ce que tu factures toi-même.
      </p>
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://buy.stripe.com/..."
          className="ep-input"
          style={{ flex: 1 }}
        />
        <button onClick={handleSave} disabled={isPending} className="ep-btn-primary" style={{ fontSize: 11 }}>
          {saved ? <Check size={14} /> : isPending ? "..." : "Enregistrer"}
        </button>
      </div>
      {error && <p className="text-red-400 text-xs font-semibold mt-3">{error}</p>}
    </div>
  );
}
