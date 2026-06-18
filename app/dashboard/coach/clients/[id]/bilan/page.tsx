export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientDailyLogs, groupLogsByWeek } from "@/utils/daily-logs";
import type { DailyLog } from "@/utils/daily-logs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmt(dateStr: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", {
    weekday: "short", day: "numeric", month: "short",
  }).format(new Date(dateStr + "T12:00:00")));
}

function fmtLong(dateStr: string) {
  return capitalize(new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(dateStr + "T12:00:00")));
}

const lbl = {
  fontSize: 9, fontWeight: 800 as const, letterSpacing: "0.1em",
  textTransform: "uppercase" as const, color: "rgba(245,237,237,0.25)", margin: "0 0 3px",
};

const val = {
  fontSize: 13, fontWeight: 700 as const, color: "#F5EDED", margin: 0,
};

function StressChip({ v }: { v: "low" | "medium" | "high" | null }) {
  if (!v) return <span style={{ color: "rgba(245,237,237,0.15)" }}>—</span>;
  const colors: Record<string, string> = { low: "#4ade80", medium: "#facc15", high: "#f87171" };
  const labels: Record<string, string> = { low: "Bas", medium: "Moyen", high: "Haut" };
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 99,
      background: colors[v] + "20", color: colors[v], border: `1px solid ${colors[v]}40`,
    }}>
      {labels[v]}
    </span>
  );
}

function Avg({ label, value, unit = "" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(137,4,4,0.07)" }}>
      <span style={{ fontSize: 10, color: "rgba(245,237,237,0.3)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 800, color: value !== null ? "#F5EDED" : "rgba(245,237,237,0.12)" }}>
        {value !== null ? `${value}${unit}` : "—"}
      </span>
    </div>
  );
}

function DayRow({ log }: { log: DailyLog }) {
  const stress = log.stress as "low" | "medium" | "high" | null;
  return (
    <div style={{
      background: "rgba(0,0,0,0.2)",
      border: "1px solid rgba(137,4,4,0.1)",
      borderRadius: 10,
      padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)" }}>
          {fmt(log.log_date)}
        </span>
        {log.training_name && (
          <span style={{ fontSize: 11, fontWeight: 700, color: "#F5EDED" }}>{log.training_name}</span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px 14px" }}>
        {log.weight_morning != null && (
          <div>
            <p style={lbl}>Poids</p>
            <p style={val}>{log.weight_morning} kg</p>
          </div>
        )}
        {log.steps != null && (
          <div>
            <p style={lbl}>Pas</p>
            <p style={val}>{log.steps.toLocaleString("fr-FR")}</p>
          </div>
        )}
        {log.sleep_hours != null && (
          <div>
            <p style={lbl}>Sommeil</p>
            <p style={val}>{log.sleep_hours}h {log.sleep_rating != null ? `(${log.sleep_rating}%)` : ""}</p>
          </div>
        )}
        {log.calories_kcal != null && (
          <div>
            <p style={lbl}>Kcal</p>
            <p style={val}>{log.calories_kcal}</p>
          </div>
        )}
        {log.proteins_g != null && (
          <div>
            <p style={lbl}>Prot</p>
            <p style={val}>{log.proteins_g}g</p>
          </div>
        )}
        {log.carbs_g != null && (
          <div>
            <p style={lbl}>Gluc</p>
            <p style={val}>{log.carbs_g}g</p>
          </div>
        )}
        {log.fats_g != null && (
          <div>
            <p style={lbl}>Lip</p>
            <p style={val}>{log.fats_g}g</p>
          </div>
        )}
        {log.training_rating != null && (
          <div>
            <p style={lbl}>Séance</p>
            <p style={val}>{log.training_rating}/10</p>
          </div>
        )}
        {log.cardio && (
          <div>
            <p style={lbl}>Cardio</p>
            <p style={val}>{log.cardio}</p>
          </div>
        )}
        {stress && (
          <div>
            <p style={lbl}>Stress</p>
            <StressChip v={stress} />
          </div>
        )}
        {log.digestion && (
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={lbl}>Digestion</p>
            <p style={val}>{log.digestion}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function CoachClientBilanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: coachProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (coachProfile?.role !== "coach") redirect("/dashboard/client");

  const admin = createAdminClient();
  const { data: clientProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .single();

  if (!clientProfile) redirect("/dashboard/coach/clients");

  const logs = await getClientDailyLogs(id, 56);
  const weeks = groupLogsByWeek(logs);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href={`/dashboard/coach/clients/${id}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "rgba(245,237,237,0.3)", textDecoration: "none", marginBottom: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          <ArrowLeft size={13} /> Retour
        </Link>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(224,30,30,0.5)", margin: "0 0 4px" }}>
          Bilans quotidiens
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em", color: "#F5EDED", margin: 0 }}>
          {clientProfile.full_name ?? "Client"}
        </h1>
      </div>

      {weeks.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(137,4,4,0.12)",
          borderRadius: 14, padding: "48px 20px", textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: "rgba(245,237,237,0.25)", margin: 0 }}>Aucun bilan quotidien pour ce client.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {weeks.map(({ weekStart, logs: wLogs, averages }) => (
            <div key={weekStart}>
              {/* Week header */}
              <div style={{
                display: "flex", alignItems: "baseline", gap: 10,
                borderBottom: "1px solid rgba(137,4,4,0.15)", paddingBottom: 10, marginBottom: 14,
              }}>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#F5EDED" }}>
                  Semaine du {fmtLong(weekStart)}
                </span>
                <span style={{ fontSize: 10, color: "rgba(245,237,237,0.2)", fontWeight: 600 }}>
                  {wLogs.length} jour{wLogs.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Averages card */}
              <div style={{
                background: "rgba(224,30,30,0.04)",
                border: "1px solid rgba(137,4,4,0.15)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 12,
              }}>
                <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(224,30,30,0.4)", margin: "0 0 10px" }}>
                  Moyennes de la semaine
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
                  <div>
                    <Avg label="Poids" value={averages.weight} unit=" kg" />
                    <Avg label="Pas/jour" value={averages.steps} />
                    <Avg label="Sommeil" value={averages.sleep_hours} unit="h" />
                    <Avg label="Qualité sommeil" value={averages.sleep_rating} unit="%" />
                  </div>
                  <div>
                    <Avg label="Kcal" value={averages.calories_kcal} unit=" kcal" />
                    <Avg label="Protéines" value={averages.proteins_g} unit="g" />
                    <Avg label="Glucides" value={averages.carbs_g} unit="g" />
                    <Avg label="Lipides" value={averages.fats_g} unit="g" />
                  </div>
                </div>
              </div>

              {/* Day rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {wLogs.map((log) => <DayRow key={log.id} log={log} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
