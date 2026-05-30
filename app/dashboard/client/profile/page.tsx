import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientMeasurements } from "@/utils/measurements";
import { getNutritionProfile } from "@/utils/nutrition";
import { getISOWeek } from "@/utils/checkins";
import ClientProfileEditForm from "@/components/ui/ClientProfileEditForm";
import { User, Calendar, Target, Scale } from "lucide-react";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-3 border-b border-[#890404]/10 last:border-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
        {label}
      </span>
      <span className="text-sm text-white font-medium">{value || "—"}</span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = "#E01E1E",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon size={15} style={{ color }} strokeWidth={1.8} />
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
        {label}
      </p>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  );
}

export default async function ClientProfilePage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const [measurements, nutritionProfile] = await Promise.all([
    getClientMeasurements(user.id),
    getNutritionProfile(user.id),
  ]);

  const latestMeasurement = measurements[0] ?? null;
  const today = new Date();
  const weekNumber = getISOWeek(today);

  const weeksSinceStart = profile?.start_date
    ? Math.floor(
        (today.getTime() -
          new Date(profile.start_date + "T12:00:00").getTime()) /
          (7 * 24 * 60 * 60 * 1000)
      )
    : null;

  const phaseLabel =
    nutritionProfile?.phase === "deficit"
      ? "Déficit calorique"
      : nutritionProfile?.phase === "surplus"
      ? "Surplus calorique"
      : nutritionProfile?.phase === "maintenance"
      ? "Maintenance"
      : null;

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto page-transition pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Mon espace
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Mon Profil
        </h1>
        <p className="mt-1 text-xs text-[#F5EDED]/30">
          Semaine {weekNumber}{weeksSinceStart != null ? ` · ${weeksSinceStart} sem. de coaching` : ""}
        </p>
      </div>

      {/* Stats rapides */}
      <section className="mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Stats rapides
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            icon={Scale}
            label="Poids actuel"
            value={
              latestMeasurement?.weight != null
                ? `${latestMeasurement.weight} kg`
                : profile?.weight_start != null
                ? `${profile.weight_start} kg`
                : "—"
            }
            color="#E01E1E"
          />
          <StatCard
            icon={Target}
            label="Poids de départ"
            value={profile?.weight_start != null ? `${profile.weight_start} kg` : "—"}
            color="#fbbf24"
          />
          <StatCard
            icon={Calendar}
            label="Semaines"
            value={weeksSinceStart != null ? `${weeksSinceStart}` : "—"}
            color="#60a5fa"
          />
          <StatCard
            icon={User}
            label="Phase"
            value={phaseLabel ?? "—"}
            color="#4ade80"
          />
        </div>
      </section>

      {/* Informations personnelles */}
      <section className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Informations personnelles
        </p>
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-5">
          <InfoRow label="Nom complet" value={profile?.full_name} />
          <InfoRow label="Email" value={profile?.email} />
          <InfoRow label="Téléphone" value={profile?.phone} />
          <InfoRow
            label="Statut"
            value={
              profile?.status === "active"
                ? "Actif"
                : profile?.status === "paused"
                ? "En pause"
                : "Terminé"
            }
          />
        </div>
      </section>

      {/* Suivi */}
      <section className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Suivi
        </p>
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl px-5">
          <InfoRow
            label="Date de début du coaching"
            value={
              profile?.start_date
                ? new Intl.DateTimeFormat("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(profile.start_date + "T12:00:00"))
                : null
            }
          />
          <InfoRow
            label="Semaine actuelle"
            value={
              weeksSinceStart != null
                ? `Semaine ${weekNumber} (${weeksSinceStart} sem. de coaching)`
                : `Semaine ${weekNumber}`
            }
          />
          <InfoRow
            label="Poids de départ"
            value={
              profile?.weight_start != null
                ? `${profile.weight_start} kg`
                : null
            }
          />
          <InfoRow
            label="Poids actuel"
            value={
              latestMeasurement?.weight != null
                ? `${latestMeasurement.weight} kg`
                : null
            }
          />
        </div>
      </section>

      {/* Objectif */}
      {profile?.goal && (
        <section className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Mon objectif
          </p>
          <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
            <p className="text-sm text-[#F5EDED]/75 leading-relaxed">
              {profile.goal}
            </p>
          </div>
        </section>
      )}

      {/* Edit form */}
      <section>
        <ClientProfileEditForm currentPhone={profile?.phone ?? null} />
      </section>
    </div>
  );
}
