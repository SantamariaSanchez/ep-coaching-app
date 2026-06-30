import { redirect, notFound } from "next/navigation";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getAllClientSessions, getClientPersonalRecords } from "@/utils/sessions";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import CoachLogbookClient from "@/components/coach/CoachLogbookClient";

export default async function CoachClientLogbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  const [profile, client, sessions, records] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
    getAllClientSessions(id, 10),
    getClientPersonalRecords(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/40 hover:text-[var(--color-ep-light)]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name ?? "Client"}
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-1">
            Logbook
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name ?? "Client"}
          </h1>
        </div>
        <a
          href={`/api/export-logbook?clientId=${id}`}
          className="inline-flex items-center gap-2 border border-[var(--color-ep-dark-red)]/30 hover:border-[var(--color-ep-dark-red)]/60 text-[var(--color-ep-light)]/50 hover:text-[var(--color-ep-light)]/80 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
        >
          Exporter CSV
        </a>
      </div>

      <CoachLogbookClient
        clientId={id}
        sessions={sessions}
        records={records}
      />
    </div>
  );
}
