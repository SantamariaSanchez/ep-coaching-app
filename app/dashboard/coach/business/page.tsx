import { redirect } from "next/navigation";
import { getUser, getProfile, getClients } from "@/utils/auth";
import { createServerSupabase } from "@/lib/supabase-server";
import type { RoadmapHorizon } from "@/lib/coach-roadmap";
import { getBusinessGoals, resolveGoalValue, currentMonthRevenue } from "@/lib/coach-business-goals";
import { getBusinessCanvas } from "@/lib/coach-business-canvas";
import { getNetworkContacts } from "@/lib/coach-network";
import BusinessHub from "@/components/coach/BusinessHub";
import type { RoadmapMilestone } from "@/components/coach/RoadmapPlanner";
import { Rocket } from "lucide-react";

// Axe 6 (VISION.md) — demande directe 2026-08-19 : "un autre espace pour
// tout ce qui est entreprenariat donc la construction de sa propre
// entreprise d'un coach". Passe "masterclass" 2026-09-09 : "pas juste un
// petit onglet avec des cases à cocher mais une incroyable architecture de
// choses utiles... plein plein de fonctionnalités optimisées". 7 sections
// réelles (tableau de bord, objectifs, roadmap, modèle économique, funnel,
// réseau, checklist) plutôt qu'une page qui défile, voir BusinessHub.
export default async function CoachBusinessPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const supabase = await createServerSupabase();
  const [
    { data: checklistRows },
    { data: visionRows },
    { data: milestoneRows },
    goals,
    canvas,
    networkContacts,
    clients,
    revenueThisMonth,
  ] = await Promise.all([
    supabase.from("coach_business_checklist").select("item_key").eq("coach_id", user.id).eq("done", true),
    supabase.from("coach_business_roadmap").select("horizon, vision").eq("coach_id", user.id),
    supabase
      .from("coach_roadmap_milestones")
      .select("id, horizon, label, done")
      .eq("coach_id", user.id)
      .order("position"),
    getBusinessGoals(user.id),
    getBusinessCanvas(user.id),
    getNetworkContacts(user.id),
    getClients(user.id),
    currentMonthRevenue(user.id),
  ]);

  const initialDone = (checklistRows ?? []).map((r) => r.item_key as string);
  const initialVisions: Partial<Record<RoadmapHorizon, string>> = {};
  for (const row of visionRows ?? []) {
    if (row.vision) initialVisions[row.horizon as RoadmapHorizon] = row.vision as string;
  }
  const initialMilestones = (milestoneRows ?? []) as RoadmapMilestone[];

  const activeClientsCount = clients.filter((c) => c.subscription_status === "active").length;
  const goalsWithProgress = goals.map((goal) => ({
    goal,
    currentValue: resolveGoalValue(goal, { activeClientsCount, revenueThisMonth }),
  }));

  const monthPrefix = new Date().toISOString().slice(0, 7);
  const newClientsThisMonth = clients.filter((c) => c.start_date?.startsWith(monthPrefix)).length;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
          <Rocket size={26} className="text-[#E01E1E]" strokeWidth={1.8} />
          Développer mon business
        </h1>
        <p className="mt-1 text-sm text-[#F5EDED]/40 leading-relaxed max-w-xl">
          Suivre tes clients, c&apos;est déjà couvert partout ailleurs dans l&apos;appli. Ici, c&apos;est
          ton propre business de coach : où tu en es, où tu vas, et un système pour y arriver.
        </p>
      </div>

      <BusinessHub
        activeClientsCount={activeClientsCount}
        newClientsThisMonth={newClientsThisMonth}
        revenueThisMonth={revenueThisMonth}
        goalsWithProgress={goalsWithProgress}
        initialVisions={initialVisions}
        initialMilestones={initialMilestones}
        canvas={canvas}
        networkContacts={networkContacts}
        checklistDone={initialDone}
      />
    </div>
  );
}
