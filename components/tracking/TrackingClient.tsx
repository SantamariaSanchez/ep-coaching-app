"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Moon, Activity, HeartPulse, Gauge, AlertTriangle, Info, CheckCircle2, Watch,
} from "lucide-react";
import type { BiometricLog, BiometricInsight } from "@/utils/biometrics";
import type { LogBiometricsInput } from "@/app/dashboard/client/tracking/actions";

const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: "#1f0101", border: "1px solid rgba(137,4,4,0.4)", borderRadius: 8, color: "#F5EDED", fontSize: 11 },
  labelStyle: { color: "rgba(245,237,237,0.6)", fontSize: 10 },
};
const TICK_STYLE = { fill: "rgba(245,237,237,0.35)", fontSize: 9 };

const SEVERITY_STYLES = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  critical: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/25" },
} as const;

function formatDay(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(dateStr + "T12:00:00"));
}

function MetricChart({ title, icon: Icon, data, dataKey, unit, color }: {
  title: string;
  icon: React.ElementType;
  data: { date: string; value: number | null }[];
  dataKey: string;
  unit: string;
  color: string;
}) {
  const hasData = data.some((d) => d.value != null);
  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">{title}</p>
      </div>
      {hasData ? (
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(137,4,4,0.1)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={28} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} ${unit}`, ""]} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-xs text-[#F5EDED]/25 italic py-8 text-center">Pas encore de données.</p>
      )}
    </div>
  );
}

export default function TrackingClient({
  logs,
  insights,
  readOnly = false,
  logBiometrics,
}: {
  logs: BiometricLog[];
  insights: BiometricInsight[];
  readOnly?: boolean;
  logBiometrics?: (input: LogBiometricsInput) => Promise<{ error?: string }>;
}) {
  const today = new Date().toISOString().split("T")[0];
  const todayLog = logs.find((l) => l.log_date === today) ?? null;

  const [sleepHours, setSleepHours] = useState(todayLog?.sleep_hours?.toString() ?? "");
  const [readiness, setReadiness] = useState(todayLog?.readiness_score?.toString() ?? "");
  const [hrv, setHrv] = useState(todayLog?.hrv_ms?.toString() ?? "");
  const [restingHr, setRestingHr] = useState(todayLog?.resting_hr?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!logBiometrics) return;
    setSaving(true);
    await logBiometrics({
      logDate: today,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      readinessScore: readiness ? parseInt(readiness) : null,
      hrvMs: hrv ? parseInt(hrv) : null,
      restingHr: restingHr ? parseInt(restingHr) : null,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const sleepData = logs.map((l) => ({ date: l.log_date, value: l.sleep_hours }));
  const readinessData = logs.map((l) => ({ date: l.log_date, value: l.readiness_score }));
  const hrvData = logs.map((l) => ({ date: l.log_date, value: l.hrv_ms }));
  const rhrData = logs.map((l) => ({ date: l.log_date, value: l.resting_hr }));

  return (
    <div className="space-y-5">
      <div className="bg-[#150000] border border-[#890404]/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <Watch size={15} className="text-[#E01E1E] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#F5EDED]/45 leading-relaxed">
          Connexion Oura Ring à venir. En attendant, log tes données chaque jour. Dès qu&apos;une vraie
          décision d&apos;ajustement ressort de tes données, tu reçois une notification.
        </p>
      </div>

      {!readOnly && logBiometrics && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Données du jour
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">Sommeil (h)</label>
              <input type="number" step="0.1" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="7.5"
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50" />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">Récupération (0-100)</label>
              <input type="number" value={readiness} onChange={(e) => setReadiness(e.target.value)} placeholder="80"
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50" />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">HRV (ms)</label>
              <input type="number" value={hrv} onChange={(e) => setHrv(e.target.value)} placeholder="55"
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50" />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">FC repos (bpm)</label>
              <input type="number" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} placeholder="58"
                className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50" />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Analyse…" : saved ? <><CheckCircle2 size={13} /> Enregistré</> : "Enregistrer & analyser"}
          </button>
        </div>
      )}

      {insights.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Suggestions d&apos;ajustement
          </p>
          <div className="space-y-2">
            {insights.map((insight) => {
              const s = SEVERITY_STYLES[insight.severity];
              const Icon = s.icon;
              return (
                <div key={insight.id} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
                  <div className="flex items-start gap-2.5">
                    <Icon size={15} className={`${s.color} flex-shrink-0 mt-0.5`} />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{insight.message}</p>
                      <p className="text-xs text-[#F5EDED]/60 mt-1">{insight.suggestion}</p>
                      <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">{formatDay(insight.log_date)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <MetricChart title="Sommeil" icon={Moon} data={sleepData} dataKey="value" unit="h" color="#818cf8" />
        <MetricChart title="Récupération" icon={Gauge} data={readinessData} dataKey="value" unit="" color="#4ade80" />
        <MetricChart title="HRV" icon={Activity} data={hrvData} dataKey="value" unit="ms" color="#E01E1E" />
        <MetricChart title="FC au repos" icon={HeartPulse} data={rhrData} dataKey="value" unit="bpm" color="#fbbf24" />
      </div>
    </div>
  );
}
