import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientCheckins } from "@/utils/checkins";
import { getWeekDailyLogs, computeWeeklyAverages } from "@/utils/daily-logs";
import CheckinCard from "@/components/ui/CheckinCard";
import CheckinDaySettings from "@/components/ui/CheckinDaySettings";
import { ChevronLeft } from "lucide-react";

export default async function ClientCheckinsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, checkins] = await Promise.all([
    getProfile(user.id),
    getClientById(id, user.id),
    getClientCheckins(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  // Moyennes du bilan quotidien de la semaine de chaque check-in — pour le
  // coach uniquement (voir DailyAveragesRecap dans CheckinCard).
  const checkinsWithAverages = await Promise.all(
    checkins.map(async (checkin) => ({
      checkin,
      averages: computeWeeklyAverages(await getWeekDailyLogs(id, checkin.week_start)),
    }))
  );

  const pendingCount = checkins.filter((c) => !c.coach_replied_at).length;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name}
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Check-ins
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name}
          </h1>
          <p className="mt-1 text-xs text-[#F5EDED]/30">
            {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-400 font-semibold">
                · {pendingCount} sans réponse
              </span>
            )}
          </p>
        </div>
      </div>

      <CheckinDaySettings clientId={id} currentDay={client.checkin_day} />

      {checkins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-[#F5EDED]/40 uppercase tracking-widest">
            Aucun check-in pour l&apos;instant
          </p>
          <p className="text-xs text-[#F5EDED]/25 mt-1">
            Le client n&apos;a pas encore soumis de bilan hebdomadaire.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkinsWithAverages.map(({ checkin, averages }) => (
            <CheckinCard key={checkin.id} checkin={checkin} dailyAverages={averages} />
          ))}
        </div>
      )}
    </div>
  );
}
