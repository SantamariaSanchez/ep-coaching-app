"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dumbbell,
  Clock,
  Zap,
  Trophy,
  ChevronRight,
  Star,
  Calendar,
  Plus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { ProgramWithDays } from "@/utils/programs";
import type { Session, PersonalRecord } from "@/utils/sessions";
import TrainingSubNav from "@/components/ui/TrainingSubNav";

interface Props {
  program: ProgramWithDays | null;
  sessions: Session[];
  records: PersonalRecord[];
  prMap: Record<string, number>;
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
  if (value == null) return <span className="text-[#F5EDED]/25">—</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i < value ? "bg-[#E01E1E]" : "bg-[#F5EDED]/15"
          }`}
        />
      ))}
    </div>
  );
}

function StartSessionButton({
  dayLabel,
  programId,
  muscleGroups,
  lastSession,
}: {
  dayLabel: string;
  programId: string;
  muscleGroups: string[];
  lastSession: Session | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/client/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayLabel, programId, muscleGroups }),
      });
      const json = await res.json();
      const sessionId: string | undefined = json.sessionId;
      if (!sessionId) {
        console.error("Erreur création session:", json.error ?? "id manquant");
        setLoading(false);
        return;
      }
      router.push(`/dashboard/client/logbook/session/${sessionId}`);
    } catch (e) {
      console.error("Erreur création session:", e);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="w-full flex items-center gap-3 bg-[#1f0101] border border-[#890404]/25 hover:border-[#E01E1E]/50 rounded-xl px-4 py-4 transition-all group disabled:opacity-50 text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-[#E01E1E]/10 border border-[#E01E1E]/20 flex items-center justify-center flex-shrink-0">
        <Dumbbell size={18} className="text-[#E01E1E]" strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-white">{dayLabel}</p>
        {muscleGroups.length > 0 && (
          <p className="text-[10px] text-[#F5EDED]/40 truncate">
            {muscleGroups.join(" · ")}
          </p>
        )}
        {lastSession && (
          <p className="text-[9px] text-[#F5EDED]/25 mt-0.5">
            Dernier passage :{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              day: "numeric",
              month: "short",
            }).format(new Date(lastSession.session_date + "T12:00:00"))}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="w-4 h-4 border-2 border-[#E01E1E] border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] opacity-0 group-hover:opacity-100 transition-opacity">
              Démarrer
            </span>
            <ChevronRight
              size={14}
              className="text-[#F5EDED]/25 group-hover:text-[#E01E1E] transition-colors"
            />
          </>
        )}
      </div>
    </button>
  );
}

function FreeSessionButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setLoading(true);
    try {
      const res = await fetch("/api/client/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayLabel: "Séance libre", muscleGroups: [] }),
      });
      const json = await res.json();
      const sessionId: string | undefined = json.sessionId;
      if (!sessionId) {
        console.error("Erreur création session libre:", json.error ?? "id manquant");
        setLoading(false);
        return;
      }
      router.push(`/dashboard/client/logbook/session/${sessionId}`);
    } catch (e) {
      console.error("Erreur création session libre:", e);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleStart}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/60 rounded-xl px-4 py-3.5 text-sm text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors disabled:opacity-50"
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-[#F5EDED]/40 border-t-transparent rounded-full animate-spin" />
      ) : (
        <Plus size={15} strokeWidth={1.8} />
      )}
      Séance libre
    </button>
  );
}

// Records chart — grouped by exercise
function RecordsSection({
  records,
  prMap,
}: {
  records: PersonalRecord[];
  prMap: Record<string, number>;
}) {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Get unique exercises from records
  const exercises = [...new Set(records.map((r) => r.exercise_name))];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  if (exercises.length === 0) {
    return (
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-8 text-center">
        <Trophy size={28} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-sm text-[#F5EDED]/40">
          Tes records personnels apparaîtront ici après ta première séance
        </p>
      </div>
    );
  }

  const current = selectedExercise ?? exercises[0];
  const exerciseRecords = records
    .filter((r) => r.exercise_name === current)
    .sort((a, b) => a.achieved_at.localeCompare(b.achieved_at));

  const bestWeight = prMap[current.toLowerCase()] ?? null;
  const latestPR = records.find((r) => r.exercise_name === current);
  const isRecentPR =
    latestPR && new Date(latestPR.achieved_at) > sevenDaysAgo;

  const chartData = exerciseRecords.map((r) => ({
    date: new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
    }).format(new Date(r.achieved_at + "T12:00:00")),
    poids: r.weight_kg,
  }));

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
      {/* Exercise selector */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {exercises.map((ex) => {
          const hasRecentPR =
            !!records.find(
              (r) =>
                r.exercise_name === ex &&
                new Date(r.achieved_at) > sevenDaysAgo
            );
          return (
            <button
              key={ex}
              onClick={() => setSelectedExercise(ex)}
              className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                current === ex
                  ? "bg-[#E01E1E]/15 text-[#E01E1E] border-[#E01E1E]/30"
                  : "text-[#F5EDED]/40 border-[#890404]/20 hover:border-[#890404]/40"
              }`}
            >
              {ex}
              {hasRecentPR && (
                <Star size={9} fill="#fbbf24" className="text-amber-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Best weight */}
      <div className="flex items-center gap-3 mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-0.5">
            Record personnel
          </p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-white">
              {bestWeight != null ? bestWeight : "—"}
              {bestWeight != null && (
                <span className="text-sm font-normal text-[#F5EDED]/40 ml-1">
                  kg
                </span>
              )}
            </p>
            {isRecentPR && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 animate-pulse">
                🏆 Nouveau PR
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(137,4,4,0.15)"
              />
              <XAxis dataKey="date" tick={TICK_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                tick={TICK_STYLE}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v) => [`${v} kg`, "Charge"]} />
              <Line
                type="monotone"
                dataKey="poids"
                stroke="#E01E1E"
                strokeWidth={2}
                dot={{ fill: "#E01E1E", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function LogbookClient({ program, sessions, records, prMap }: Props) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Map day_label → last session
  const lastSessionByDay: Record<string, Session> = {};
  for (const s of sessions) {
    if (!(s.day_label in lastSessionByDay)) {
      lastSessionByDay[s.day_label] = s;
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <TrainingSubNav />

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Logbook
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Entraînement
        </h1>
      </div>

      {/* ── Démarrer une séance ── */}
      <section className="mb-8">
        <SectionLabel>Démarrer une séance</SectionLabel>
        <div className="space-y-2">
          {program?.days.map((day) => {
            const muscleGroups = [
              ...new Set(
                day.exercises
                  .map((e) => e.muscle_group)
                  .filter(Boolean) as string[]
              ),
            ];
            const lastSession = lastSessionByDay[day.day_label] ?? null;
            return (
              <StartSessionButton
                key={day.id}
                dayLabel={day.day_label}
                programId={program.id}
                muscleGroups={muscleGroups}
                lastSession={lastSession}
              />
            );
          })}

          {(!program || program.days.length === 0) && (
            <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-4 mb-2">
              <p className="text-xs text-[#F5EDED]/40">
                Aucun programme actif — démarre une séance libre ou contacte
                ton coach.
              </p>
            </div>
          )}

          <FreeSessionButton />
        </div>
      </section>

      {/* ── Mes dernières séances ── */}
      {sessions.length > 0 && (
        <section className="mb-8">
          <SectionLabel>Mes dernières séances</SectionLabel>
          <div className="space-y-2">
            {sessions.map((s) => {
              const totalSets = 0; // would require joining with sets
              return (
                <Link
                  key={s.id}
                  href={`/dashboard/client/logbook/session/${s.id}`}
                  className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 hover:border-[#890404]/40 rounded-xl px-4 py-3.5 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
                    <Calendar size={15} className="text-[#890404]" strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">
                      {s.day_label}
                    </p>
                    <p className="text-[10px] text-[#F5EDED]/35">
                      {new Intl.DateTimeFormat("fr-FR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }).format(new Date(s.session_date + "T12:00:00"))}
                      {s.duration_minutes != null &&
                        ` · ${s.duration_minutes} min`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.general_feeling != null && (
                      <div className="flex flex-col items-end gap-0.5">
                        <FeelingDots value={s.general_feeling} />
                        <span className="text-[8px] text-[#F5EDED]/25 uppercase tracking-wider">
                          feeling
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      {s.energy_level != null && (
                        <div className="flex flex-col items-center gap-0.5">
                          <Zap size={11} className="text-amber-400" />
                          <span className="text-[9px] font-black text-amber-400">
                            {s.energy_level}
                          </span>
                        </div>
                      )}
                      {s.pump != null && (
                        <div className="flex flex-col items-center gap-0.5">
                          <Clock size={11} className="text-[#60a5fa]" />
                          <span className="text-[9px] font-black text-[#60a5fa]">
                            {s.pump}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-[#F5EDED]/25 group-hover:text-[#F5EDED]/50 transition-colors"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Mes records ── */}
      <section>
        <SectionLabel>Mes records</SectionLabel>
        <RecordsSection records={records} prMap={prMap} />
      </section>
    </div>
  );
}
