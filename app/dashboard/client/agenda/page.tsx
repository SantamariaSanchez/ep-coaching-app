import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
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
} from "./actions";
import PageLinks from "@/components/ui/PageLinks";

export default async function ClientAgendaPage() {
  const user = await getUser();
  if (!user) redirect("/");

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
      <PageLinks links={[{ kind: "roadmap", label: "Road map", href: "/dashboard/client/roadmap" }, { kind: "rappels", label: "Rappels", href: "/dashboard/client/reminders" }, { kind: "semaine", label: "Ma semaine", href: "/dashboard/client/semaine" }]} />

      <div className="mb-5 grid sm:grid-cols-2 gap-3">
        <HabitScoreCard habitScore={habitScore} />
        <HabitScoreTrend points={weeklyScores} streak={streak} />
      </div>

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
      />
    </div>
  );
}
