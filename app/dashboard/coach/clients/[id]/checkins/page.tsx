import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientCheckins } from "@/utils/checkins";
import CheckinCard from "@/components/ui/CheckinCard";
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
    getClientById(id),
    getClientCheckins(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const pendingCount = checkins.filter((c) => !c.coach_replied_at).length;

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name}
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
            Check-ins
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name}
          </h1>
          <p className="mt-1 text-xs text-[var(--color-ep-light)]/30">
            {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-400 font-semibold">
                · {pendingCount} sans réponse
              </span>
            )}
          </p>
        </div>
      </div>

      {checkins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-semibold text-[var(--color-ep-light)]/40 uppercase tracking-widest">
            Aucun check-in pour l&apos;instant
          </p>
          <p className="text-xs text-[var(--color-ep-light)]/25 mt-1">
            Le client n&apos;a pas encore soumis de bilan hebdomadaire.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {checkins.map((checkin) => (
            <CheckinCard key={checkin.id} checkin={checkin} />
          ))}
        </div>
      )}
    </div>
  );
}
