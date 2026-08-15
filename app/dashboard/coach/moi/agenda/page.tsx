import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getScheduleBlocks, getScheduleBlockTaskLog } from "@/utils/agenda";
import { getDailyHabitScore, getWeeklyHabitScores, currentStreak } from "@/lib/habit-score";
import { todayInParis } from "@/lib/dates";
import WeeklyAgenda from "@/components/ui/WeeklyAgenda";
import HabitScoreCard from "@/components/ui/HabitScoreCard";
import HabitScoreTrend from "@/components/ui/HabitScoreTrend";
import {
  addScheduleBlock,
  addScheduleBlocksBulk,
  updateScheduleBlock,
  deleteScheduleBlock,
  duplicateDayBlocks,
  clearDayBlocks,
  saveScheduleBlockTaskCompletion,
} from "@/app/dashboard/client/agenda/actions";
import { CalendarDays } from "lucide-react";

export default async function CoachMoiAgendaPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const today = todayInParis();
  const [blocks, completedTaskKeys, habitScore, weeklyScores] = await Promise.all([
    getScheduleBlocks(user.id),
    getScheduleBlockTaskLog(user.id, today),
    getDailyHabitScore(user.id, today),
    getWeeklyHabitScores(user.id, today),
  ]);
  const streak = currentStreak(weeklyScores);

  return (
    <div className="px-5 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1 flex items-center gap-1.5">
          <CalendarDays size={11} /> Mon suivi
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon agenda</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Ton propre emploi du temps, exactement comme celui de tes clients. Ajoute tes créneaux et
          ajuste les horaires comme tu veux.
        </p>
      </div>

      <div className="mb-5 grid sm:grid-cols-2 gap-3">
        <HabitScoreCard habitScore={habitScore} />
        <HabitScoreTrend points={weeklyScores} streak={streak} />
      </div>

      <WeeklyAgenda
        blocks={blocks}
        editable
        addScheduleBlock={addScheduleBlock}
        addScheduleBlocksBulk={addScheduleBlocksBulk}
        updateScheduleBlock={updateScheduleBlock}
        deleteScheduleBlock={deleteScheduleBlock}
        duplicateDayBlocks={duplicateDayBlocks}
        clearDayBlocks={clearDayBlocks}
        today={today}
        initialCompletedTaskKeys={completedTaskKeys}
        saveTaskCompletion={saveScheduleBlockTaskCompletion}
      />
    </div>
  );
}
