import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getUser, getProfile, getClientById } from "@/utils/auth";
import { getClientMeasurements } from "@/utils/measurements";
import { saveMeasurement } from "./actions";
import MeasurementForm from "@/components/ui/MeasurementForm";
import MeasurementHistoryTable from "@/components/ui/MeasurementHistoryTable";
import { ChevronLeft } from "lucide-react";

export default async function CoachClientMeasurementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getUser();
  if (!user) redirect("/auth/login");

  const [profile, client, measurements] = await Promise.all([
    getProfile(user.id),
    getClientById(id),
    getClientMeasurements(id),
  ]);

  if (profile?.role === "client") redirect("/dashboard/client");
  if (!client) notFound();

  const latest = measurements[0];

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto page-transition">
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
            Mensurations
          </p>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            {client.full_name}
          </h1>
          <p className="mt-1 text-xs text-[#F5EDED]/30">
            {measurements.length} session{measurements.length !== 1 ? "s" : ""}{" "}
            enregistrée{measurements.length !== 1 ? "s" : ""}
            {latest &&
              ` · Dernière : ${new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "long",
              }).format(new Date(latest.measured_at + "T12:00:00"))}`}
          </p>
        </div>
      </div>

      {/* Latest snapshot */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Poids", value: latest.weight, unit: "kg" },
            { label: "Tour de taille", value: latest.waist, unit: "cm" },
            { label: "Bras fléchi", value: latest.arm_flexed, unit: "cm" },
            { label: "Cuisse", value: latest.thigh, unit: "cm" },
          ].map(({ label, value, unit }) => (
            <div
              key={label}
              className="bg-[#1f0101] border border-[#890404]/40 rounded-xl px-4 py-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
                {label}
              </p>
              <p className="text-2xl font-black text-white">
                {value ?? "—"}
                {value != null && (
                  <span className="text-xs font-normal text-[#F5EDED]/40 ml-1">
                    {unit}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="mb-8">
        <MeasurementForm clientId={id} saveAction={saveMeasurement} />
      </div>

      {/* History */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          Historique
        </p>
        <MeasurementHistoryTable measurements={measurements} />
      </div>
    </div>
  );
}
