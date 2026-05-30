import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getAllClientsNutritionSummary } from "@/utils/nutrition";
import CoachNutritionOverview from "@/components/ui/CoachNutritionOverview";

export default async function CoachNutritionPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const today = new Date().toISOString().split("T")[0];
  const clients = await getAllClientsNutritionSummary(today);

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto page-transition">
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Suivi nutritionnel
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Nutrition
        </h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          Vue d&apos;ensemble · Aujourd&apos;hui
        </p>
      </div>

      <CoachNutritionOverview clients={clients} />
    </div>
  );
}
