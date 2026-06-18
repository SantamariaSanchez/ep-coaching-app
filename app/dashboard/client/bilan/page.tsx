export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getTodayLog, getClientDailyLogs, groupLogsByWeek } from "@/utils/daily-logs";
import DailyBilanForm from "@/components/ui/DailyBilanForm";

function fmt(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(dateStr + "T12:00:00")
  );
}

function fmtShort(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(dateStr + "T12:00:00")
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StressChip({ val }: { val: "low" | "medium" | "high" | null }) {
  if (!val) return <span style={{ color: "rgba(245,237,237,0.2)" }}>—</span>;
  const colors: Record<string, string> = {
    low: "#4ade80",
    medium: "#facc15",
    high: "#f87171",
  };
  const labels: Record<string, string> = { low: "Bas", medium: "Moyen", high: "Haut" };
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 99,
      background: colors[val] + "20",
      color: colors[val],
      border: `1px solid ${colors[val]}40`,
    }}>
      {labels[val]}
    </span>
  );
}

function AvgRow({ label, value, unit = "" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(137,4,4,0.08)" }}>
      <span style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: value !== null ? "#F5EDED" : "rgba(245,237,237,0.15)" }}>
        {value !== null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

function DayCard({ log }: { log: Awaited<ReturnType<typeof getClientDailyLogs>>[number] }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(137,4,4,0.12)",
      borderRadius: 10,
      padding: "10px 14px",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "6px 16px",
    }}>
      <div style={{ gridColumn: "1 / -1", marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>
          {capitalize(fmtShort(log.log_date))}
        </span>
        {log.training_name && (
          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{log.training_name}</span>
        )}
      </div>
      {log.weight_morning != null && <KV k="Poids" v={`${log.weight_morning} kg`} />}
      {log.steps != null && <KV k="Pas" v={log.steps.toLocaleString("fr-FR")} />}
      {log.sleep_hours != null && <KV k="Sommeil" v={`${log.sleep_hours}h`} />}
      {log.calories_kcal != null && <KV k="Kcal" v={`${log.calories_kcal}`} />}
      {log.proteins_g != null && <KV k="Prot" v={`${log.proteins_g}g`} />}
      {log.stress && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)" }}>Stress</span>
          <StressChip val={log.stress} />
        </div>
      )}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)" }}>{k}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{v}</span>
    </div>
  );
}

export default async function ClientBilanPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const today = new Date().toISOString().split("T")[0];
  const [todayLog, allLogs] = await Promise.all([
    getTodayLog(user.id),
    getClientDailyLogs(user.id, 42),
  ]);

  const weeks = groupLogsByWeek(allLogs);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#F5EDED", margin: 0 }}>
          Bilan du jour
        </h1>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: "4px 0 0", fontWeight: 600 }}>
          {capitalize(fmt(today))}
        </p>
      </div>

      {/* Form */}
      <div style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(137,4,4,0.2)",
        borderRadius: 16,
        padding: "20px 16px",
        marginBottom: 32,
      }}>
        <DailyBilanForm today={today} existing={todayLog} />
      </div>

      {/* Weekly history */}
      {weeks.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", marginBottom: 16 }}>
            Historique
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {weeks.map(({ weekStart, logs, averages }) => (
              <div key={weekStart}>
                {/* Week header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  borderBottom: "1px solid rgba(137,4,4,0.15)", paddingBottom: 8,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>
                    Semaine du {capitalize(fmtShort(weekStart))}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(245,237,237,0.2)", fontWeight: 600 }}>
                    {logs.length} jour{logs.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Averages */}
                <div style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(137,4,4,0.1)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  marginBottom: 10,
                }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(224,30,30,0.4)", margin: "0 0 8px" }}>
                    Moyennes
                  </p>
                  <AvgRow label="Poids" value={averages.weight} unit=" kg" />
                  <AvgRow label="Pas" value={averages.steps} />
                  <AvgRow label="Sommeil" value={averages.sleep_hours} unit="h" />
                  <AvgRow label="Qualité sommeil" value={averages.sleep_rating} unit="%" />
                  <AvgRow label="Kcal" value={averages.calories_kcal} unit=" kcal" />
                  <AvgRow label="Protéines" value={averages.proteins_g} unit="g" />
                  <AvgRow label="Glucides" value={averages.carbs_g} unit="g" />
                  <AvgRow label="Lipides" value={averages.fats_g} unit="g" />
                </div>

                {/* Day cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {logs.map((log) => <DayCard key={log.id} log={log} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
