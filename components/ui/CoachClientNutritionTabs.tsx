"use client";

import { useState, useMemo } from "react";
import { X, CheckCircle2, Plus } from "lucide-react";
import NutritionForm from "@/components/ui/NutritionForm";
import MicroBarList from "@/components/ui/MicroBarList";
import ClientReferenceCard from "@/components/ui/ClientReferenceCard";
import type { ClientIntake } from "@/utils/client-intake";
import { PlanBuilder, PlansListView } from "@/components/ui/DietPlanManager";
import type {
  NutritionProfile,
  NutritionProfileInput,
  Food,
  FoodLogWithFood,
  DietPlanWithMeals,
  DietMode,
  DietStructure,
} from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import type { DailyLog } from "@/utils/daily-logs";

const MEAL_SLOTS = [
  { key: "breakfast", label: "Petit-déjeuner" },
  { key: "morning", label: "Collation matin" },
  { key: "lunch", label: "Déjeuner" },
  { key: "afternoon", label: "Collation après-midi" },
  { key: "preworkout", label: "Pré-entraînement" },
  { key: "postworkout", label: "Post-entraînement" },
  { key: "dinner", label: "Dîner" },
];

function getDayColor(cals: number, target: number) {
  if (cals === 0) return "bg-[#F5EDED]/5 border-[#F5EDED]/10";
  const pct = target > 0 ? cals / target : 0;
  if (pct >= 0.85) return "bg-green-600/60 border-green-500/30";
  if (pct >= 0.6) return "bg-amber-500/60 border-amber-400/30";
  return "bg-red-700/60 border-red-600/30";
}

// ── Today logs ────────────────────────────────────────────────────────────────

function TodayLogsView({
  logs,
  nutritionProfile,
}: {
  logs: FoodLogWithFood[];
  nutritionProfile: NutritionProfile | null;
}) {
  const targets = {
    calories: nutritionProfile?.calories_target ?? 0,
    proteins: nutritionProfile?.proteins_target ?? 0,
    carbs: nutritionProfile?.carbs_target ?? 0,
    fats: nutritionProfile?.fats_target ?? 0,
  };

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + (l.calories ?? 0),
      proteins: acc.proteins + (l.proteins ?? 0),
      carbs: acc.carbs + (l.carbs ?? 0),
      fats: acc.fats + (l.fats ?? 0),
    }),
    { calories: 0, proteins: 0, carbs: 0, fats: 0 }
  );

  const bySlot: Record<string, FoodLogWithFood[]> = {};
  for (const l of logs) {
    const slot = l.meal_slot ?? "other";
    if (!bySlot[slot]) bySlot[slot] = [];
    bySlot[slot].push(l);
  }

  return (
    <div className="space-y-5">
      {/* Macro summary */}
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Calories", v: totals.calories, t: targets.calories, unit: "kcal", color: "#E01E1E" },
            { label: "Protéines", v: totals.proteins, t: targets.proteins, unit: "g", color: "#60a5fa" },
            { label: "Glucides", v: totals.carbs, t: targets.carbs, unit: "g", color: "#fbbf24" },
            { label: "Lipides", v: totals.fats, t: targets.fats, unit: "g", color: "#fb7185" },
          ].map(({ label, v, t, unit, color }) => (
            <div key={label} className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-1">
                {label}
              </p>
              <p className="text-lg font-black" style={{ color }}>
                {Math.round(v)}
                <span className="text-xs font-normal text-[#F5EDED]/30 ml-0.5">{unit}</span>
              </p>
              {t > 0 && (
                <p className="text-[9px] text-[#F5EDED]/25">
                  / {t}{unit}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slots */}
      {logs.length === 0 ? (
        <p className="text-sm text-[#F5EDED]/25 italic text-center py-6">
          Aucun aliment logué aujourd&apos;hui.
        </p>
      ) : (
        MEAL_SLOTS.map((slot) => {
          const slotLogs = bySlot[slot.key] ?? [];
          if (slotLogs.length === 0) return null;
          return (
            <div key={slot.key} className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-2">
                {slot.label}
              </p>
              <div className="space-y-1">
                {slotLogs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-[#890404]/10 last:border-0">
                    <div>
                      <p className="text-xs text-white font-medium">{l.foods?.name ?? "Aliment supprimé"}</p>
                      <p className="text-[10px] text-[#F5EDED]/35">{l.quantity_g}g</p>
                    </div>
                    <div className="text-right text-[10px] text-[#F5EDED]/40">
                      <p className="text-[#E01E1E]/70 font-bold">{Math.round(l.calories ?? 0)} kcal</p>
                      <p>P {Math.round(l.proteins ?? 0)}g · G {Math.round(l.carbs ?? 0)}g · L {Math.round(l.fats ?? 0)}g</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Micros */}
      {logs.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 mb-3">
            Micronutriments du jour
          </p>
          <MicroBarList logs={logs} />
        </div>
      )}
    </div>
  );
}

// ── History view ──────────────────────────────────────────────────────────────

function HistoryView({
  historyLogs,
  today,
  targets,
}: {
  historyLogs: FoodLogWithFood[];
  today: string;
  targets: { calories: number };
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of historyLogs) {
      map[l.logged_at] = (map[l.logged_at] ?? 0) + (l.calories ?? 0);
    }
    return map;
  }, [historyLogs]);

  const last30Days = useMemo(() => {
    const days: string[] = [];
    const now = new Date(today);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, [today]);

  const dayLogs = useMemo(
    () => (selectedDate ? historyLogs.filter((l) => l.logged_at === selectedDate) : []),
    [historyLogs, selectedDate]
  );

  return (
    <div className="space-y-5">
      <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
        <div className="grid grid-cols-7 gap-1.5">
          {last30Days.map((date) => {
            const cals = calsByDate[date] ?? 0;
            const isSelected = selectedDate === date;
            return (
              <button
                key={date}
                onClick={() => setSelectedDate(isSelected ? null : date)}
                title={`${date} : ${Math.round(cals)} kcal`}
                className={`aspect-square rounded-md border text-[8px] font-bold transition-all ${getDayColor(cals, targets.calories)} ${isSelected ? "ring-2 ring-white/50 ring-offset-1 ring-offset-[#1f0101]" : ""}`}
              >
                <span className="text-white/70">{new Date(date + "T12:00:00").getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="bg-[#1f0101] border border-[#890404]/40 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-white">
              {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(selectedDate + "T12:00:00"))}
            </p>
            <button onClick={() => setSelectedDate(null)} className="text-[#F5EDED]/40 hover:text-white">
              <X size={14} />
            </button>
          </div>
          {dayLogs.length === 0 ? (
            <p className="text-xs text-[#F5EDED]/30 italic">Aucun aliment logué.</p>
          ) : (
            <>
              <div className="space-y-1 mb-4">
                {dayLogs.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-1.5 border-b border-[#890404]/10 last:border-0">
                    <div>
                      <p className="text-xs text-white">{l.foods?.name ?? "Aliment supprimé"}</p>
                      <p className="text-[10px] text-[#F5EDED]/35">{l.quantity_g}g · {l.meal_slot}</p>
                    </div>
                    <p className="text-xs text-[#E01E1E]/70 font-bold">{Math.round(l.calories ?? 0)} kcal</p>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#890404]/15">
                <p className="text-xs font-bold text-[#F5EDED]/50">
                  Total : {Math.round(calsByDate[selectedDate] ?? 0)} kcal
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  clientId: string;
  clientWeight: number | null;
  recentDailyLogs?: DailyLog[];
  nutritionProfile: NutritionProfile | null;
  todayLogs: FoodLogWithFood[];
  historyLogs: FoodLogWithFood[];
  foods: Food[];
  activePlan: DietPlanWithMeals | null;
  allPlans: DietPlanWithMeals[];
  today: string;
  intake?: ClientIntake | null;
  saveNutritionProfile: (clientId: string, data: NutritionProfileInput) => Promise<{ error?: string }>;
  createDietPlan: (clientId: string, name: string, mode: DietMode, meals: DietPlanMealInput[], structure?: DietStructure) => Promise<{ error?: string; id?: string }>;
  deactivateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  activateDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
  deleteDietPlan: (clientId: string, planId: string) => Promise<{ error?: string }>;
}

type Tab = "objectifs" | "plan" | "today" | "history";

export default function CoachClientNutritionTabs({
  clientId,
  clientWeight,
  recentDailyLogs = [],
  nutritionProfile,
  todayLogs,
  historyLogs,
  foods,
  activePlan,
  allPlans,
  today,
  intake = null,
  saveNutritionProfile,
  createDietPlan,
  deactivateDietPlan,
  activateDietPlan,
  deleteDietPlan,
}: Props) {
  const [tab, setTab] = useState<Tab>("objectifs");
  const [showBuilder, setShowBuilder] = useState(allPlans.length === 0);

  const tabs: { key: Tab; label: string }[] = [
    { key: "objectifs", label: "Objectifs TDEE" },
    { key: "plan", label: "Plans" },
    { key: "today", label: "Suivi du jour" },
    { key: "history", label: "Historique alimentaire" },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active plan badge */}
      {activePlan && tab !== "objectifs" && tab !== "plan" && (
        <div className="flex items-center justify-between bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-2.5 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={13} className="text-green-400" />
            <p className="text-xs font-bold text-white">
              Plan actif :{" "}
              <span className="text-[#E01E1E]">{activePlan.name}</span>
              <span className="ml-2 text-[10px] text-[#F5EDED]/30 uppercase font-normal">
                {activePlan.mode}
              </span>
            </p>
          </div>
          <button
            onClick={() => deactivateDietPlan(clientId, activePlan.id)}
            className="text-[10px] text-[#F5EDED]/30 hover:text-red-400 transition-colors"
          >
            Désactiver
          </button>
        </div>
      )}

      {/* Content */}
      {tab === "objectifs" && (
        <NutritionForm
          clientId={clientId}
          existingProfile={nutritionProfile}
          clientWeight={clientWeight}
          recentDailyLogs={recentDailyLogs}
          saveNutritionProfile={saveNutritionProfile}
        />
      )}

      {tab === "plan" && (
        <div className="space-y-5">
          <ClientReferenceCard intake={intake} />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              {allPlans.length} plan{allPlans.length !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => setShowBuilder((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
            >
              <Plus size={12} />
              {showBuilder ? "Fermer" : "Nouveau plan"}
            </button>
          </div>

          {showBuilder && (
            <div className="bg-[#150000] border border-[#890404]/25 rounded-xl p-4">
              <PlanBuilder
                foods={foods}
                intake={intake}
                onCreate={async (name, mode, meals, structure) => {
                  await createDietPlan(clientId, name, mode, meals, structure);
                  setShowBuilder(false);
                }}
              />
            </div>
          )}

          <PlansListView
            plans={allPlans}
            foods={foods}
            onActivate={async (planId) => { await activateDietPlan(clientId, planId); }}
            onDeactivate={async (planId) => { await deactivateDietPlan(clientId, planId); }}
            onDelete={async (planId) => { await deleteDietPlan(clientId, planId); }}
          />
        </div>
      )}

      {tab === "today" && (
        <TodayLogsView logs={todayLogs} nutritionProfile={nutritionProfile} />
      )}

      {tab === "history" && (
        <HistoryView
          historyLogs={historyLogs}
          today={today}
          targets={{ calories: nutritionProfile?.calories_target ?? 0 }}
        />
      )}
    </div>
  );
}
