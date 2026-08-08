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
    getClientById(id, user.id),
    getAllClientSessions(id, 10),
    getClientPersonalRecords(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  return (
    <div className="px-6 py-8 max-w-4xl mx-auto page-transition">
      <Link
        href={`/dashboard/coach/clients/${id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors mb-6"
      >
        <ChevronLeft size={14} />
        {client.full_name ?? "Client"}
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
            Logbook
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name ?? "Client"}
          </h1>
        </div>
        <a
          href={`/api/export-logbook?clientId=${id}`}
          className="inline-flex items-center gap-2 border border-[#890404]/30 hover:border-[#890404]/60 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
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
