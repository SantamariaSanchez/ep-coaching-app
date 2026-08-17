import { createAdminClient } from "@/lib/supabase-admin";

export interface AgentMessage {
  id: string;
  agent_key: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface AgentTask {
  id: string;
  agent_key: string;
  title: string;
  description: string | null;
  status: "a_faire" | "en_cours" | "fait";
  created_at: string;
}

export async function getAgentMessages(ownerId: string, agentKey: string): Promise<AgentMessage[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_agent_messages")
      .select("id, agent_key, role, content, created_at")
      .eq("owner_id", ownerId)
      .eq("agent_key", agentKey)
      .order("created_at", { ascending: true });
    return (data as AgentMessage[]) ?? [];
  } catch {
    return [];
  }
}

export async function getAgentTasks(ownerId: string, agentKey: string): Promise<AgentTask[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_agent_tasks")
      .select("id, agent_key, title, description, status, created_at")
      .eq("owner_id", ownerId)
      .eq("agent_key", agentKey)
      .order("created_at", { ascending: false });
    return (data as AgentTask[]) ?? [];
  } catch {
    return [];
  }
}

// Compte de tâches "à faire"/"en cours" par agent, pour un badge rapide sur
// chaque carte de poste dans Organisation sans charger toutes les tâches.
export async function getOpenTaskCountsByAgent(ownerId: string): Promise<Record<string, number>> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("ai_agent_tasks")
      .select("agent_key")
      .eq("owner_id", ownerId)
      .neq("status", "fait");
    const counts: Record<string, number> = {};
    for (const row of (data as { agent_key: string }[]) ?? []) {
      counts[row.agent_key] = (counts[row.agent_key] ?? 0) + 1;
    }
    return counts;
  } catch {
    return {};
  }
}
