"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dumbbell,
  Clock,
  Zap,
  ChevronRight,
  Calendar,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { ProgramWithDays } from "@/utils/programs";
import type { Session, SessionWithSets, PersonalRecord } from "@/utils/sessions";
import { Play } from "lucide-react";
import TrainingSubNav from "@/components/ui/TrainingSubNav";
import ExerciseProgressionChart from "@/components/ui/ExerciseProgressionChart";

interface Props {
  program: ProgramWithDays | null;
  sessions: SessionWithSets[];
  records: PersonalRecord[];
  isFree?: boolean;
  subNavScope?: "client" | "coach-moi";
  activeSession?: Session | null;
}

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
  sessionBasePath,
}: {
  dayLabel: string;
  programId: string;
  muscleGroups: string[];
  lastSession: Session | null;
  sessionBasePath: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setStartError(null);
    try {
      const res = await fetch("/api/client/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayLabel, programId, muscleGroups }),
      });
      const json = await res.json();
      const sessionId: string | undefined = json.sessionId;
      if (!sessionId) {
        setStartError(json.error ?? "Impossible de démarrer la séance. Réessaie.");
        setLoading(false);
        return;
      }
      router.push(`${sessionBasePath}/session/${sessionId}`);
    } catch {
      setStartError("Impossible de démarrer — vérifie ta connexion.");
      setLoading(false);
    }
  }

  return (
    <div>
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
    {startError && (
      <p className="text-xs text-red-400 mt-1.5 px-1">{startError}</p>
    )}
    </div>
  );
}

function FreeSessionButton({ sessionBasePath }: { sessionBasePath: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setStartError(null);
    try {
      const res = await fetch("/api/client/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayLabel: "Séance libre", muscleGroups: [] }),
      });
      const json = await res.json();
      const sessionId: string | undefined = json.sessionId;
      if (!sessionId) {
        setStartError(json.error ?? "Impossible de démarrer la séance. Réessaie.");
        setLoading(false);
        return;
      }
      router.push(`${sessionBasePath}/session/${sessionId}`);
    } catch {
      setStartError("Impossible de démarrer — vérifie ta connexion.");
      setLoading(false);
    }
  }

  return (
    <div>
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
      {startError && (
        <p className="text-xs text-red-400 mt-1.5 px-1">{startError}</p>
      )}
    </div>
  );
}

// ── Import depuis Hevy / Strong ──────────────────────────────────────────────

interface ImportSuccess {
  ok: true;
  sessionsImported: number;
  setsImported: number;
  sessionsSkipped: number;
  source: string;
  programCreated: boolean;
}

function ImportLogbookButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportSuccess | { ok: false; error: string } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImporting(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/client/import-logbook", {
        method: "POST",
        body: formData,
      });

      let json: Record<string, unknown> | null = null;
      try {
        json = await res.json();
      } catch {
        // Réponse non-JSON (erreur de plateforme, timeout, payload trop gros) —
        // pas de quoi planter silencieusement, on affiche le statut HTTP.
        setResult({ ok: false, error: `Import impossible (erreur ${res.status}). Réessaie dans un instant.` });
        return;
      }

      if (!res.ok) {
        setResult({ ok: false, error: (json?.error as string) ?? `Import impossible (erreur ${res.status}).` });
      } else {
        setResult({ ok: true, ...(json as Omit<ImportSuccess, "ok">) });
        router.refresh();
      }
    } catch (e) {
      console.error("Import logbook fetch error:", e);
      setResult({ ok: false, error: "Import impossible — vérifie ta connexion." });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="mb-8">
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={importing}
        className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/60 rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors disabled:opacity-50"
      >
        {importing ? (
          <div className="w-4 h-4 border-2 border-[#F5EDED]/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Upload size={14} strokeWidth={1.8} />
        )}
        Importer mon historique (Hevy / Strong)
      </button>

      {result && result.ok && (
        <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mt-2.5">
          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-400">
            {result.sessionsImported} séance{result.sessionsImported !== 1 ? "s" : ""} importée
            {result.sessionsImported !== 1 ? "s" : ""} ({result.setsImported} sets) depuis{" "}
            {result.source === "hevy" ? "Hevy" : "Strong"}.
            {result.sessionsSkipped > 0 &&
              ` ${result.sessionsSkipped} déjà importée${result.sessionsSkipped !== 1 ? "s" : ""}, ignorée${result.sessionsSkipped !== 1 ? "s" : ""}.`}
            {result.programCreated && (
              <>
                {" "}Ton programme a été reconstruit à partir de ton historique —{" "}
                <Link href="/dashboard/client/program" className="underline font-bold">
                  va le voir
                </Link>.
              </>
            )}
          </p>
        </div>
      )}
      {result && !result.ok && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mt-2.5">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{result.error}</p>
        </div>
      )}
    </div>
  );
}
export default function LogbookClient({ program, sessions, records, isFree, subNavScope = "client", activeSession }: Props) {
  const router = useRouter();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sessionBasePath =
    subNavScope === "coach-moi" ? "/dashboard/coach/moi/logbook" : "/dashboard/client/logbook";

  // Redirect immédiat si une séance active est détectée en localStorage —
  // contourne le Router Cache Next.js qui peut servir une version périmée du
  // logbook sans le banner server-side.
  useEffect(() => {
    const id = localStorage.getItem("ep-active-session-id");
    if (id) {
      router.replace(`${sessionBasePath}/session/${id}`);
    }
  }, [sessionBasePath, router]);

  // Map day_label → last session
  const lastSessionByDay: Record<string, Session> = {};
  for (const s of sessions) {
    if (!(s.day_label in lastSessionByDay)) {
      lastSessionByDay[s.day_label] = s;
    }
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto pb-24 md:pb-8 page-transition">
      <TrainingSubNav scope={subNavScope} />

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          Logbook
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          Entraînement
        </h1>
      </div>

      <ImportLogbookButton />

      {/* ── Séance en cours ── */}
      {activeSession && (
        <Link
          href={`${sessionBasePath}/session/${activeSession.id}`}
          className="flex items-center gap-4 bg-[#E01E1E] rounded-2xl px-5 py-4 mb-6 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
            <Play size={18} className="text-white fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">
              Séance en cours
            </p>
            <p className="text-sm font-black text-white truncate">
              {activeSession.day_label}
            </p>
            {activeSession.muscle_groups && activeSession.muscle_groups.length > 0 && (
              <p className="text-[10px] text-white/60 truncate">
                {activeSession.muscle_groups.join(" · ")}
              </p>
            )}
          </div>
          <ChevronRight size={20} className="text-white/70 flex-shrink-0" />
        </Link>
      )}

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
                sessionBasePath={sessionBasePath}
              />
            );
          })}

          {(!program || program.days.length === 0) && (
            <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl px-5 py-4 mb-2">
              <p className="text-xs text-[#F5EDED]/40">
                {isFree
                  ? "Aucun programme actif — crée ton programme ou démarre une séance libre."
                  : "Aucun programme actif — démarre une séance libre ou contacte ton coach."}
              </p>
            </div>
          )}

          <FreeSessionButton sessionBasePath={sessionBasePath} />
        </div>
      </section>

      {/* ── Mes dernières séances ── */}
      {sessions.length > 0 && (
        <section className="mb-8">
          <SectionLabel>Mes dernières séances</SectionLabel>
          <div className="space-y-2">
            {sessions.map((s) => {
              const totalSets = s.sets.length;
              return (
                <Link
                  key={s.id}
                  href={`${sessionBasePath}/session/${s.id}`}
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
                      {totalSets > 0 && ` · ${totalSets} set${totalSets > 1 ? "s" : ""}`}
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

      {/* ── Mes performances ── */}
      <section>
        <SectionLabel>Mes performances</SectionLabel>
        <ExerciseProgressionChart sessions={sessions} records={records} />
      </section>
    </div>
  );
}
