"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Dumbbell,
  ChevronRight,
  Plus,
  Upload,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useStartSession } from "@/hooks/useStartSession";
import type { ProgramWithDays } from "@/utils/programs";
import type { Session, SessionWithSets, PersonalRecord } from "@/utils/sessions";
import type { CheckIn } from "@/utils/checkins";
import { Play } from "lucide-react";
import ExerciseProgressionChart from "@/components/ui/ExerciseProgressionChart";
import HighlightsStrip from "@/components/ui/HighlightsStrip";
import ClientProgressCharts from "@/components/ui/ClientProgressCharts";
import SessionHistoryCard from "@/components/ui/SessionHistoryCard";

interface Props {
  program: ProgramWithDays | null;
  sessions: SessionWithSets[];
  records: PersonalRecord[];
  isFree?: boolean;
  subNavScope?: "client" | "coach-moi";
  activeSession?: Session | null;
  /** Poids/adherence issus des check-ins — fusionne l'ancienne page Progression ici */
  checkins?: CheckIn[];
  /** Limite de séances chargées par la page (10 par défaut, plus avec ?historique=tout). */
  historyLimit?: number;
  /** true quand la page a chargé tout l'historique (?historique=tout). */
  showingAllHistory?: boolean;
  /** L'historique complet a été demandé mais n'a pas pu être lu. */
  historyError?: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
      {children}
    </p>
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
  const t = useT();
  const { start, loading, error: startError } = useStartSession(sessionBasePath);

  function handleStart() {
    start({ dayLabel, programId, muscleGroups });
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
            {t("Dernier passage :")}{" "}
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
              {t("Démarrer")}
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
  const t = useT();
  const [asking, setAsking] = useState(false);
  const [dayLabel, setDayLabel] = useState("");
  const { start, loading, error: startError } = useStartSession(sessionBasePath);

  function handleStart() {
    // Le texte tapé sert aussi à cibler l'échauffement (voir
    // detectWarmupTypes dans lib/warmup-data.ts) — d'où l'intérêt de
    // demander "dos triceps" plutôt que de figer "Séance libre".
    start({ dayLabel: dayLabel.trim() || "Séance libre", muscleGroups: [] });
  }

  if (asking) {
    return (
      <div className="border border-dashed border-[#890404]/30 rounded-xl px-4 py-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">
          {t("Quelle séance veux-tu faire ?")}
        </p>
        <div className="flex gap-2">
          <input
            autoFocus
            value={dayLabel}
            onChange={(e) => setDayLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleStart(); } }}
            placeholder={t("Ex. Dos triceps quad")} aria-label={t("Nom de la séance")}
            className="flex-1 bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50"
          />
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-4 rounded-lg bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors"
          >
            {loading ? "…" : t("Démarrer")}
          </button>
        </div>
        <p className="text-[9px] text-[#F5EDED]/25 mt-2">
          {t("Sert à proposer un échauffement adapté, modifiable ensuite si besoin.")}
        </p>
        {startError && (
          <p className="text-xs text-red-400 mt-1.5">{startError}</p>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setAsking(true)}
      className="w-full flex items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/60 rounded-xl px-4 py-3.5 text-sm text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
    >
      <Plus size={15} strokeWidth={1.8} />
      {t("Séance libre")}
    </button>
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
  const t = useT();
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
      setResult({ ok: false, error: "Import impossible, vérifie ta connexion." });
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
        aria-label={t("Importer un fichier CSV")}
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
        {t("Importer mon historique (Hevy / Strong)")}
      </button>

      {result && result.ok && (
        <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mt-2.5">
          <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-green-400">
            {result.sessionsImported}{" "}{t("séance")}{result.sessionsImported !== 1 ? "s" : ""}{" "}{t("importée")}
            {result.sessionsImported !== 1 ? "s" : ""} ({result.setsImported}{" "}{t("sets) depuis")}{" "}
            {result.source === "hevy" ? t("Hevy") : t("Strong")}.
            {result.sessionsSkipped > 0 &&
              ` ${result.sessionsSkipped} déjà importée${result.sessionsSkipped !== 1 ? "s" : ""}, ignorée${result.sessionsSkipped !== 1 ? "s" : ""}.`}
            {result.programCreated && (
              <>
                {" "}{t("Ton programme a été reconstruit à partir de ton historique.")}{" "}
                <Link href="/dashboard/client/program" className="underline font-bold">
                  {t("va le voir")}
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
export default function LogbookClient({
  program,
  sessions,
  records,
  isFree,
  subNavScope = "client",
  activeSession,
  checkins = [],
  historyLimit = 10,
  showingAllHistory = false,
  historyError = false,
}: Props) {
  const t = useT();
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
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
          {t("Logbook")}
        </p>
        <h1 className="text-3xl font-black uppercase tracking-tight">
          {t("Entraînement")}
        </h1>
      </div>

      <HighlightsStrip records={records} />

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
              {t("Séance en cours")}
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
        <SectionLabel>{t("Démarrer une séance")}</SectionLabel>
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
                  ? t("Aucun programme actif. Crée ton programme ou démarre une séance libre.")
                  : t("Aucun programme actif. Démarre une séance libre ou contacte ton coach.")}
              </p>
            </div>
          )}

          <FreeSessionButton sessionBasePath={sessionBasePath} />
        </div>
      </section>

      {/* ── Mes dernières séances ── */}
      {/* Dépliage sur place (séries, PR, notes, ressentis) plutôt qu'un
          simple lien : retrouver ce qui a été fait une séance passée ne
          demande plus d'ouvrir une autre page. Le récap complet reste à un
          tap ("Ouvrir le récap"). */}
      {sessions.length > 0 && (
        <section className="mb-8">
          <SectionLabel>{showingAllHistory ? t("Tout mon historique") : t("Mes dernières séances")}</SectionLabel>
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionHistoryCard
                key={s.id}
                session={s}
                recapHref={`${sessionBasePath}/session/${s.id}`}
              />
            ))}
          </div>
          {/* La liste était plafonnée à 10 séances sans aucun moyen de
              remonter plus loin. Le lien n'apparaît que si la limite est
              atteinte : moins de séances, tout est déjà affiché. */}
          {/* Historique complet demandé mais illisible : on le dit, les
              dernières séances restent affichées juste au-dessus. */}
          {historyError && (
            <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-red-300">
                  {t("Impossible de charger tout ton historique pour le moment. Tes dernières séances sont affichées.")}
                </p>
                <Link
                  href={`${sessionBasePath}?historique=tout`}
                  className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest text-red-300 hover:text-red-200 transition-colors"
                >
                  {t("Réessayer")}
                </Link>
              </div>
            </div>
          )}
          {!showingAllHistory && !historyError && sessions.length >= historyLimit && (
            <Link
              href={`${sessionBasePath}?historique=tout`}
              className="mt-3 w-full flex items-center justify-center gap-1.5 border border-dashed border-[#890404]/30 hover:border-[#890404]/60 rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[#F5EDED]/45 hover:text-[#F5EDED]/75 transition-colors"
            >
              {t("Voir tout l'historique")}
              <ChevronRight size={13} />
            </Link>
          )}
          {showingAllHistory && (
            <div className="mt-3 flex flex-col items-center gap-1">
              {sessions.length >= historyLimit && (
                <p className="text-[10px] text-[#F5EDED]/30 text-center">
                  {t("Les")}{" "}{historyLimit}{" "}{t("séances les plus récentes sont affichées.")}
                </p>
              )}
              <Link
                href={sessionBasePath}
                className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/65 transition-colors py-2"
              >
                {t("Revenir aux dernières séances")}
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ── Ma progression ── */}
      <section className="mb-8">
        <SectionLabel>{t("Ma progression : par exercice")}</SectionLabel>
        <ExerciseProgressionChart sessions={sessions} records={records} />
      </section>

      {checkins.length > 0 && (
        <section>
          <SectionLabel>{t("Ma progression : poids & nutrition")}</SectionLabel>
          <ClientProgressCharts checkins={checkins} />
        </section>
      )}
    </div>
  );
}
