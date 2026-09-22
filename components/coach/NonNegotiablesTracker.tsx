"use client";

import { useState, useTransition } from "react";
import { Check, Flame, Plus, X } from "lucide-react";
import {
  upsertNonNegotiablesDay,
  saveMonthlyObjectives,
} from "@/app/dashboard/coach/business/pilotage/actions";
import type {
  NonNegotiablesDay,
  MonthlyObjectives,
  WeeklyBusinessStats,
} from "@/lib/business-non-negotiables";

// UI du pilotage business — voir lib/business-non-negotiables.ts pour
// toute la logique (agrégation, calcul du streak). Palette identité rouge
// sombre déjà utilisée partout ailleurs dans l'appli (AdsTracker,
// ClientNutritionView) : jamais aplatie ("garder l'identité rouge brume").

const RED = "#E01E1E";
const BORDER = "rgba(137,4,4,0.25)";
const DIM = "rgba(245,237,237,0.4)";

function inputStyle(): React.CSSProperties {
  return {
    background: "rgba(137,4,4,0.08)",
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "8px 10px",
    color: "#fff",
    fontSize: 13,
    width: "100%",
  };
}

function DayDot({ day }: { day: NonNegotiablesDay }) {
  const respected =
    (day.readingPages ?? 0) > 0 ||
    (day.mindfulnessMinutes ?? 0) > 0 ||
    day.objectivesMorning ||
    day.objectivesMidday ||
    day.objectivesEvening ||
    (day.contentMinutes ?? 0) > 0 ||
    (day.contentPosts ?? 0) > 0 ||
    (day.outreachConversations ?? 0) > 0;
  const label = new Date(day.logDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" });
  return (
    <div className="flex flex-col items-center gap-1" style={{ minWidth: 32 }}>
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: respected ? "rgba(224,30,30,0.2)" : "transparent",
          border: `1.5px solid ${respected ? RED : BORDER}`,
        }}
      >
        {respected && <Check size={13} color={RED} strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 9, color: DIM, textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

// `target` : repère facultatif issu des objectifs hebdo du Mastermind
// ("5 appels stratégiques par semaine"), affiché en comparaison, jamais
// comme un seuil de réussite/échec strict — Santamaria a explicitement
// dit que ces chiffres ne sont pas à prendre au pied de la lettre.
function StatTile({ label, value, target }: { label: string; value: string | number; target?: number }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(137,4,4,0.06)", border: `1px solid ${BORDER}` }}>
      <p style={{ margin: 0, fontSize: 8.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: DIM }}>
        {label}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800, color: "#fff" }}>
        {value}
        {target !== undefined && <span style={{ fontSize: 11, fontWeight: 600, color: DIM }}> / {target} visé</span>}
      </p>
    </div>
  );
}

export default function NonNegotiablesTracker({
  today,
  todayLog,
  weekLogs,
  streak,
  monthlyObjectives,
  weeklyStats,
}: {
  today: string;
  todayLog: NonNegotiablesDay;
  weekLogs: NonNegotiablesDay[];
  streak: number;
  monthlyObjectives: MonthlyObjectives;
  weeklyStats: WeeklyBusinessStats;
}) {
  const [form, setForm] = useState(todayLog);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [objectives, setObjectives] = useState<string[]>(
    monthlyObjectives.objectives.length > 0 ? monthlyObjectives.objectives : [""]
  );
  const [objectivesSaved, setObjectivesSaved] = useState(false);

  function save(patch: Partial<NonNegotiablesDay>) {
    const next = { ...form, ...patch };
    setForm(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await upsertNonNegotiablesDay({
        logDate: today,
        readingPages: next.readingPages,
        mindfulnessMinutes: next.mindfulnessMinutes,
        objectivesMorning: next.objectivesMorning,
        objectivesMidday: next.objectivesMidday,
        objectivesEvening: next.objectivesEvening,
        contentMinutes: next.contentMinutes,
        contentPosts: next.contentPosts,
        outreachConversations: next.outreachConversations,
      });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  function numberField(key: keyof NonNegotiablesDay, label: string, unit: string) {
    const value = form[key] as number | null;
    return (
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: DIM, display: "block", marginBottom: 4 }}>
          {label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={value ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw === "" ? null : Math.max(0, Math.round(Number(raw)));
              save({ [key]: parsed } as Partial<NonNegotiablesDay>);
            }}
            style={inputStyle()}
            placeholder="0"
          />
          <span style={{ fontSize: 11, color: DIM, whiteSpace: "nowrap" }}>{unit}</span>
        </div>
      </div>
    );
  }

  function objectiveToggle(key: "objectivesMorning" | "objectivesMidday" | "objectivesEvening", label: string) {
    const active = form[key];
    return (
      <button
        type="button"
        onClick={() => save({ [key]: !active } as Partial<NonNegotiablesDay>)}
        className="px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide border flex items-center gap-1.5"
        style={{
          background: active ? "rgba(224,30,30,0.18)" : "transparent",
          borderColor: active ? RED : BORDER,
          color: active ? "#fff" : DIM,
        }}
      >
        {active && <Check size={12} />}
        {label}
      </button>
    );
  }

  function saveObjectives(next: string[]) {
    setObjectives(next);
    setObjectivesSaved(false);
    startTransition(async () => {
      const result = await saveMonthlyObjectives(next);
      if (!result.error) setObjectivesSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Non-négociables du jour */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Non-négociables du jour</h2>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold" style={{ color: RED }}>
              <Flame size={14} /> {streak} j de suite
            </span>
          )}
        </div>

        <div className="flex justify-between mb-5 px-1">
          {weekLogs.map((d) => (
            <DayDot key={d.logDate} day={d} />
          ))}
        </div>

        <p className="text-xs mb-3" style={{ color: DIM }}>
          Le pilier &laquo; pas &raquo; du Mastermind est déjà suivi ailleurs (onglet Steps) — pas besoin de le
          resaisir ici.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {numberField("readingPages", "Lecture", "pages")}
          {numberField("mindfulnessMinutes", "Pleine conscience", "min")}
          {numberField("contentMinutes", "Création de contenu", "min")}
          {numberField("contentPosts", "Posts publiés", "posts")}
          {numberField("outreachConversations", "Outreach", "conversations")}
        </div>

        <div>
          <label style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: DIM, display: "block", marginBottom: 6 }}>
            Objectifs revus (Reflect / Review / Reaffirm)
          </label>
          <div className="flex gap-2 flex-wrap">
            {objectiveToggle("objectivesMorning", "Matin")}
            {objectiveToggle("objectivesMidday", "Midi")}
            {objectiveToggle("objectivesEvening", "Soir")}
          </div>
        </div>

        {error && <p className="text-xs mt-3" style={{ color: "#f87171" }}>{error}</p>}
        {saved && !error && !isPending && (
          <p className="text-xs mt-3 flex items-center gap-1" style={{ color: "#4ade80" }}>
            <Check size={12} /> Enregistré
          </p>
        )}
      </section>

      {/* Objectifs du mois */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-3">
          Mes 5 objectifs du mois
        </h2>
        <div className="flex flex-col gap-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={obj}
                onChange={(e) => {
                  const next = [...objectives];
                  next[i] = e.target.value;
                  setObjectives(next);
                }}
                onBlur={() => saveObjectives(objectives)}
                placeholder={`Objectif ${i + 1}`}
                style={inputStyle()}
                maxLength={300}
              />
              <button
                type="button"
                onClick={() => {
                  const next = objectives.filter((_, idx) => idx !== i);
                  saveObjectives(next.length > 0 ? next : [""]);
                }}
                aria-label="Retirer cet objectif"
                style={{ color: DIM }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
          {objectives.length < 5 && (
            <button
              type="button"
              onClick={() => setObjectives([...objectives, ""])}
              className="flex items-center gap-1.5 text-xs font-semibold self-start mt-1"
              style={{ color: RED }}
            >
              <Plus size={14} /> Ajouter un objectif
            </button>
          )}
        </div>
        {objectivesSaved && (
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: "#4ade80" }}>
            <Check size={12} /> Enregistré
          </p>
        )}
      </section>

      {/* Pilotage hebdo — les 5 catégories du Mastermind, agrégées depuis l'appli */}
      <section>
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-1">
          Cette semaine
        </h2>
        <p className="text-xs mb-3" style={{ color: DIM }}>
          Du {new Date(weeklyStats.from + "T12:00:00").toLocaleDateString("fr-FR")} au{" "}
          {new Date(weeklyStats.to + "T12:00:00").toLocaleDateString("fr-FR")} — chiffres déjà présents
          dans l&apos;appli, rien à ressaisir.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <StatTile label="Scripts publiés" value={weeklyStats.scriptsPublished} />
          <StatTile label="Vues cumulées" value={weeklyStats.totalViews.toLocaleString("fr-FR")} />
          <StatTile label="Engagement" value={weeklyStats.totalEngagement.toLocaleString("fr-FR")} />
          <StatTile label="Nouveaux leads" value={weeklyStats.newLeads} />
          <StatTile label="Appels bookés" value={weeklyStats.callsBooked} target={5} />
          <StatTile label="Appels faits" value={weeklyStats.callsDone} />
          <StatTile label="Ventes closes" value={weeklyStats.callsClosed} />
          <StatTile
            label="CA généré"
            value={weeklyStats.revenueGenerated.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " €"}
          />
        </div>
      </section>
    </div>
  );
}
