"use client";

import { useEffect, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine,
} from "recharts";
import {
  Moon, Activity, HeartPulse, Gauge, Thermometer, AlertTriangle, Info, CheckCircle2, Watch, Lock, Unlink, Check, Flame,
} from "lucide-react";
import type { BiometricLog, BiometricInsight } from "@/utils/biometrics";
import type { LogBiometricsInput } from "@/app/dashboard/client/tracking/actions";
import { todayInParis } from "@/lib/dates";

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

function avgOf(values: (number | null | undefined)[]): number | null {
  const v = values.filter((x): x is number => x != null);
  return v.length > 0 ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

// Nuits consécutives ≥ seuil en remontant depuis aujourd'hui — un jour sans
// log casse la série (contrairement à un simple filtre qui sauterait le
// trou en silence). Même méthode que les séries de pas (StepsClient).
function computeSleepStreak(logs: BiometricLog[], today: string, threshold = 7): number {
  if (logs.length === 0) return 0;
  const map = new Map(logs.map((l) => [l.log_date, l.sleep_hours]));
  const earliest = [...logs].map((l) => l.log_date).sort()[0];
  const cursor = new Date(earliest + "T12:00:00");
  const end = new Date(today + "T12:00:00");
  let run = 0;
  while (cursor.getTime() <= end.getTime()) {
    const iso = cursor.toISOString().split("T")[0];
    const v = map.get(iso);
    if (v != null && v >= threshold) run++;
    else run = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  return run;
}

// Cumul des écarts à 8h/nuit sur les N derniers jours logués — positif =
// dette à rattraper, négatif = surplus. Une seule mauvaise nuit isolée
// n'alarme personne, un déficit qui s'accumule sur la semaine si.
function computeSleepDebt(logs: BiometricLog[], days = 7, target = 8): number | null {
  const recent = logs.slice(-days).filter((l) => l.sleep_hours != null);
  if (recent.length === 0) return null;
  const debt = recent.reduce((sum, l) => sum + (target - (l.sleep_hours ?? 0)), 0);
  return Math.round(debt * 10) / 10;
}

// Moyenne mobile 7 jours en plus de la valeur brute — un jour isolé bas ou
// haut ne veut souvent rien dire, la tendance si. Rendue comme une ligne
// pleine lissée par-dessus les valeurs brutes en points épars.
function withRollingAverage(data: { date: string; value: number | null }[], window = 7) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1).map((x) => x.value).filter((v): v is number => v != null);
    const avg = slice.length > 0 ? Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 10) / 10 : null;
    return { ...d, avg };
  });
}

// Boutons +/- à côté du champ plutôt qu'un simple <input type="number"> nu —
// les flèches natives du navigateur sont minuscules et peu fiables au
// doigt sur mobile, or ces 4 champs se remplissent surtout au réveil,
// souvent d'une main. Même esprit que l'ajout rapide de pas (StepsClient).
function NumberField({ label, value, onChange, step = 1, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  placeholder?: string;
}) {
  function bump(delta: number) {
    const current = parseFloat(value) || 0;
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    onChange(String(next));
  }
  return (
    <div>
      <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1.5">{label}</label>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => bump(-step)}
          aria-label={`Diminuer ${label.toLowerCase()}`}
          className="w-8 h-8 flex-shrink-0 rounded-lg border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white hover:border-[#E01E1E]/50 transition-colors text-sm font-bold"
        >
          −
        </button>
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-2 py-2 text-sm text-white text-center placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
        />
        <button
          type="button"
          onClick={() => bump(step)}
          aria-label={`Augmenter ${label.toLowerCase()}`}
          className="w-8 h-8 flex-shrink-0 rounded-lg border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white hover:border-[#E01E1E]/50 transition-colors text-sm font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

function StatTile({ label, value, delta, deltaUnit = "" }: { label: string; value: string; delta?: number | null; deltaUnit?: string }) {
  const showDelta = delta != null && Math.abs(delta) >= 0.1;
  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3.5">
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", margin: "0 0 4px" }}>
        {label}
      </p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{value}</span>
        {showDelta && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,237,237,0.4)" }}>
            {delta! > 0 ? "↑" : "↓"} {Math.abs(delta!).toFixed(1)}{deltaUnit}
          </span>
        )}
      </div>
    </div>
  );
}

function MetricChart({ title, icon: Icon, data, unit, color, referenceBand, baseline }: {
  title: string;
  icon: React.ElementType;
  data: { date: string; value: number | null }[];
  unit: string;
  color: string;
  /** Zone cible affichée en fond (ex. 7-9h de sommeil) — purement indicative. */
  referenceBand?: [number, number];
  /** Moyenne longue période (30j) tracée en pointillés — "ta normale", pour
      voir d'un coup d'œil si aujourd'hui dévie, pas juste la tendance 7j. */
  baseline?: number | null;
}) {
  const hasData = data.some((d) => d.value != null);
  const chartData = withRollingAverage(data);
  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color }} />
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">{title}</p>
      </div>
      {hasData ? (
        <div style={{ height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(137,4,4,0.1)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDay} tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={TICK_STYLE} axisLine={false} tickLine={false} width={28} domain={["auto", "auto"]} />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v, name) => [`${v} ${unit}`, name === "avg" ? "Moyenne 7j" : "Valeur du jour"]}
              />
              {referenceBand && (
                <ReferenceArea y1={referenceBand[0]} y2={referenceBand[1]} fill={color} fillOpacity={0.07} strokeOpacity={0} />
              )}
              {baseline != null && (
                <ReferenceLine y={baseline} stroke="rgba(245,237,237,0.3)" strokeDasharray="3 3" strokeWidth={1} />
              )}
              <Line type="monotone" dataKey="value" stroke="none" dot={{ r: 2.5, fill: color, fillOpacity: 0.6 }} isAnimationActive={false} />
              <Line type="monotone" dataKey="avg" stroke={color} strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
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
  acknowledgeBiometricInsight,
  ouraConnected = false,
  canConnectOura = true,
  ouraConfigured = true,
  isCoachView = false,
  disconnectOura,
  ouraStatus,
}: {
  logs: BiometricLog[];
  insights: BiometricInsight[];
  readOnly?: boolean;
  logBiometrics?: (input: LogBiometricsInput) => Promise<{ error?: string }>;
  acknowledgeBiometricInsight?: (insightId: string) => Promise<{ error?: string }>;
  /** Une bague Oura est déjà connectée pour cet utilisateur */
  ouraConnected?: boolean;
  /** false = membre gratuit, pas de bague offerte, pas de connexion possible */
  canConnectOura?: boolean;
  /** false = OURA_CLIENT_ID/SECRET pas configurées côté serveur — pas la peine de proposer un bouton qui mène dans un mur */
  ouraConfigured?: boolean;
  /** true = le coach regarde son propre suivi, on peut lui montrer le detail technique du blocage */
  isCoachView?: boolean;
  disconnectOura?: () => Promise<{ error?: string }>;
  /** ?oura=... au retour de /api/oura/connect ou /callback */
  ouraStatus?: string;
}) {
  // MASTERCLASS.md Axe L : new Date().toISOString() rend la date en UTC,
  // pas celle de Paris — entre minuit et 1h/2h du matin, todayLog matchait
  // encore la ligne biometric_logs de LA VEILLE (déjà complète), et toute
  // saisie manuelle dans cette fenêtre écrasait silencieusement le vrai
  // sommeil/readiness d'hier au lieu de créer la ligne du jour qui vient de
  // commencer. Voir lib/dates.ts.
  const today = todayInParis();
  const todayLog = logs.find((l) => l.log_date === today) ?? null;

  const [sleepHours, setSleepHours] = useState(todayLog?.sleep_hours?.toString() ?? "");
  const [readiness, setReadiness] = useState(todayLog?.readiness_score?.toString() ?? "");
  const [hrv, setHrv] = useState(todayLog?.hrv_ms?.toString() ?? "");
  const [restingHr, setRestingHr] = useState(todayLog?.resting_hr?.toString() ?? "");

  // MASTERCLASS.md Axe E (même piège que todayLogs dans ClientNutritionView) :
  // ces 4 champs venaient de todayLog (dérivé du prop logs) mais ne se
  // resynchronisaient jamais sur un nouveau logs après le premier rendu —
  // une valeur saisie manuellement, ou synchronisée depuis Oura côté
  // serveur, pouvait rester affichée à l'ancienne après un rechargement.
  useEffect(() => {
    setSleepHours(todayLog?.sleep_hours?.toString() ?? "");
    setReadiness(todayLog?.readiness_score?.toString() ?? "");
    setHrv(todayLog?.hrv_ms?.toString() ?? "");
    setRestingHr(todayLog?.resting_hr?.toString() ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- todayLog est recalculé chaque rendu depuis logs/today, la vraie dépendance stable est logs
  }, [logs]);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  // MASTERCLASS.md Axe B : handleSave affichait "Enregistré" même quand
  // logBiometrics échouait côté serveur.
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleDisconnect() {
    if (!disconnectOura) return;
    setDisconnecting(true);
    await disconnectOura();
    setDisconnecting(false);
  }

  async function handleSave() {
    if (!logBiometrics) return;
    setSaving(true);
    const res = await logBiometrics({
      logDate: today,
      sleepHours: sleepHours ? parseFloat(sleepHours) : null,
      readinessScore: readiness ? parseInt(readiness) : null,
      hrvMs: hrv ? parseInt(hrv) : null,
      restingHr: restingHr ? parseInt(restingHr) : null,
    });
    setSaving(false);
    if (res.error) {
      setSaveError(res.error);
      return;
    }
    setSaveError(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAcknowledge(insightId: string) {
    if (!acknowledgeBiometricInsight) return;
    setDismissedIds((prev) => new Set(prev).add(insightId));
    const res = await acknowledgeBiometricInsight(insightId);
    // MASTERCLASS.md Axe B (repasse 2026-09-10) : la suppression optimiste
    // n'était jamais annulée en cas d'échec serveur — l'insight disparaissait
    // de la vue pour de bon (côté client) même si l'action avait échoué.
    if (res.error) {
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.delete(insightId);
        return next;
      });
    }
  }

  const sleepData = logs.map((l) => ({ date: l.log_date, value: l.sleep_hours }));
  const readinessData = logs.map((l) => ({ date: l.log_date, value: l.readiness_score }));
  const hrvData = logs.map((l) => ({ date: l.log_date, value: l.hrv_ms }));
  const rhrData = logs.map((l) => ({ date: l.log_date, value: l.resting_hr }));
  const tempData = logs.map((l) => ({ date: l.log_date, value: l.body_temp_deviation }));
  const hasTemperatureData = tempData.some((d) => d.value != null);

  const last7 = logs.slice(-7);
  const prev7 = logs.slice(-14, -7);
  const avgSleep7 = avgOf(last7.map((l) => l.sleep_hours));
  const avgSleepPrev7 = avgOf(prev7.map((l) => l.sleep_hours));
  const avgReadiness7 = avgOf(last7.map((l) => l.readiness_score));
  const avgReadinessPrev7 = avgOf(prev7.map((l) => l.readiness_score));
  const sleepStreak = computeSleepStreak(logs, today);
  const sleepDebt7 = computeSleepDebt(logs, 7);
  const hasWeekStats = logs.length > 0;

  // "Normale" longue période (30j, tout l'historique chargé) — sert de
  // ligne de référence sur les graphiques HRV/FC repos/récupération, pour
  // voir d'un coup d'œil si le chiffre du jour dévie de l'habituel du
  // client, pas seulement s'il monte ou descend sur 7 jours.
  const hrvBaseline = avgOf(logs.map((l) => l.hrv_ms));
  const rhrBaseline = avgOf(logs.map((l) => l.resting_hr));
  const readinessBaseline = avgOf(logs.map((l) => l.readiness_score));

  const visibleInsights = insights.filter((i) => !i.acknowledged && !dismissedIds.has(i.id));

  const ouraStatusMessage =
    ouraStatus === "not_configured"
      ? isCoachView
        ? "Connexion Oura pas encore activée : il manque OURA_CLIENT_ID / OURA_CLIENT_SECRET dans les variables d'environnement Vercel (voir cloud.ouraring.com/oauth/applications)."
        : "La connexion à ta bague Oura n'est pas encore activée sur l'app. Ton coach est prévenu, réessaie un peu plus tard."
      : ouraStatus === "error"
      ? "La connexion à Oura a échoué. Réessaie, et si ça persiste, préviens ton coach."
      : ouraStatus === "locked"
      ? "La bague Oura est réservée aux membres en coaching."
      : null;

  return (
    <div className="space-y-5">
      {/* Retour explicite après /api/oura/connect — avant, en cas d'échec
          (le cas le plus probable : clé API pas encore configurée), la
          page se contentait de rester la même sans rien dire. */}
      {ouraStatusMessage && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-400 leading-relaxed">{ouraStatusMessage}</p>
        </div>
      )}
      {ouraConnected ? (
        <div className="bg-[#150000] border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <Watch size={15} className="text-green-400 flex-shrink-0" />
          <p className="text-[11px] text-[#F5EDED]/60 leading-relaxed flex-1">
            Bague Oura connectée : sommeil, récupération, HRV et FC repos se remplissent automatiquement chaque matin.
          </p>
          {!readOnly && disconnectOura && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors flex-shrink-0"
            >
              <Unlink size={11} />
              {disconnecting ? "…" : "Déconnecter"}
            </button>
          )}
        </div>
      ) : readOnly ? (
        // Vue coach : jamais de lien de connexion (agirait sur le compte du
        // coach, pas celui du client) — juste l'information.
        <div className="bg-[#150000] border border-[#890404]/20 rounded-xl px-4 py-3 flex items-center gap-2.5">
          <Watch size={15} className="text-[#F5EDED]/25 flex-shrink-0" />
          <p className="text-[11px] text-[#F5EDED]/40 leading-relaxed">
            Pas de bague Oura connectée pour ce client, les données ci-dessous sont saisies à la main.
          </p>
        </div>
      ) : canConnectOura && ouraConfigured ? (
        <a
          href="/api/oura/connect"
          className="flex items-center gap-2.5 bg-[#150000] border border-[#890404]/20 hover:border-[#E01E1E]/40 rounded-xl px-4 py-3 transition-colors"
        >
          <Watch size={15} className="text-[#E01E1E] flex-shrink-0" />
          <span className="text-[11px] text-[#F5EDED]/45 leading-relaxed flex-1">
            Connecte ta bague <strong className="text-[#F5EDED]">Oura Ring</strong> : ouvre l&apos;app Oura, connecte-toi, et
            valide l&apos;accès. C&apos;est tout, aucune donnée à recopier.
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] flex-shrink-0">
            Connecter →
          </span>
        </a>
      ) : canConnectOura && !ouraConfigured ? (
        <div className="bg-[#150000] border border-[#890404]/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Watch size={15} className="text-[#F5EDED]/30 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#F5EDED]/45 leading-relaxed">
            {isCoachView
              ? "Connexion Oura Ring bientôt disponible. Il reste une clé d'application à configurer côté serveur (voir message ci-dessus)."
              : "Connexion Oura Ring bientôt disponible ici. En attendant, log tes données à la main ci-dessous."}
          </p>
        </div>
      ) : (
        <div className="bg-[#150000] border border-[#890404]/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Lock size={15} className="text-[#F5EDED]/30 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#F5EDED]/45 leading-relaxed">
            La bague Oura Ring est offerte aux membres en coaching. Passe en coaching payant pour la recevoir et connecter automatiquement tes données ici. En attendant, log tes données à la main ci-dessous.
          </p>
        </div>
      )}

      {!readOnly && logBiometrics && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Données du jour
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <NumberField label="Sommeil (h)" value={sleepHours} onChange={setSleepHours} step={0.25} placeholder="7.5" />
            <NumberField label="Récupération (0-100)" value={readiness} onChange={setReadiness} step={1} placeholder="80" />
            <NumberField label="HRV (ms)" value={hrv} onChange={setHrv} step={1} placeholder="55" />
            <NumberField label="FC repos (bpm)" value={restingHr} onChange={setRestingHr} step={1} placeholder="58" />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
          >
            {saving ? "Analyse…" : saved ? <><CheckCircle2 size={13} /> Enregistré</> : "Enregistrer & analyser"}
          </button>
          {saveError && (
            <p className="flex items-center gap-1.5 text-[11px] text-red-400 mt-2">
              <AlertTriangle size={12} /> {saveError}
            </p>
          )}
        </div>
      )}

      {hasWeekStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile
            label="Sommeil moy. (7j)"
            value={avgSleep7 != null ? `${avgSleep7.toFixed(1)}h` : "N/A"}
            delta={avgSleep7 != null && avgSleepPrev7 != null ? avgSleep7 - avgSleepPrev7 : null}
            deltaUnit="h"
          />
          <StatTile
            label="Récup. moy. (7j)"
            value={avgReadiness7 != null ? `${Math.round(avgReadiness7)}` : "N/A"}
            delta={avgReadiness7 != null && avgReadinessPrev7 != null ? avgReadiness7 - avgReadinessPrev7 : null}
          />
          <StatTile
            label="Dette sommeil (7j)"
            value={sleepDebt7 != null ? `${sleepDebt7 > 0 ? "+" : ""}${sleepDebt7}h` : "N/A"}
          />
          <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3.5">
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", margin: "0 0 4px" }}>
              Nuits ≥ 7h
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED" }}>{sleepStreak}</span>
              {sleepStreak > 0 && <Flame size={13} className="text-[#E01E1E]" />}
            </div>
          </div>
        </div>
      )}

      {visibleInsights.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-2">
            Suggestions d&apos;ajustement
          </p>
          <div className="space-y-2">
            {visibleInsights.map((insight) => {
              const s = SEVERITY_STYLES[insight.severity];
              const Icon = s.icon;
              return (
                <div key={insight.id} className={`${s.bg} border ${s.border} rounded-xl p-4`}>
                  <div className="flex items-start gap-2.5">
                    <Icon size={15} className={`${s.color} flex-shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white">{insight.message}</p>
                      <p className="text-xs text-[#F5EDED]/60 mt-1">{insight.suggestion}</p>
                      <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">{formatDay(insight.log_date)}</p>
                    </div>
                    {!readOnly && acknowledgeBiometricInsight && (
                      <button
                        onClick={() => handleAcknowledge(insight.id)}
                        title="Marquer comme vu" aria-label="Marquer comme vu"
                        className="flex-shrink-0 text-[#F5EDED]/25 hover:text-white transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-[10px] text-[#F5EDED]/25" style={{ marginBottom: -8 }}>
        Ligne pointillée = ta moyenne sur toute la période chargée, pour repérer un écart au premier coup d&apos;œil.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <MetricChart title="Sommeil" icon={Moon} data={sleepData} unit="h" color="#818cf8" referenceBand={[7, 9]} />
        <MetricChart title="Récupération" icon={Gauge} data={readinessData} unit="" color="#4ade80" baseline={readinessBaseline} />
        <MetricChart title="HRV" icon={Activity} data={hrvData} unit="ms" color="#E01E1E" baseline={hrvBaseline} />
        <MetricChart title="FC au repos" icon={HeartPulse} data={rhrData} unit="bpm" color="#fbbf24" baseline={rhrBaseline} />
        {hasTemperatureData && (
          <MetricChart title="Écart de température" icon={Thermometer} data={tempData} unit="°C" color="#fb923c" />
        )}
      </div>
    </div>
  );
}
