import { redirect } from "next/navigation";
import { getUser } from "@/utils/auth";
import { getScheduleBlocks } from "@/utils/agenda";
import WeeklyAgenda from "@/components/ui/WeeklyAgenda";
import {
  addScheduleBlock,
  addScheduleBlocksBulk,
  updateScheduleBlock,
  deleteScheduleBlock,
  duplicateDayBlocks,
  clearDayBlocks,
} from "./actions";
import { CalendarDays } from "lucide-react";

export default async function ClientAgendaPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const blocks = await getScheduleBlocks(user.id);

  return (
    <div className="px-5 py-8 max-w-4xl mx-auto pb-24 md:pb-8 page-transition">
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1 flex items-center gap-1.5">
          <CalendarDays size={11} /> Organisation
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">Mon agenda</h1>
        <p className="text-sm text-[#F5EDED]/45 mt-2">
          Ton emploi du temps type, semaine après semaine. Ajoute tes créneaux (travail, salle, repas,
          rendez-vous...), renomme-les et ajuste les horaires comme tu veux. Un modèle par jour peut se
          répéter sur plusieurs jours d&apos;un coup, et se transformer en rappel push.
        </p>
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
      />
    </div>
  );
}
