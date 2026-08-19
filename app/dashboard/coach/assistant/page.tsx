import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAgentTasks } from "@/utils/ai-agents";
import AssistantTaskList from "@/components/coach/AssistantTaskList";
import { Bot, ShieldCheck, MessageCircle } from "lucide-react";

// "Mon assistant" (Axe 10, VISION.md — demande directe 2026-08-19 : "je
// veux que agent IA pour les coach humain soit des assistant mais qui
// prenne quand même des décisions et ont des tâche auto récurente").
// Accessible à TOUT coach, contrairement au chat des 19 agents internes
// (Organisation, réservé au propriétaire — ce sont les rôles internes
// d'EP Coaching elle-même, pas un outil à dupliquer par coach tiers).
// Tourne automatiquement chaque jour (voir app/api/cron/coach-assistant
// et lib/coach-assistant-sweep.ts) : relance les clients à risque,
// signale les problèmes trouvés ici — jamais besoin de le déclencher
// manuellement, mais un clic direct depuis la conversation d'un client
// ("Relance agent IA") reste toujours possible.
export default async function CoachAssistantPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const tasks = await getAgentTasks(user.id, "head-coach");

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Bot size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Mon assistant
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40 leading-relaxed max-w-xl">
          Chaque jour, ton assistant vérifie tes clients : ceux dont le bilan est à l&apos;arrêt reçoivent
          une relance automatiquement, et tout problème réel trouvé apparaît ici.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 my-6">
        <div className="ep-card flex items-start gap-3" style={{ padding: "16px 18px" }}>
          <MessageCircle size={16} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">
            Relance automatique dès qu&apos;un client n&apos;a pas fait son bilan depuis 3 jours, jamais
            plus d&apos;une fois tous les 3 jours pour le même client.
          </p>
        </div>
        <div className="ep-card flex items-start gap-3" style={{ padding: "16px 18px" }}>
          <ShieldCheck size={16} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">
            Audit qualité quotidien : programmes laissés inachevés, décrochages réels — jamais un
            rapport creux, seulement ce qui mérite vraiment ton attention.
          </p>
        </div>
      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
        À vérifier
      </p>
      <AssistantTaskList initialTasks={tasks} />
    </div>
  );
}
