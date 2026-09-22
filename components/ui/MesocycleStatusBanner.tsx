import { computeMesocycleStatus } from "@/lib/mesocycle";

// Axe FM (MASTERCLASS.md) : le coach configure un mésocycle (durée +
// date de départ) dans ProgramEditor, mais le client n'en voyait jusqu'ici
// rien — pas de "semaine 3 sur 5", pas de signal que la semaine en cours
// est une décharge programmée plutôt qu'un simple ressenti de fatigue.
// Purement informatif, jamais bloquant, cohérent avec le reste de la page.
export default function MesocycleStatusBanner({
  startDate,
  weeks,
}: {
  startDate: string | null | undefined;
  weeks: number | null | undefined;
}) {
  if (!startDate || !weeks) return null;
  const status = computeMesocycleStatus(startDate, weeks);

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4"
      style={{
        background: status.isOverdue || status.isDeloadWeek ? "rgba(245,158,11,0.08)" : "rgba(137,4,4,0.08)",
        border: `1px solid ${status.isOverdue || status.isDeloadWeek ? "rgba(245,158,11,0.25)" : "rgba(137,4,4,0.2)"}`,
      }}
    >
      <p
        className="text-xs font-bold"
        style={{ color: status.isOverdue || status.isDeloadWeek ? "#fbbf24" : "rgba(245,237,237,0.55)" }}
      >
        {status.isOverdue
          ? "Bloc terminé — ton coach va bientôt en démarrer un nouveau."
          : status.isDeloadWeek
          ? `Semaine ${status.currentWeek}/${status.totalWeeks} de ton bloc · semaine de décharge, volume réduit`
          : `Semaine ${status.currentWeek}/${status.totalWeeks} de ton bloc`}
      </p>
    </div>
  );
}
