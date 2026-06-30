export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getClientDailyLogs, groupLogsByWeek } from "@/utils/daily-logs";
import { TrendingUp, Download } from "lucide-react";
import Link from "next/link";

function capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }
function fmtShort(d: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d + "T12:00:00")));
}

function StatCard({ label, value, unit = "" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.12)", borderRadius: 10, padding: "12px 14px" }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(var(--color-ep-light-rgb),0.3)", margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 900, color: value !== null ? "var(--color-ep-light)" : "rgba(var(--color-ep-light-rgb),0.15)", margin: 0, letterSpacing: "-0.02em" }}>
        {value !== null ? `${value}${unit}` : "—"}
      </p>
    </div>
  );
}

export default async function CoachProgressionPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/coach");

  const { data: profile } = await supabase.from("profiles").select("role, id").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const logs = await getClientDailyLogs(user.id, 84);
  const weeks = groupLogsByWeek(logs);

  // Global averages across all data
  const allWeights = logs.map(l => l.weight_morning).filter((v): v is number => v !== null);
  const allSteps = logs.map(l => l.steps).filter((v): v is number => v !== null);
  const allSleep = logs.map(l => l.sleep_hours).filter((v): v is number => v !== null);
  const allKcal = logs.map(l => l.calories_kcal).filter((v): v is number => v !== null);
  const avg = (arr: number[]) => arr.length ? parseFloat((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : null;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>

      <div style={{ marginBottom: 28, paddingTop: 8, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <TrendingUp size={20} style={{ color: "var(--color-ep-red)" }} />
            <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "var(--color-ep-light)", margin: 0 }}>
              Ma progression
            </h1>
          </div>
          <p style={{ fontSize: 12, color: "rgba(var(--color-ep-light-rgb),0.3)", margin: 0 }}>{logs.length} jours enregistrés</p>
        </div>
        {logs.length > 0 && (
          <Link
            href={`/api/export/daily-logs/${user.id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
              color: "var(--color-ep-light)", textDecoration: "none",
              background: "rgba(var(--color-ep-dark-red-rgb),0.2)", border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.3)",
              borderRadius: 8, padding: "7px 12px",
            }}
          >
            <Download size={12} /> Export CSV
          </Link>
        )}
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 20px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.1)", borderRadius: 14 }}>
          <p style={{ color: "rgba(var(--color-ep-light-rgb),0.25)", fontSize: 13, margin: 0 }}>
            Commence à remplir ton bilan quotidien pour voir ta progression ici.
          </p>
          <Link href="/dashboard/coach/moi/bilan" style={{ display: "inline-block", marginTop: 16, fontSize: 11, fontWeight: 800, color: "var(--color-ep-red)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            → Remplir mon bilan du jour
          </Link>
        </div>
      ) : (
        <>
          {/* Global averages */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.5)", marginBottom: 12 }}>
              Moyennes globales ({logs.length} jours)
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <StatCard label="Poids moyen" value={avg(allWeights)} unit=" kg" />
              <StatCard label="Pas/jour" value={avg(allSteps)} />
              <StatCard label="Sommeil" value={avg(allSleep)} unit="h" />
              <StatCard label="Kcal/jour" value={avg(allKcal)} unit=" kcal" />
            </div>
          </div>

          {/* Weekly breakdown */}
          <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(var(--color-ep-red-rgb),0.5)", marginBottom: 12 }}>
            Par semaine
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {weeks.map(({ weekStart, logs: wLogs, averages }) => (
              <div key={weekStart} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(var(--color-ep-dark-red-rgb),0.12)", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "var(--color-ep-light)" }}>Sem. du {fmtShort(weekStart)}</span>
                  <span style={{ fontSize: 9, color: "rgba(var(--color-ep-light-rgb),0.2)", fontWeight: 600 }}>{wLogs.length}j</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px 0" }}>
                  {[
                    { k: "Poids", v: averages.weight, u: " kg" },
                    { k: "Pas", v: averages.steps, u: "" },
                    { k: "Sommeil", v: averages.sleep_hours, u: "h" },
                    { k: "Kcal", v: averages.calories_kcal, u: "" },
                    { k: "Prot.", v: averages.proteins_g, u: "g" },
                    { k: "Gluc.", v: averages.carbs_g, u: "g" },
                    { k: "Lip.", v: averages.fats_g, u: "g" },
                    { k: "Sommeil %", v: averages.sleep_rating, u: "%" },
                  ].map(({ k, v, u }) => (
                    <div key={k}>
                      <p style={{ fontSize: 8, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--color-ep-light-rgb),0.2)", margin: "0 0 2px" }}>{k}</p>
                      <p style={{ fontSize: 12, fontWeight: 800, color: v !== null ? "var(--color-ep-light)" : "rgba(var(--color-ep-light-rgb),0.12)", margin: 0 }}>
                        {v !== null ? `${v}${u}` : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
