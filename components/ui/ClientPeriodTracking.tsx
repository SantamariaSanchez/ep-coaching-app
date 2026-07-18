"use client";

import { useState } from "react";
import { Plus, Trash2, Droplet } from "lucide-react";
import type { PeriodLog, CycleStats } from "@/utils/period-tracking";

const inputClass =
  "w-full bg-[#150000] border border-[#890404]/30 focus:border-[#E01E1E]/60 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none transition-colors";
const labelClass = "block text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

const FLOW_LABELS: Record<string, string> = { leger: "Léger", moyen: "Moyen", abondant: "Abondant" };
const SYMPTOM_OPTIONS = ["Douleurs", "Fatigue", "Ballonnements", "Sautes d'humeur", "Fringales", "Migraines"];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#150000] border border-[#890404]/20 rounded-xl px-3 py-2.5 text-center">
      <p className="text-[8px] font-bold uppercase tracking-widest text-[#F5EDED]/30">{label}</p>
      <p className="text-sm font-black text-white mt-0.5">{value}</p>
    </div>
  );
}

export default function ClientPeriodTracking({
  clientId,
  logs: initialLogs,
  stats,
  addPeriodLog,
  deletePeriodLog,
}: {
  clientId: string;
  logs: PeriodLog[];
  stats: CycleStats;
  addPeriodLog: (
    clientId: string,
    data: { start_date: string; end_date: string | null; flow: string | null; symptoms: string[]; notes: string | null }
  ) => Promise<{ error?: string; id?: string }>;
  deletePeriodLog: (clientId: string, logId: string) => Promise<{ error?: string }>;
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [flow, setFlow] = useState<string>("");
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSymptom(s: string) {
    setSymptoms((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  async function handleAdd() {
    if (!startDate) {
      setError("Indique au moins la date de début.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addPeriodLog(clientId, {
      start_date: startDate,
      end_date: endDate || null,
      flow: flow || null,
      symptoms: [...symptoms],
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setLogs((prev) => [
      { id: res.id ?? `tmp-${Date.now()}`, client_id: clientId, start_date: startDate, end_date: endDate || null, flow: (flow || null) as PeriodLog["flow"], symptoms: [...symptoms], notes: notes.trim() || null, created_at: new Date().toISOString() },
      ...prev,
    ].sort((a, b) => b.start_date.localeCompare(a.start_date)));
    setStartDate("");
    setEndDate("");
    setFlow("");
    setSymptoms(new Set());
    setNotes("");
    setShowForm(false);
  }

  async function handleDelete(logId: string) {
    setLogs((prev) => prev.filter((l) => l.id !== logId));
    await deletePeriodLog(clientId, logId);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-[#F5EDED]/40 leading-relaxed">
        Suivi du cycle — utile pour comprendre les fluctuations d&apos;énergie, de poids d&apos;eau et de performance
        au fil du mois. Log le début de chaque cycle, la durée moyenne se calcule automatiquement.
      </p>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Cycle moyen" value={stats.avgCycleLength ? `${stats.avgCycleLength}j` : "—"} />
        <StatCard label="Règles (moy.)" value={stats.avgPeriodLength ? `${stats.avgPeriodLength}j` : "—"} />
        <StatCard
          label="Prochain cycle"
          value={
            stats.nextEstimated
              ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(stats.nextEstimated))
              : "—"
          }
        />
      </div>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1.5 border border-dashed border-[#890404]/30 hover:border-[#890404]/55 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
        >
          <Plus size={13} /> Logger un cycle
        </button>
      ) : (
        <div className="bg-[#1f0101] border border-[#890404]/30 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date de début</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Date de fin (optionnel)</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Flux</label>
            <div className="flex gap-1.5">
              {Object.entries(FLOW_LABELS).map(([key, l]) => (
                <button
                  key={key}
                  onClick={() => setFlow(flow === key ? "" : key)}
                  className={`flex-1 text-xs font-bold uppercase tracking-widest px-2 py-2 rounded-lg border transition-colors ${
                    flow === key ? "bg-[#E01E1E]/15 border-[#E01E1E]/50 text-white" : "border-[#890404]/25 text-[#F5EDED]/40"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Symptômes</label>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleSymptom(s)}
                  className={`px-2.5 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
                    symptoms.has(s) ? "bg-[#E01E1E] border-[#E01E1E] text-white" : "border-[#890404]/25 text-[#F5EDED]/45"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputClass} resize-none`} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)} className="flex-1 text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 border border-[#890404]/25 rounded-lg py-2.5">
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-lg py-2.5 transition-colors"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Droplet size={13} className="text-[#E01E1E] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">
                  {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(log.start_date))}
                  {log.end_date && ` → ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(log.end_date))}`}
                </p>
                {(log.flow || log.symptoms.length > 0) && (
                  <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
                    {log.flow ? FLOW_LABELS[log.flow] : ""}
                    {log.flow && log.symptoms.length > 0 ? " · " : ""}
                    {log.symptoms.join(", ")}
                  </p>
                )}
                {log.notes && <p className="text-[10px] text-[#F5EDED]/30 mt-0.5">{log.notes}</p>}
              </div>
            </div>
            <button onClick={() => handleDelete(log.id)} className="text-[#F5EDED]/20 hover:text-red-400 flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 text-center py-6">Aucun cycle loggé pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
