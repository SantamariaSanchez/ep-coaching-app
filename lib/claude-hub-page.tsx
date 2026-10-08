import { createAdminClient } from "@/lib/supabase-admin";
import { getT } from "@/lib/i18n-server";
import ClaudeHub from "@/components/ai/ClaudeHub";
import type { ClaudeRole } from "@/lib/claude-prompts";
import BackLink from "@/components/ui/BackLink";

// Rendu commun de la page « Claude et Notion » (coach, client, équipe).
export async function ClaudeHubPage({ userId, role }: { userId: string; role: ClaudeRole }) {
  const t = await getT();
  const backHref = role === "coach" ? "/dashboard/coach/plus" : role === "staff" ? "/equipe" : "/dashboard/client/plus";
  const { data: tokens } = await createAdminClient()
    .from("api_tokens")
    .select("id, name, created_at, last_used_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  return (
    <div className="px-4 sm:px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <BackLink fallback={backHref} />
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">{t("Intelligence artificielle")}</p>
      <h1 className="text-3xl font-black uppercase tracking-tight mb-4">{t("Claude et Notion")}</h1>
      <ClaudeHub role={role} tokens={(tokens ?? []) as { id: string; name: string; created_at: string; last_used_at: string | null }[]} />
    </div>
  );
}
