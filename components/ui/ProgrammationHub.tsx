"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  Dumbbell,
  UtensilsCrossed,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Map,
  Target,
} from "lucide-react";
import type { ProgramTemplateWithDays } from "@/utils/program-templates";
import type { DietPlanTemplateWithMeals } from "@/utils/diet-templates";
import type { RoadmapTemplateWithDetails } from "@/utils/roadmap-templates";
import type { Food, DietMode, DietStructure } from "@/utils/nutrition";
import type { DietPlanMealInput } from "@/app/dashboard/coach/clients/[id]/nutrition/diet-plan-actions";
import { PlanBuilder } from "@/components/ui/DietPlanManager";
import ApplyTemplateModal, { type ApplyTemplateClient } from "@/components/ui/ApplyTemplateModal";
import { PHASE_COLORS } from "@/lib/roadmap-colors";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const MODE_LABELS: Record<DietMode, string> = {
  flexible: "Flexible",
  fixed: "Fixe",
  fixed_flexible: "Fixe flexible",
};

interface Props {
  programTemplates: ProgramTemplateWithDays[];
  dietTemplates: DietPlanTemplateWithMeals[];
  roadmapTemplates: RoadmapTemplateWithDetails[];
  foods: Food[];
  clients: ApplyTemplateClient[];
  deleteProgramTemplate: (templateId: string) => Promise<{ error?: string }>;
  applyProgramTemplate: (
    templateId: string,
    clientIds: string[],
    nameOverride?: string
  ) => Promise<{ error?: string; appliedCount?: number }>;
  createDietTemplate: (
    name: string,
    mode: DietMode,
    meals: DietPlanMealInput[],
    structure?: DietStructure,
    objective?: string,
    notes?: string
  ) => Promise<{ error?: string; id?: string }>;
  deleteDietTemplate: (templateId: string) => Promise<{ error?: string }>;
  applyDietTemplate: (
    templateId: string,
    clientIds: string[],
    nameOverride?: string
  ) => Promise<{ error?: string; appliedCount?: number }>;
  deleteRoadmapTemplate: (templateId: string) => Promise<{ error?: string }>;
  applyRoadmapTemplate: (
    templateId: string,
    clientIds: string[],
    startDate: string
  ) => Promise<{ error?: string; appliedCount?: number }>;
}

type Tab = "programmes" | "diet" | "roadmap";

export default function ProgrammationHub({
  programTemplates,
  dietTemplates,
  roadmapTemplates,
  foods,
  clients,
  deleteProgramTemplate,
  applyProgramTemplate,
  createDietTemplate,
  deleteDietTemplate,
  applyDietTemplate,
  deleteRoadmapTemplate,
  applyRoadmapTemplate,
}: Props) {
  const [tab, setTab] = useState<Tab>("programmes");
  // startDate n'existe que pour une application de road map : les décalages
  // en semaines du modèle se convertissent en dates réelles à partir de
  // cette date (aujourd'hui par défaut, modifiable avant d'appliquer).
  const [applyTarget, setApplyTarget] = useState<
    { kind: "programme" | "diet"; id: string; name: string } | { kind: "roadmap"; id: string; name: string; startDate: string } | null
  >(null);
  const [showDietBuilder, setShowDietBuilder] = useState(false);

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "programmes", label: "Programmes", icon: Dumbbell, count: programTemplates.length },
    { key: "diet", label: "Diètes", icon: UtensilsCrossed, count: dietTemplates.length },
    { key: "roadmap", label: "Road Map", icon: Map, count: roadmapTemplates.length },
  ];

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px whitespace-nowrap ${
              tab === key ? "text-[#E01E1E] border-b-2 border-[#E01E1E]" : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={13} />
            {label}
            <span className="text-[10px] opacity-50">{count}</span>
          </button>
        ))}
      </div>

      {tab === "programmes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              {programTemplates.length} modèle{programTemplates.length !== 1 ? "s" : ""} de programme
            </p>
            <Link
              href="/dashboard/coach/programmation/programmes/new"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
            >
              <Plus size={12} />
              Nouveau modèle
            </Link>
          </div>

          {programTemplates.length === 0 ? (
            <EmptyState
              text="Aucun modèle de programme pour l'instant. Conçois une structure réutilisable (split, fréquence, objectif) une fois, applique-la à chaque nouveau client en quelques clics."
              ctaHref="/dashboard/coach/programmation/programmes/new"
              ctaLabel="Créer le premier modèle"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {programTemplates.map((t) => {
                const exerciseCount = t.days.reduce((acc, d) => acc + d.exercises.length, 0);
                return (
                  <div key={t.id} className="ep-card p-4 flex flex-col gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-white leading-tight">{t.name}</p>
                        {t.type && (
                          <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/40">
                            {t.type}
                          </span>
                        )}
                      </div>
                      {t.objective && <p className="text-[11px] text-[#F5EDED]/40 mt-1">{t.objective}</p>}
                      <p className="text-[10px] text-[#F5EDED]/25 mt-1.5">
                        {t.days.length} séance{t.days.length !== 1 ? "s" : ""} · {exerciseCount} exercice{exerciseCount !== 1 ? "s" : ""}
                        {t.frequency ? ` · ${t.frequency}×/semaine` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#890404]/15">
                      <button
                        onClick={() => setApplyTarget({ kind: "programme", id: t.id, name: t.name })}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E]/15 border border-[#E01E1E]/40 rounded-lg text-[#E01E1E] hover:bg-[#E01E1E]/25 transition-colors"
                      >
                        <Send size={11} /> Appliquer
                      </button>
                      <Link
                        href={`/dashboard/coach/programmation/programmes/${t.id}/edit`}
                        className="p-2 text-[#F5EDED]/40 hover:text-white transition-colors"
                        title="Modifier"
                      >
                        <Pencil size={13} />
                      </Link>
                      <DeleteButton onDelete={() => deleteProgramTemplate(t.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "diet" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              {dietTemplates.length} modèle{dietTemplates.length !== 1 ? "s" : ""} de diète
            </p>
            <button
              onClick={() => setShowDietBuilder((v) => !v)}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
            >
              <Plus size={12} />
              {showDietBuilder ? "Fermer" : "Nouveau modèle"}
            </button>
          </div>

          {showDietBuilder && (
            <div className="bg-[#150000] border border-[#890404]/25 rounded-xl p-4">
              <PlanBuilder
                foods={foods}
                onCreate={async (name, mode, meals, structure) => {
                  await createDietTemplate(name, mode, meals, structure);
                  setShowDietBuilder(false);
                }}
              />
            </div>
          )}

          {dietTemplates.length === 0 ? (
            <EmptyState text="Aucun modèle de diète pour l'instant. Construis une structure de repas type (répartition macro, structure journalière ou hebdomadaire) une fois, applique-la à chaque nouveau client." />
          ) : (
            <div className="space-y-2.5">
              {dietTemplates.map((t) => (
                <DietTemplateRow
                  key={t.id}
                  template={t}
                  foods={foods}
                  onApply={() => setApplyTarget({ kind: "diet", id: t.id, name: t.name })}
                  onDelete={() => deleteDietTemplate(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "roadmap" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
              {roadmapTemplates.length} modèle{roadmapTemplates.length !== 1 ? "s" : ""} de road map
            </p>
            <Link
              href="/dashboard/coach/programmation/roadmap/new"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
            >
              <Plus size={12} />
              Nouveau modèle
            </Link>
          </div>

          {roadmapTemplates.length === 0 ? (
            <EmptyState
              text="Aucun modèle de road map pour l'instant. Conçois une série de phases et de jalons type (prépa compétition, perte de poids, prise de masse) une fois, applique la à chaque nouveau client : les décalages en semaines deviennent de vraies dates."
              ctaHref="/dashboard/coach/programmation/roadmap/new"
              ctaLabel="Créer le premier modèle"
            />
          ) : (
            <div className="space-y-2.5">
              {roadmapTemplates.map((t) => (
                <RoadmapTemplateRow
                  key={t.id}
                  template={t}
                  onApply={(startDate) => setApplyTarget({ kind: "roadmap", id: t.id, name: t.name, startDate })}
                  onDelete={() => deleteRoadmapTemplate(t.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {applyTarget && (
        <ApplyTemplateModal
          templateName={applyTarget.name}
          clients={clients}
          onApply={(clientIds, nameOverride) =>
            applyTarget.kind === "programme"
              ? applyProgramTemplate(applyTarget.id, clientIds, nameOverride)
              : applyTarget.kind === "diet"
                ? applyDietTemplate(applyTarget.id, clientIds, nameOverride)
                : applyRoadmapTemplate(applyTarget.id, clientIds, applyTarget.startDate)
          }
          onClose={() => setApplyTarget(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ text, ctaHref, ctaLabel }: { text: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 bg-[#1f0101] border border-dashed border-[#890404]/30 rounded-xl gap-4 text-center px-6">
      <p className="text-xs text-[#F5EDED]/35 max-w-sm">{text}</p>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 bg-[#E01E1E]/10 border border-[#E01E1E]/30 hover:bg-[#E01E1E]/20 text-[#E01E1E] text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={13} />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => Promise<{ error?: string }> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!confirm("Supprimer ce modèle définitivement ? Les programmes déjà appliqués à des clients ne sont pas affectés.")) return;
        setBusy(true);
        await onDelete();
        setBusy(false);
      }}
      className="p-2 text-[#F5EDED]/30 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Supprimer"
    >
      <Trash2 size={13} />
    </button>
  );
}

function DietTemplateRow({
  template,
  foods,
  onApply,
  onDelete,
}: {
  template: DietPlanTemplateWithMeals;
  foods: Food[];
  onApply: () => void;
  onDelete: () => Promise<{ error?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);

  const bySlot = useMemo(() => {
    const map: Record<string, DietPlanTemplateWithMeals["diet_plan_template_meals"]> = {};
    for (const m of template.diet_plan_template_meals) {
      if (!map[m.meal_slot]) map[m.meal_slot] = [];
      map[m.meal_slot].push(m);
    }
    return map;
  }, [template]);

  return (
    <div className="rounded-xl border border-[#890404]/20 bg-[#150000] overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{template.name}</p>
          <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest flex items-center gap-1.5 flex-wrap">
            {MODE_LABELS[template.mode]}
            {template.structure === "weekly" && (
              <span className="inline-flex items-center gap-0.5"><CalendarDays size={9} /> hebdo</span>
            )}
            · {template.diet_plan_template_meals.length} aliment{template.diet_plan_template_meals.length !== 1 ? "s" : ""}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#F5EDED]/30 flex-shrink-0" /> : <ChevronDown size={14} className="text-[#F5EDED]/30 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-3">
          {template.diet_plan_template_meals.length === 0 ? (
            <p className="text-[10px] text-[#F5EDED]/25 italic">Plan flexible, aucun aliment prédéfini.</p>
          ) : (
            Object.entries(bySlot).map(([slot, meals]) => (
              <div key={slot}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5">{slot}</p>
                <div className="space-y-1">
                  {meals.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-1">
                      <p className="text-xs text-white">{m.foods?.name ?? foods.find((f) => f.id === m.food_id)?.name ?? "Aliment"}</p>
                      <p className="text-[10px] text-[#F5EDED]/35">{m.quantity_g}g</p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={onApply}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E]/15 border border-[#E01E1E]/40 rounded-lg text-[#E01E1E] hover:bg-[#E01E1E]/25 transition-colors"
            >
              <Send size={11} /> Appliquer
            </button>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}

function RoadmapTemplateRow({
  template,
  onApply,
  onDelete,
}: {
  template: RoadmapTemplateWithDetails;
  onApply: (startDate: string) => void;
  onDelete: () => Promise<{ error?: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [startDate, setStartDate] = useState(todayISO());

  return (
    <div className="rounded-xl border border-[#890404]/20 bg-[#150000] overflow-hidden">
      <button onClick={() => setExpanded((e) => !e)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{template.name}</p>
          {template.objective && <p className="text-[11px] text-[#F5EDED]/40 mt-0.5 truncate">{template.objective}</p>}
          <p className="text-[10px] text-[#F5EDED]/35 uppercase tracking-widest flex items-center gap-1.5 flex-wrap mt-0.5">
            {template.duration_weeks ? `${template.duration_weeks} semaines` : "Durée libre"}
            · {template.phases.length} phase{template.phases.length !== 1 ? "s" : ""}
            · {template.milestones.length} jalon{template.milestones.length !== 1 ? "s" : ""}
          </p>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#F5EDED]/30 flex-shrink-0" /> : <ChevronDown size={14} className="text-[#F5EDED]/30 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-3">
          {template.phases.length === 0 && template.milestones.length === 0 ? (
            <p className="text-[10px] text-[#F5EDED]/25 italic">Aucune phase ni jalon dans ce modèle.</p>
          ) : (
            <>
              {template.phases.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 flex items-center gap-1.5">
                    <CalendarDays size={10} /> Phases
                  </p>
                  <div className="space-y-1">
                    {template.phases.map((p) => {
                      const colors = PHASE_COLORS[p.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
                      return (
                        <div key={p.id} className="flex items-center justify-between py-1">
                          <p className="text-xs text-white truncate">{colors.icon} {p.label}</p>
                          <p className="text-[10px] text-[#F5EDED]/35 flex-shrink-0 ml-2">
                            Semaine {p.start_week_offset} à {p.end_week_offset}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {template.milestones.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5 flex items-center gap-1.5">
                    <Target size={10} /> Jalons
                  </p>
                  <div className="space-y-1">
                    {template.milestones.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-1">
                        <p className="text-xs text-white truncate">{m.label}</p>
                        <p className="text-[10px] text-[#F5EDED]/35 flex-shrink-0 ml-2">Semaine {m.week_offset}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-2">
            <label className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 block mb-1">
              Date de démarrage à l&apos;application
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-[#1f0101] border border-[#890404]/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E01E1E]/60 transition-colors"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onApply(startDate)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold uppercase tracking-widest bg-[#E01E1E]/15 border border-[#E01E1E]/40 rounded-lg text-[#E01E1E] hover:bg-[#E01E1E]/25 transition-colors"
            >
              <Send size={11} /> Appliquer
            </button>
            <Link
              href={`/dashboard/coach/programmation/roadmap/${template.id}/edit`}
              className="p-2 text-[#F5EDED]/40 hover:text-white transition-colors"
              title="Modifier"
            >
              <Pencil size={13} />
            </Link>
            <DeleteButton onDelete={onDelete} />
          </div>
        </div>
      )}
    </div>
  );
}
