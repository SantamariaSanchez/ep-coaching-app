export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { getTodayLog, getClientDailyLogs, groupLogsByWeek } from "@/utils/daily-logs";
import DailyBilanForm from "@/components/ui/DailyBilanForm";
import { upsertCoachDailyLog } from "./actions";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmt(d: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(d + "T12:00:00")));
}
function fmtShort(d: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(new Date(d + "T12:00:00")));
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.25)" }}>{k}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{v}</span>
    </div>
  );
}

function AvgRow({ label, value, unit = "" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(137,4,4,0.08)" }}>
      <span style={{ fontSize: 10, color: "rgba(245,237,237,0.35)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: value !== null ? "#F5EDED" : "rgba(245,237,237,0.15)" }}>
        {value !== null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

export default async function CoachMonBilanPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "coach") redirect("/dashboard/client");

  const today = new Date().toISOString().split("T")[0];
  const [todayLog, allLogs] = await Promise.all([
    getTodayLog(user.id),
    getClientDailyLogs(user.id, 56),
  ]);
  const weeks = groupLogsByWeek(allLogs);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px 80px" }}>

      <div style={{ marginBottom: 24, paddingTop: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#F5EDED", margin: 0 }}>
          Mon bilan du jour
        </h1>
        <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: "4px 0 0", fontWeight: 600 }}>
          {fmt(today)}
        </p>
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(137,4,4,0.2)", borderRadius: 16, padding: "20px 16px", marginBottom: 32 }}>
        <DailyBilanForm today={today} existing={todayLog} action={upsertCoachDailyLog} />
      </div>

      {weeks.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(245,237,237,0.3)", marginBottom: 16 }}>
            Mon historique
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {weeks.map(({ weekStart, logs, averages }) => (
              <div key={weekStart}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderBottom: "1px solid rgba(137,4,4,0.15)", paddingBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>
                    Semaine du {fmtShort(weekStart)}
                  </span>
                  <span style={{ fontSize: 9, color: "rgba(245,237,237,0.2)", fontWeight: 600 }}>{logs.length} jour{logs.length > 1 ? "s" : ""}</span>
                </div>
                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(137,4,4,0.1)", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
                  <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(224,30,30,0.4)", margin: "0 0 8px" }}>Moyennes</p>
                  <AvgRow label="Poids" value={averages.weight} unit=" kg" />
                  <AvgRow label="Pas" value={averages.steps} />
                  <AvgRow label="Sommeil" value={averages.sleep_hours} unit="h" />
                  <AvgRow label="Qualité" value={averages.sleep_rating} unit="%" />
                  <AvgRow label="Kcal" value={averages.calories_kcal} unit=" kcal" />
                  <AvgRow label="Protéines" value={averages.proteins_g} unit="g" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {logs.map((log) => (
                    <div key={log.id} style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(137,4,4,0.12)", borderRadius: 10, padding: "10px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>{fmtShort(log.log_date)}</span>
                        {log.training_name && <span style={{ fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{log.training_name}</span>}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 12px" }}>
                        {log.weight_morning != null && <KV k="Poids" v={`${log.weight_morning} kg`} />}
                        {log.steps != null && <KV k="Pas" v={log.steps.toLocaleString("fr-FR")} />}
                        {log.sleep_hours != null && <KV k="Sommeil" v={`${log.sleep_hours}h`} />}
                        {log.calories_kcal != null && <KV k="Kcal" v={String(log.calories_kcal)} />}
                        {log.proteins_g != null && <KV k="Prot" v={`${log.proteins_g}g`} />}
                        {log.training_rating != null && <KV k="Séance" v={`${log.training_rating}/10`} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
