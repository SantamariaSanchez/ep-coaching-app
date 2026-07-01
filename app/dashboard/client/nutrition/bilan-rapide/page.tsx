import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { getNutritionProfile, getTodayLogs } from "@/utils/nutrition";
import NutritionBilanQuiz from "@/components/ui/NutritionBilanQuiz";
import { addFoodLog } from "../actions";
import { ChevronLeft, Apple } from "lucide-react";

export default async function BilanRapidePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const today = new Date().toISOString().split("T")[0];

  const [nutritionProfile, todayLogs] = await Promise.all([
    getNutritionProfile(user.id),
    getTodayLogs(user.id, today),
  ]);

  const alreadyLoggedToday = todayLogs.reduce((s, l) => s + (l.calories ?? 0), 0) > 50;

  return (
    <div className="px-5 py-8 max-w-lg mx-auto pb-24 md:pb-8 page-transition">
      {/* Back link */}
      <Link
        href="/dashboard/client/nutrition"
        className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={13} />
        Retour nutrition
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-[#E01E1E]/15 border border-[#E01E1E]/30 flex items-center justify-center flex-shrink-0">
            <Apple size={18} className="text-[#E01E1E]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">
              Nutrition
            </p>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Bilan rapide
            </h1>
          </div>
        </div>
        <p className="text-sm text-[#F5EDED]/45 leading-relaxed">
          4 questions · 1 minute · Log automatique — aucune saisie manuelle.
        </p>
      </div>

      {alreadyLoggedToday && (
        <div className="bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-green-400 font-semibold">
            Tu as déjà logué des repas aujourd&apos;hui. Ce quiz ajoutera des entrées supplémentaires — vérifie ton total après.
          </p>
        </div>
      )}

      {!nutritionProfile?.calories_target && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-amber-400 font-semibold">
            Aucun objectif calorique défini — les estimations seront basées sur une base de 2000 kcal.{" "}
            <Link href="/dashboard/client/nutrition" className="underline">
              Définir mon objectif
            </Link>
          </p>
        </div>
      )}

      <NutritionBilanQuiz
        nutritionProfile={nutritionProfile}
        today={today}
        addFoodLog={addFoodLog}
      />
    </div>
  );
}
