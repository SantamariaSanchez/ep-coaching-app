import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUser, getProfile } from "@/utils/auth";
import { getAgentByKey } from "@/lib/ai-agents";
import { getAgentMessages, getAgentTasks } from "@/utils/ai-agents";
import AgentChatView from "@/components/coach/AgentChatView";

// Chat avec un agent IA (demande explicite 2026-08-17). Réservé au
// propriétaire de la plateforme, comme le reste du groupe Administration >
// Organisation d'où cette page est toujours atteinte.
export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile?.is_platform_owner) redirect("/dashboard/coach");

  const agent = getAgentByKey(key);
  if (!agent) notFound();

  const [messages, tasks] = await Promise.all([
    getAgentMessages(user.id, key),
    getAgentTasks(user.id, key),
  ]);

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/admin/organisation"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} /> Organisation
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Agent IA
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">{agent.name}</h1>
      </div>

      <AgentChatView agent={agent} initialMessages={messages} initialTasks={tasks} />
    </div>
  );
}
