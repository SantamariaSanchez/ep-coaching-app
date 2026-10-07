"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut } from "lucide-react";
import { joinPersonalCoach, leavePersonalCoach } from "@/app/dashboard/coach/profile/actions";

export default function PersonalCoachCard({
  linkedCoachName,
}: {
  linkedCoachName: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    setError("");
    startTransition(async () => {
      const result = await joinPersonalCoach(code);
      if (result.error) {
        setError(result.error);
      } else {
        setCode("");
        router.refresh();
      }
    });
  }

  function handleLeave() {
    setError("");
    startTransition(async () => {
      const result = await leavePersonalCoach();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
        {t("Mon coaching personnel")}
      </p>

      {linkedCoachName ? (
        <>
          <p className="text-sm text-[#F5EDED]/65 mb-4">
            {t("Tu es actuellement suivi par")}{" "}<strong className="text-[#F5EDED]">{linkedCoachName}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/dashboard/client"
              className="ep-btn-primary"
              style={{ textDecoration: "none", fontSize: 11 }}
            >
              {t("Ouvrir mon espace client")}
              <ArrowRight size={14} />
            </a>
            <button
              onClick={handleLeave}
              disabled={isPending}
              className="ep-btn-secondary"
              style={{ fontSize: 11 }}
            >
              <LogOut size={13} />
              {t("Quitter ce coach")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-[#F5EDED]/50 mb-4 leading-relaxed">
            {t("Toi aussi tu peux être suivi par un autre coach de la plateforme : renseigne son code d'invitation pour accéder à ton propre espace client.")}
          </p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("Code d'invitation")} aria-label={t("Code d'invitation")}
              className="ep-input"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleJoin}
              disabled={isPending || !code.trim()}
              className="ep-btn-primary"
              style={{ fontSize: 11 }}
            >
              {t("Rejoindre")}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-red-400 text-xs font-semibold mt-3">{error}</p>}
    </div>
  );
}
