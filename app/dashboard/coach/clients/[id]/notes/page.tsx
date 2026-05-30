import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import {
  getClientNotes,
  getClientKeyDecisions,
  getCurrentMonday,
  getISOWeekNumber,
} from "@/utils/notes";
import { saveCoachNote, saveKeyDecision, deleteKeyDecision } from "./actions";
import CoachNotesView from "@/components/ui/CoachNotesView";
import { ChevronLeft, FileText } from "lucide-react";

export default async function CoachClientNotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/auth/login");

  const [profile, client, notes, decisions] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
    getClientNotes(id),
    getClientKeyDecisions(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const weekStart = getCurrentMonday();
  const weekNumber = getISOWeekNumber(weekStart);

  // Current week's note (if it exists)
  const currentWeekNote = notes.find((n) => n.week_start === weekStart) ?? null;

  // Previous note weight for variation auto-calc
  const prevNoteWithWeight = notes.find(
    (n) => n.weight != null && n.week_start !== weekStart
  );
  const prevNoteWeight = prevNoteWithWeight?.weight ?? null;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/dashboard/coach/clients/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
        >
          <ChevronLeft size={14} />
          {client.full_name}
        </Link>
        <Link
          href={`/dashboard/coach/clients/${id}/notes/templates`}
          className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 border border-[#890404]/30 hover:border-[#890404]/60 px-3 py-2 rounded-lg transition-colors"
        >
          <FileText size={12} />
          Templates messages
        </Link>
      </div>

      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Notes coach
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {client.full_name}
        </h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          Semaine {weekNumber} · {notes.length} note{notes.length !== 1 ? "s" : ""}{" "}
          · {decisions.length} décision{decisions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <CoachNotesView
        clientId={id}
        weekStart={weekStart}
        weekNumber={weekNumber}
        notes={notes}
        decisions={decisions}
        currentWeekNote={currentWeekNote}
        prevNoteWeight={prevNoteWeight}
        saveNote={saveCoachNote}
        saveDecision={saveKeyDecision}
        deleteDecision={deleteKeyDecision}
      />
    </div>
  );
}
