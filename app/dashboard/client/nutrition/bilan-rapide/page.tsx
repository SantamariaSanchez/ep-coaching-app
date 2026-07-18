import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getNutritionProfile, getLast30DaysLogs, getAllFoods } from "@/utils/nutrition";
import NutritionBilanQuiz from "@/components/ui/NutritionBilanQuiz";
import { addFoodLog, createCustomFood } from "../actions";
import { ChevronLeft } from "lucide-react";

export default async function BilanRapidePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);

  // Le coach peut ouvrir son propre bilan rapide depuis /dashboard/coach/moi/nutrition —
  // /dashboard/client/nutrition (contrairement à cette page) redirige les coachs vers
  // /dashboard/coach, donc les liens de retour doivent pointer ailleurs pour eux.
  const backHref = profile?.role === "coach" ? "/dashboard/coach/moi/nutrition" : "/dashboard/client/nutrition";

  const today = new Date().toISOString().split("T")[0];

  const [nutritionProfile, historyLogs, allFoods] = await Promise.all([
    getNutritionProfile(user.id),
    getLast30DaysLogs(user.id),
    getAllFoods(),
  ]);

  return (
    <div className="px-5 py-8 max-w-lg mx-auto pb-24 md:pb-8 page-transition">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} />
        Retour nutrition
      </Link>

      {/* Header */}
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Nutrition
        </p>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
          ⚡ Bilan rapide
        </h1>
        <p className="text-sm text-[#F5EDED]/45 leading-relaxed">
          Repas par repas, aliment par aliment. ~2 min, log automatique à la fin.
        </p>

        {!nutritionProfile?.calories_target && (
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3 mt-4">
            <p className="text-xs text-amber-400 font-semibold">
              Aucun objectif calorique défini.{" "}
              <Link href={backHref} className="underline">
                Définir mon objectif →
              </Link>
            </p>
          </div>
        )}
      </div>

      <NutritionBilanQuiz
        nutritionProfile={nutritionProfile}
        today={today}
        historyLogs={historyLogs}
        allFoods={allFoods}
        addFoodLog={addFoodLog}
        createCustomFood={createCustomFood}
      />
    </div>
  );
}
