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
      <div className="flex items-center justify-center py-10 bg-[#1f0101] border border-[#890404]/20 rounded-xl">
        <p className="text-xs text-[#F5EDED]/30 uppercase tracking-widest font-semibold">
          Aucun check-in enregistré
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#890404]/20">
      <table className="w-full text-left min-w-[560px]">
        <thead>
          <tr className="border-b border-[#890404]/20 bg-[#1f0101]">
            {["Semaine", "Poids", "Adhésion", "Pas/j", "Sommeil", "Ressenti"].map((h) => (
              <th key={h} className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-b border-[#890404]/10 last:border-0 bg-[#1a0101] hover:bg-[#1f0101] transition-colors">
              <td className="px-4 py-3 text-xs font-bold text-white">S{c.week_number}</td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.weight != null ? `${c.weight} kg` : "N/A"}
              </td>
              <td className="px-4 py-3 text-xs">
                {c.nutrition_adherence != null ? (
                  <span className={`font-bold ${c.nutrition_adherence >= 80 ? "text-green-400" : c.nutrition_adherence >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {c.nutrition_adherence}%
                  </span>
                ) : <span className="text-[#F5EDED]/30">N/A</span>}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.steps_per_day != null ? c.steps_per_day.toLocaleString("fr-FR") : "N/A"}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.sleep_hours != null ? `${c.sleep_hours}h` : "N/A"}
              </td>
              <td className="px-4 py-3 text-xs text-[#F5EDED]/70">
                {c.general_feeling != null ? `${c.general_feeling}/5 : ${FEELING_LABELS[c.general_feeling] ?? ""}` : "N/A"}
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
          color: "#F5EDED", margin: 0, lineHeight: 1.05,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <TrendingUp size={24} style={{ color: "#E01E1E" }} strokeWidth={2} />
          Progression
        </h1>
        <p style={{ marginTop: 6, fontSize: 12, color: "rgba(245,237,237,0.3)", fontWeight: 500 }}>
          {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
        </p>
      </div>

      <section className="mb-10">
        <ClientProgressCharts checkins={checkins} />
      </section>

      <section>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
          Historique check-ins
        </p>
        <CheckinsTable checkins={checkins} />
      </section>
    </div>
  );
}
