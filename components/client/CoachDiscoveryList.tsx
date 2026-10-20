"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Check, Bot } from "lucide-react";
import { chooseNewCoach } from "@/app/dashboard/client/coachs/actions";
import type { CoachDiscoveryEntry } from "@/utils/auth";
import { safeAction } from "@/lib/safe-action";

export default function CoachDiscoveryList({ coaches }: { coaches: CoachDiscoveryEntry[] }) {
  const t = useT();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleChoose(coachId: string) {
    setError("");
    setPendingId(coachId);
    startTransition(async () => {
      const result = await safeAction(() => chooseNewCoach(coachId));
      if (result.error) setError(result.error);
      else router.push("/dashboard/client");
    });
  }

  if (coaches.length === 0) {
    return (
      <div className="ep-card" style={{ padding: "24px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "rgba(var(--ep-ink-rgb),0.4)" }}>
          {t("Aucun coach tiers actif pour le moment. Contacte Santamaria sur Instagram en attendant.")}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {coaches.map((coach) => (
        <div key={coach.id} className="ep-card" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: coach.is_ai_coach ? "rgba(var(--ep-info-rgb),0.1)" : "rgba(var(--ep-accent-rgb),0.1)",
            border: coach.is_ai_coach ? "1px solid rgba(var(--ep-info-rgb),0.25)" : "1px solid rgba(var(--ep-accent-rgb),0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {coach.is_ai_coach ? (
              <Bot size={19} style={{ color: "var(--ep-info)" }} strokeWidth={1.8} />
            ) : (
              <UserRound size={19} style={{ color: "var(--ep-accent)" }} strokeWidth={1.8} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--ep-ink)" }}>
                {coach.full_name ?? t("Coach")}
              </p>
              {coach.is_ai_coach && (
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 999,
                    background: "rgba(var(--ep-info-rgb),0.15)", color: "var(--ep-info)",
                    border: "1px solid rgba(var(--ep-info-rgb),0.35)", textTransform: "uppercase", letterSpacing: "0.03em",
                  }}
                >
                  <Bot size={9} />{" "}{t("IA")}
                </span>
              )}
            </div>
            {coach.bio && (
              <p style={{
                margin: 0, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.4)",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {coach.bio}
              </p>
            )}
          </div>
          <button
            onClick={() => handleChoose(coach.id)}
            disabled={isPending}
            className="ep-btn-primary"
            style={{ fontSize: 10.5, padding: "9px 14px", flexShrink: 0 }}
          >
            {isPending && pendingId === coach.id ? "..." : <><Check size={13} />{" "}{t("Choisir")}</>}
          </button>
        </div>
      ))}
      {error && <p style={{ color: "var(--ep-accent-hi2)", fontSize: 11.5, marginTop: 4 }}>{t(error)}</p>}
    </div>
  );
}
