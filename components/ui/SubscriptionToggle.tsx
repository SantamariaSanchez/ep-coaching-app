"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, CheckCircle2 } from "lucide-react";
import { setClientSubscriptionStatus } from "@/app/dashboard/coach/clients/actions";

export default function SubscriptionToggle({
  clientId,
  currentStatus,
}: {
  clientId: string;
  currentStatus: "free" | "active" | "canceled";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isActive = currentStatus === "active";

  function toggle() {
    setError(null);
    const nextStatus = isActive ? "free" : "active";
    startTransition(async () => {
      const result = await setClientSubscriptionStatus(clientId, nextStatus);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 flex items-center gap-3">
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
            ? "A accès aux messages, bilans, formations et au suivi coaché."
            : "Autonome — accès aux outils gratuits uniquement."}
        </p>
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      </div>
      <button
        onClick={toggle}
        disabled={isPending}
        className={`flex-shrink-0 text-[11px] font-bold uppercase tracking-widest px-3.5 py-2 rounded-lg transition-colors disabled:opacity-50 ${
          isActive
            ? "border border-[#890404]/40 text-[#F5EDED]/60 hover:text-white"
            : "bg-[#E01E1E] hover:bg-[#B00202] text-white"
        }`}
      >
        {isPending ? "..." : isActive ? "Repasser gratuit" : "Activer le coaching"}
      </button>
    </div>
  );
}
