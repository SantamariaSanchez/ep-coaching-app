import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getScheduleBlocks, getScheduleBlockTaskLog, getAgendaSettings } from "@/utils/agenda";
import { getAgendaContext } from "@/utils/agenda-context";
import { getDailyHabitScore, getWeeklyHabitScores, currentStreak } from "@/lib/habit-score";
import { todayInParis } from "@/lib/dates";
import WeeklyAgenda from "@/components/ui/WeeklyAgenda";
import PushDeliveryAlert from "@/components/settings/PushDeliveryAlert";
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
  shiftDayFromBlock,
  setBlockSkippedOnDate,
  replaceBlockOnDate,
  saveAgendaWindow,
  saveAgendaPrefs,
  saveDayTemplates,
  setScheduleBlockTimes,
  setScheduleBlockTasks,
  placeColumnBlocks,
} from "@/app/dashboard/client/agenda/actions";
import PageLinks from "@/components/ui/PageLinks";

export default async function CoachMoiAgendaPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "client") redirect("/dashboard/client");

  const today = todayInParis();
  const [blocks, completedTaskKeys, habitScore, weeklyScores, agendaSettings, agendaContext] = await Promise.all([
    getScheduleBlocks(user.id),
    getScheduleBlockTaskLog(user.id, today),
    getDailyHabitScore(user.id, today),
    getWeeklyHabitScores(user.id, today),
    getAgendaSettings(user.id),
    getAgendaContext(user.id),
  ]);
  const streak = currentStreak(weeklyScores);

  return (
    <div className="px-4 py-4 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <PageLinks links={[{ kind: "roadmap", label: "Road map", href: "/dashboard/coach/moi/roadmap" }, { kind: "rappels", label: "Rappels", href: "/dashboard/coach/moi/reminders" }, { kind: "semaine", label: "Ma semaine", href: "/dashboard/coach/moi/semaine" }]} />

      {/* Score replié (audit 2026-11-13) : l'agenda d'abord. */}
      {habitScore.components.length > 0 && (
        <details className="mb-4 rounded-xl border border-(--ep-line)/20 px-3">
          <summary className="cursor-pointer min-h-11 flex items-center gap-2 text-[12px] font-black text-(--ep-ink)/70">
            <span className="tabular-nums text-(--ep-strong)">{habitScore.score}</span>
            <span className="text-(--ep-ink)/45 font-bold">/ 100</span>
            {streak > 0 && <span className="ml-auto text-(--ep-ink)/50 font-bold">{streak} j d&apos;affilée</span>}
          </summary>
          <div className="grid sm:grid-cols-2 gap-3 pb-3">
            <HabitScoreCard habitScore={habitScore} />
            <HabitScoreTrend points={weeklyScores} streak={streak} />
          </div>
        </details>
      )}

      <PushDeliveryAlert />

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
        shiftDayFromBlock={shiftDayFromBlock}
        setBlockSkippedOnDate={setBlockSkippedOnDate}
        replaceBlockOnDate={replaceBlockOnDate}
        saveAgendaWindow={saveAgendaWindow}
        saveAgendaPrefs={saveAgendaPrefs}
        saveDayTemplates={saveDayTemplates}
        setScheduleBlockTimes={setScheduleBlockTimes}
        setScheduleBlockTasks={setScheduleBlockTasks}
        placeColumnBlocks={placeColumnBlocks}
        settings={agendaSettings}
        context={agendaContext}
        space="coach"
      />
    </div>
  );
}
