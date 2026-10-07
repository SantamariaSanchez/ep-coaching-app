"use client";

import { useT } from "@/components/i18n/I18nProvider";
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
  HeartPulse,
} from "lucide-react";
import type { SessionWithSets, PersonalRecord } from "@/utils/sessions";
import ExerciseProgressionChart from "@/components/ui/ExerciseProgressionChart";
import SessionHistoryCard from "@/components/ui/SessionHistoryCard";

interface Props {
  clientId: string;
  sessions: SessionWithSets[];
  records: PersonalRecord[];
  // Item 29 : blessures/problèmes de santé déclarés dans la fiche client,
  // affichés en contexte pendant que le coach lit les notes de séance —
  // pas de matching automatique "intelligent", juste les deux infos
  // rapprochées dans la même vue pour que le coach fasse le lien lui-même.
  declaredInjuries: string | null;
  declaredHealthIssues: string | null;
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

// ── Weekly Overview ───────────────────────────────────────────────────────────

function WeeklyOverview({ sessions }: { sessions: SessionWithSets[] }) {
  const t = useT();
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
          {t("7 derniers jours")}
        </p>
        {daysSinceLastSession != null && daysSinceLastSession > 2 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle size={12} className="text-red-400" />
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">
              {t("Absent depuis")}{" "}{daysSinceLastSession}j
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
            {t("Cette semaine")}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-white">{sessions.length}</p>
          <p className="text-[9px] text-[#F5EDED]/30 uppercase tracking-wider">
            {t("Total sessions")}
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
            {t("Dernière")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Quality Analysis ──────────────────────────────────────────────────────────

function QualityAnalysis({ sessions }: { sessions: SessionWithSets[] }) {
  const t = useT();
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
          {t("Les scores de standardisation apparaîtront ici")}
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
              {t("Technique à revoir")}
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
          {t("Score d'exécution moyen")}
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

// ── Main component ────────────────────────────────────────────────────────────

export default function CoachLogbookClient({ sessions, records, declaredInjuries, declaredHealthIssues }: Props) {
  const t = useT();
  const [activeTab, setActiveTab] = useState<"semaine" | "progression" | "qualite" | "historique">("semaine");

  const tabs = [
    { key: "semaine" as const, label: "Semaine" },
    { key: "progression" as const, label: "Progression" },
    { key: "qualite" as const, label: "Qualité" },
    { key: "historique" as const, label: "Historique" },
  ];

  return (
    <div>
      {/* Item 29 : rappel des blessures/problèmes de santé déclarés,
          visible en permanence pendant que le coach parcourt le logbook —
          reste discret quand rien n'est déclaré. */}
      {(declaredInjuries || declaredHealthIssues) && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-5">
          <HeartPulse size={14} className="text-red-300 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-200/90 leading-relaxed">
            {declaredInjuries && (
              <p>
                <span className="font-bold uppercase tracking-wider text-[10px] text-red-300">{t("Blessures déclarées :")}{" "}</span>
                {declaredInjuries}
              </p>
            )}
            {declaredHealthIssues && (
              <p className={declaredInjuries ? "mt-1" : undefined}>
                <span className="font-bold uppercase tracking-wider text-[10px] text-red-300">{t("Santé déclarée :")}{" "}</span>
                {declaredHealthIssues}
              </p>
            )}
          </div>
        </div>
      )}

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
            <SectionLabel>{t("Vue de la semaine")}</SectionLabel>
            <WeeklyOverview sessions={sessions} />
          </section>
        </div>
      )}

      {activeTab === "progression" && (
        <div className="space-y-6">
          <section>
            <SectionLabel>{t("Progression par exercice")}</SectionLabel>
            <ExerciseProgressionChart sessions={sessions} records={records} />
          </section>
        </div>
      )}

      {activeTab === "qualite" && (
        <div className="space-y-6">
          <section>
            <SectionLabel>{t("Analyse qualité")}</SectionLabel>
            <QualityAnalysis sessions={sessions} />
          </section>
        </div>
      )}

      {activeTab === "historique" && (
        <div className="space-y-4">
          <SectionLabel>{t("Historique des séances")}</SectionLabel>
          {sessions.length === 0 ? (
            <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-8 text-center">
              <Clock size={24} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#F5EDED]/40 font-semibold mb-1">
                {t("Aucune séance enregistrée")}
              </p>
              {/* Item 40 : évite de laisser croire à un problème (logbook
                  cassé, séance perdue) quand c'est juste que le client n'a
                  encore rien validé lui-même. */}
              <p className="text-xs text-[#F5EDED]/25 max-w-xs mx-auto leading-relaxed">
                {t("Se remplit automatiquement dès que le client valide une séance depuis son programme.")}
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
