"use client";

import { useState, useTransition } from "react";
import { Bot, Check } from "lucide-react";
import { triggerAgentCheckin } from "@/app/dashboard/coach/messages/[clientId]/actions";

// Bouton "Relance agent IA" (demande directe 2026-08-19 : "les agents IA
// doivent... s'occuper des clients"). Déclenche lib/coach-agent-checkin.ts :
// un agent interne (Camila, onboarding/success par défaut) regarde
// l'activité réelle du client et envoie un message de relance personnalisé
// via le compte du coach — visible immédiatement dans la conversation en
// dessous (realtime déjà en place sur ConversationView).
export default function AgentCheckinButton({ clientId }: { clientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<"idle" | "sent" | "error">("idle");

  function handleClick() {
    setState("idle");
    startTransition(async () => {
      const result = await triggerAgentCheckin(clientId);
      setState(result.error ? "error" : "sent");
      if (!result.error) setTimeout(() => setState("idle"), 4000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Un agent IA regarde l'activité réelle de ce client et envoie une relance personnalisée"
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border transition-colors flex-shrink-0 ml-auto disabled:opacity-50"
      style={
        state === "sent"
          ? { background: "rgba(74,222,128,0.12)", borderColor: "rgba(74,222,128,0.35)", color: "#4ade80" }
          : { background: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.3)", color: "#60a5fa" }
      }
    >
      {state === "sent" ? <Check size={12} /> : <Bot size={12} />}
      {isPending ? "…" : state === "sent" ? "Relance envoyée" : state === "error" ? "Réessayer" : "Relance agent IA"}
    </button>
  );
}
