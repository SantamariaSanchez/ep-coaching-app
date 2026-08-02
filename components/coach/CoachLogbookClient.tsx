"use client";

import { useState } from "react";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { SessionWithSets, PersonalRecord } from "@/utils/sessions";
import ExerciseProgressionChart from "@/components/ui/ExerciseProgressionChart";

interface Props {
  clientId: string;
  sessions: SessionWithSets[];
  records: PersonalRecord[];
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "#1f0101",
    border: "1px solid rgba(137,4,4,0.4)",
    borderRadius: "8px",
    color: "#F5EDED",
    fontSize: "11px",
  },
  labelStyle: { color: "rgba(245,237,237,0.6)", fontSize: "10px" },
};

const TICK_STYLE = { fill: "rgba(245,237,237,0.35)", fontSize: 9 };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
      {children}
    </p>
  );
}

function FeelingDots({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-[#F5EDED]/25">···</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < value ? "bg-[#E01E1E]" : "bg-[#F5EDED]/15"
          }`}
        />
      ))}
    </div>
  );
}

// ── Weekly Overview ───────────────────────────────────────────────────────────

function WeeklyOverview({ sessions }: { sessions: SessionWithSets[] }) {
  const today = new Date();
  const weekStart = new Date(today);
  const dow = today.getDay();
  weekStart.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));

  const recentSessions = sessions.filter((s) => {
    const d = new Date(s.session_date + "T12:00:00");
    return d >= weekStart;
  });

  // Last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const session = sessions.find((s) => s.session_date === dateStr);
    return { date: d, dateStr, session };
  });

  const lastSession = sessions[0];
  const daysSinceLastSession = lastSession
    ? Math.floor(
        (today.getTime() -
          new Date(lastSession.session_date + "T12:00:00").getTime()) /
          (24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
          7 derniers jours
        </p>
        {daysSinceLastSession != null && daysSinceLastSession > 2 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
              Absent depuis {daysSinceLastSession}j
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-4">
        {days.map(({ date, session }, i) => {
          const dayLabel = ["L", "M", "M", "J", "V", "S", "D"][
            (date.getDay() + 6) % 7
          ];
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[8px] text-[#F5EDED]/30 uppercase">
                {dayLabel}
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  session
                    ? "bg-[#E01E1E]/20 border border-[#E01E1E]/30"
                    : "bg-[#890404]/10 border border-[#890404]/15"
                }`}
              >
                {session ? (
                  <CheckCircle2 size={14} className="text-[#E01E1E]" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F5EDED]/15" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-2xl font-black text-white">
            {recentSessions.length}
          </p>
          <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">
            Cette semaine
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">{sessions.length}</p>
          <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">
            Total sessions
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">
            {lastSession
              ? new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "short",
                }).format(
                  new Date(lastSession.session_date + "T12:00:00")
                )
              : "···"}
          </p>
          <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">
            Dernière
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Quality Analysis ──────────────────────────────────────────────────────────

function QualityAnalysis({ sessions }: { sessions: SessionWithSets[] }) {
  // Build average score per exercise over last ~28 days
  const scoreByExercise: Record<string, number[]> = {};
  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.standardization_score != null) {
        const key = set.exercise_name;
        if (!scoreByExercise[key]) scoreByExercise[key] = [];
        scoreByExercise[key].push(set.standardization_score);
      }
    }
  }

  const avgScores = Object.entries(scoreByExercise).map(([name, scores]) => ({
    name: name.slice(0, 10),
    fullName: name,
    score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
  })).sort((a, b) => a.score - b.score);

  if (avgScores.length === 0) {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-8 text-center">
        <p className="text-sm text-[#F5EDED]/40">
          Les scores de standardisation apparaîtront ici
        </p>
      </div>
    );
  }

  const toReview = avgScores.filter((e) => e.score < 3);

  return (
    <div className="space-y-4">
      {toReview.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={13} className="text-amber-400" />
            <p className="text-xs font-black uppercase tracking-widest text-amber-400">
              Technique à revoir
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {toReview.map((e, i) => (
              <span
                key={i}
                className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20"
              >
                {e.fullName} ({e.score}/5)
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">
          Score d&apos;exécution moyen
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={avgScores} layout="vertical">
              <XAxis
                type="number"
                domain={[0, 5]}
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v) => [`${v}/5`, "Score moy."]}
                labelFormatter={(label) =>
                  avgScores.find((e) => e.name === label)?.fullName ?? label
                }
              />
              <Bar dataKey="score" radius={[0, 3, 3, 0]}>
                {avgScores.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.score < 3
                        ? "#ef4444"
                        : entry.score < 4
                        ? "#fbbf24"
                        : "#4ade80"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Session History ───────────────────────────────────────────────────────────

function SessionHistoryCard({ session }: { session: SessionWithSets }) {
  const [expanded, setExpanded] = useState(false);

  // Group sets by exercise
  const byExercise: Record<string, typeof session.sets> = {};
  for (const set of session.sets) {
    if (!byExercise[set.exercise_name]) byExercise[set.exercise_name] = [];
    byExercise[set.exercise_name].push(set);
  }

  const totalSets = session.sets.length;
  const prCount = session.sets.filter((s) => s.is_pr).length;

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#890404]/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white truncate">
              {session.day_label}
            </p>
            {prCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">
                🏆 {prCount} PR
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "long",
            }).format(
              new Date(session.session_date + "T12:00:00")
            )}
            {session.duration_minutes != null &&
              ` · ${session.duration_minutes} min`}
            {` · ${totalSets} sets`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {session.general_feeling != null && (
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < (session.general_feeling ?? 0)
                        ? "bg-[#E01E1E]"
                        : "bg-[#F5EDED]/15"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[8px] text-[#F5EDED]/25 uppercase tracking-wider">
                feeling
              </span>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-[#F5EDED]/30" />
          ) : (
            <ChevronDown size={14} className="text-[#F5EDED]/30" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#890404]/15 px-4 py-3 space-y-3">
          {/* Feeling row */}
          {(session.general_feeling || session.energy_level || session.pump) && (
            <div className="flex gap-4">
              {session.general_feeling != null && (
                <div>
                  <p className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider mb-0.5">Feeling</p>
                  <FeelingDots value={session.general_feeling} />
                </div>
              )}
              {session.energy_level != null && (
                <div>
                  <p className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider mb-0.5">Énergie</p>
                  <FeelingDots value={session.energy_level} />
                </div>
              )}
              {session.pump != null && (
                <div>
                  <p className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider mb-0.5">Pump</p>
                  <FeelingDots value={session.pump} />
                </div>
              )}
            </div>
          )}

          {session.notes && (
            <p className="text-xs text-[#F5EDED]/50 italic leading-relaxed">
              {session.notes}
            </p>
          )}

          {/* Exercises */}
          {Object.entries(byExercise).map(([name, sets]) => (
            <div key={name}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5">
                {name}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sets.map((s, i) => (
                  <span
                    key={i}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      s.is_pr
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                        : "bg-[#890404]/10 text-[#F5EDED]/60 border-[#890404]/20"
                    }`}
                  >
                    {s.weight_kg != null ? `${s.weight_kg}kg` : "···"}
                    {" × "}
                    {s.reps_actual ?? "···"}
                    {s.rir_actual != null && ` RIR${s.rir_actual}`}
                    {s.is_pr && " 🏆"}
                    {s.video_url && (
                      <a
                        href={s.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="ml-1.5 text-[#E01E1E]"
                        title="Voir la vidéo du set"
                      >
                        🎥
                      </a>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CoachLogbookClient({ sessions, records }: Props) {
  const [activeTab, setActiveTab] = useState<"semaine" | "progression" | "qualite" | "historique">("semaine");

  const tabs = [
    { key: "semaine" as const, label: "Semaine" },
    { key: "progression" as const, label: "Progression" },
    { key: "qualite" as const, label: "Qualité" },
    { key: "historique" as const, label: "Historique" },
  ];

  return (
    <div>
      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x", overscrollBehavior: "contain" }}
      >
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-shrink-0 whitespace-nowrap px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px ${
              activeTab === key
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "semaine" && (
        <div className="space-y-6">
          <section>
            <SectionLabel>Vue de la semaine</SectionLabel>
            <WeeklyOverview sessions={sessions} />
          </section>
        </div>
      )}

      {activeTab === "progression" && (
        <div className="space-y-6">
          <section>
            <SectionLabel>Progression par exercice</SectionLabel>
            <ExerciseProgressionChart sessions={sessions} records={records} />
          </section>
        </div>
      )}

      {activeTab === "qualite" && (
        <div className="space-y-6">
          <section>
            <SectionLabel>Analyse qualité</SectionLabel>
            <QualityAnalysis sessions={sessions} />
          </section>
        </div>
      )}

      {activeTab === "historique" && (
        <div className="space-y-4">
          <SectionLabel>Historique des séances</SectionLabel>
          {sessions.length === 0 ? (
            <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-8 text-center">
              <Clock size={24} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#F5EDED]/40">
                Aucune séance enregistrée
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <SessionHistoryCard key={s.id} session={s} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
