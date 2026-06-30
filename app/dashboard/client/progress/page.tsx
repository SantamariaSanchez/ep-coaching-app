import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/utils/auth";
import { getClientCheckins } from "@/utils/checkins";
import ClientProgressCharts from "@/components/ui/ClientProgressCharts";
import { TrendingUp } from "lucide-react";
import type { CheckIn } from "@/utils/checkins";

const FEELING_LABELS: Record<number, string> = {
  1: "Épuisé", 2: "Fatigué", 3: "Correct", 4: "Bien", 5: "Au top",
};

function CheckinsTable({ checkins }: { checkins: CheckIn[] }) {
  const rows = checkins.slice(0, 12);
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl">
        <p className="text-xs text-[var(--color-ep-light)]/30 uppercase tracking-widest font-semibold">
          Aucun check-in enregistré
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-ep-dark-red)]/20">
      <table className="w-full text-left min-w-[560px]">
        <thead>
          <tr className="border-b border-[var(--color-ep-dark-red)]/20 bg-[var(--color-ep-card)]">
            {["Semaine", "Poids", "Adhésion", "Pas/j", "Sommeil", "Ressenti"].map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-[var(--color-ep-dark-red)]/10 last:border-0 bg-[var(--color-ep-card)] hover:bg-[var(--color-ep-card)] transition-colors">
              <td className="px-4 py-3 text-xs font-bold text-white">S{c.week_number}</td>
              <td className="px-4 py-3 text-xs text-[var(--color-ep-light)]/70">
                {c.weight != null ? `${c.weight} kg` : "—"}
              </td>
              <td className="px-4 py-3 text-xs">
                {c.nutrition_adherence != null ? (
                  <span className={`font-bold ${c.nutrition_adherence >= 80 ? "text-green-400" : c.nutrition_adherence >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {c.nutrition_adherence}%
                  </span>
                ) : <span className="text-[var(--color-ep-light)]/30">—</span>}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--color-ep-light)]/70">
                {c.steps_per_day != null ? c.steps_per_day.toLocaleString("fr-FR") : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--color-ep-light)]/70">
                {c.sleep_hours != null ? `${c.sleep_hours}h` : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-[var(--color-ep-light)]/70">
                {c.general_feeling != null ? `${c.general_feeling}/5 — ${FEELING_LABELS[c.general_feeling] ?? ""}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ClientProgressPage() {
  const user = await getUser();
  if (!user) redirect("/");

  const profile = await getProfile(user.id);
  if (profile?.role === "coach") redirect("/dashboard/coach");

  const checkins = await getClientCheckins(user.id);

  return (
    <div className="page-transition" style={{ padding: "32px 20px 100px", maxWidth: 800, margin: "0 auto" }}>
      <div className="animate-fade-up" style={{ marginBottom: 28 }}>
        <p className="ep-section-title" style={{ marginBottom: 4 }}>Historique</p>
        <h1 style={{
          fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em",
          color: "var(--color-ep-light)", margin: 0, lineHeight: 1.05,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <TrendingUp size={24} style={{ color: "var(--color-ep-red)" }} strokeWidth={2} />
          Progression
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.3)", fontWeight: 500 }}>
          {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
        </p>
      </div>

      <section className="mb-10">
        <ClientProgressCharts checkins={checkins} />
      </section>

      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-3">
          Historique check-ins
        </p>
        <CheckinsTable checkins={checkins} />
      </section>
    </div>
  );
}
