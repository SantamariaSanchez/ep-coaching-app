import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile } from "@/utils/auth";
import { todayInParis } from "@/lib/dates";
import {
  getNonNegotiablesDay,
  getWeekNonNegotiables,
  getMonthlyObjectives,
  getWeeklyBusinessStats,
  currentNonNegotiablesStreak,
} from "@/lib/business-non-negotiables";
import NonNegotiablesTracker from "@/components/coach/NonNegotiablesTracker";
import { ChevronLeft } from "lucide-react";

// Pilotage business du coach (non-négociables quotidiens + les 5
// catégories de données hebdo du Mastermind ThePrepDad) — demande directe
// de Santamaria (2026-09-22), avec le contenu réel du Mastermind fourni
// verbatim plutôt que reconstruit de mémoire. Vit sous /business comme
// "Développer mon business" et "Publicité" (segment business/pilotage
// dans DashboardNav), sa propre page autonome.
//
// Les 5 catégories ne sont PAS toutes ressaisies à la main : Audience &
// visibilité, Contenu & création et Offres & ventes existent déjà ailleurs
// dans l'appli (coach_scripts, leads, sales_calls) — voir
// lib/business-non-negotiables.ts::getWeeklyBusinessStats, qui les agrège
// plutôt que de redemander à Santamaria de les ressaisir. Seuls les
// non-négociables quotidiens (lecture, pleine conscience, objectifs,
// création, outreach) et les 5 objectifs du mois sont une vraie saisie
// manuelle, faute d'exister ailleurs.
export default async function BusinessPilotagePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (!profile || profile.role === "client") redirect("/dashboard/client");

  const today = todayInParis();
  const [todayLog, weekLogs, monthlyObjectives, weeklyStats] = await Promise.all([
    getNonNegotiablesDay(user.id, today),
    getWeekNonNegotiables(user.id, today),
    getMonthlyObjectives(user.id, today),
    getWeeklyBusinessStats(user.id, today),
  ]);

  const streak = currentNonNegotiablesStreak(weekLogs);

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <Link
        href="/dashboard/coach/business"
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        Retour
      </Link>

      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon business
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Pilotage</h1>
        <p className="mt-2 text-sm text-[#F5EDED]/45">
          Tes non-négociables quotidiens, tes objectifs du mois, et les chiffres de la semaine
          (audience, contenu, leads, ventes) — inspiré du système du Mastermind, adapté à ta réalité.
        </p>
      </div>

      <NonNegotiablesTracker
        today={today}
        todayLog={todayLog}
        weekLogs={weekLogs}
        streak={streak}
        monthlyObjectives={monthlyObjectives}
        weeklyStats={weeklyStats}
      />
    </div>
  );
}
