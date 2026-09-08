"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2, Users, GraduationCap, FileText, ShieldAlert,
  ChevronDown, Copy, Check, Mail, Inbox, StickyNote, ListChecks, Bot, ArrowRight,
} from "lucide-react";
import type { JobApplication, ApplicationStatus, OnboardingStepState } from "@/lib/job-applications";
import { ONBOARDING_STEPS, QUALIFYING_QUESTIONS } from "@/lib/job-applications";
import { getAgentByKey } from "@/lib/ai-agents";

// Vue interactive de la page Administration > Organisation. Portée en
// composant client à part le 2026-08-15 suite au retour direct : "au lieu
// juste du contenu créé des vrai endroit... des bloc des bouton et surtout
// vrai fonctionnaliter utile pas juste du texte hyper long mais des truc
// deroulant pour aérer... la c'est tout a la suite c nul". Trois
// changements concrets par rapport à l'ancienne version (tout rendu à plat
// dans page.tsx, un seul long scroll) :
//   1. Chaque section devient un accordéon (pôles, parcours d'intégration,
//      formation avant embauche, contrats) — replié par défaut sauf le
//      premier élément, jamais tout affiché d'un coup.
//   2. Chaque poste gagne un vrai statut de recrutement cliquable (à
//      pourvoir / en recrutement / pourvu), persisté en base
//      (org_role_status) — la seule vraie fonctionnalité de la page, le
//      reste demeure du contenu de référence.
//   3. La fiche technique exemple (la plus longue section) est repliée par
//      défaut avec un bouton "copier le script" fonctionnel.
//
// RESTRUCTURATION DES PÔLES (2026-08-17, retour direct : "je vois toujours
// pas de changement dans organisation... met moi dans organisation vraiment
// plusieurs onglets par pôle et des boutons par métier avec un aperçu sur
// mes agents IA je veux pouvoir leur assigner des tâches") : la section
// Pôles n'est plus un accordéon (5 blocs empilés qui se ressemblaient tous
// au premier coup d'œil, d'où le "je vois 0 changement") mais de vrais
// onglets, un par pôle, un seul actif à la fois. Chaque carte de poste
// affiche maintenant son agent IA (lib/ai-agents.ts, même clé que le
// poste) avec un lien direct vers la discussion, et un badge de tâches
// ouvertes s'il y en a.

export type RoleStatus = "a_pourvoir" | "en_recrutement" | "pourvu";

// Rémunération (ajouté 2026-09-02, retour direct : "dans carrière ya
// toujours pas les salaires affichés, corrige et mets les, mets vraiment
// ce que Matis Clouet a dit sur le recrutement"). Deux champs distincts
// pour ne jamais mélanger ce qui est verifie et cite du transcript Matis
// Clouet (setting/closing/coaching, voir org-roles.ts) et ce qui applique
// juste le meme principe general (variable d'abord, fixe progressif) aux
// postes qu'il n'a pas traites specifiquement. `fixed` reste null quand le
// poste est rémunéré purement en pourcentage (setting/closing, conseil
// explicite de Matis Clouet : "je vous conseille pas de rémunérer en
// fixe, je vous conseille vraiment au pourcentage").
export interface RoleCompensation {
  variable: string | null;
  fixed: string | null;
  // Montant concret en euros, calcule a partir des offres reelles d'EP Coaching
  // (500 euros/mois, 1500 euros/6 mois, 3000 euros en paiement unique) et du
  // pourcentage de commission du poste. Retour direct 2026-09-08 : "les salaires
  // il n'y a pas de chiffre ou de fourchette clair". Renseigne uniquement quand
  // le calcul repose sur un pourcentage reellement defini : ailleurs, annoncer
  // un montant reviendrait a l'inventer.
  earnings: string | null;
}

export interface RoleCard {
  key: string;
  title: string;
  mission: string;
  levels: string[];
  tasks: string[];
  reportsTo: string;
  compensation: RoleCompensation;
  // Criteres non negociables (methode "scorecard" de Matis Clouet : mission
  // en une phrase, resultats attendus, competences non negociables, avant
  // meme de voir un premier candidat).
  nonNegotiable: string[];
}

export interface Pole {
  key: string;
  name: string;
  color: string;
  roles: RoleCard[];
}

interface TimelineStep {
  when: string;
  title: string;
  desc: string;
}

interface Phase {
  title: string;
  desc: string;
  status: string | null;
  ok: boolean | null;
}

interface Contract {
  title: string;
  desc: string;
}

const STATUS_META: Record<RoleStatus, { label: string; color: string }> = {
  a_pourvoir: { label: "À pourvoir", color: "#F5EDED" },
  en_recrutement: { label: "En recrutement", color: "#fbbf24" },
  pourvu: { label: "Pourvu", color: "#4ade80" },
};
const STATUS_ORDER: RoleStatus[] = ["a_pourvoir", "en_recrutement", "pourvu"];

const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; color: string }> = {
  nouvelle: { label: "Nouvelle", color: "#60a5fa" },
  en_discussion: { label: "En discussion", color: "#fbbf24" },
  acceptee: { label: "Acceptée", color: "#4ade80" },
  refusee: { label: "Refusée", color: "rgba(245,237,237,0.35)" },
};
const APPLICATION_STATUS_ORDER: ApplicationStatus[] = ["nouvelle", "en_discussion", "acceptee", "refusee"];

function ChevronToggle({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={15}
      className="text-[#F5EDED]/35 transition-transform flex-shrink-0"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    />
  );
}

function RoleStatusPicker({
  status,
  onChange,
}: {
  status: RoleStatus;
  onChange: (s: RoleStatus) => void;
}) {
  return (
    <div className="flex gap-1 pt-2.5 mt-2.5 border-t border-dashed border-[#890404]/15" onClick={(e) => e.stopPropagation()}>
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        const active = status === s;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className="flex-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-1.5 rounded-md border transition-colors"
            style={
              active
                ? { background: `${meta.color}1f`, borderColor: `${meta.color}70`, color: meta.color }
                : { background: "transparent", borderColor: "rgba(137,4,4,0.2)", color: "rgba(245,237,237,0.3)" }
            }
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}

function RoleCardView({
  role,
  color,
  status,
  onChange,
  openTaskCount,
}: {
  role: RoleCard;
  color: string;
  status: RoleStatus;
  onChange: (s: RoleStatus) => void;
  openTaskCount: number;
}) {
  const agent = getAgentByKey(role.key);
  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: color }} />
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-black text-white">{role.title}</p>
        <span
          className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${STATUS_META[status].color}1a`, color: STATUS_META[status].color }}
        >
          {STATUS_META[status].label}
        </span>
      </div>
      <p className="text-[12px] text-[#F5EDED]/55 leading-relaxed mb-3">{role.mission}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {role.levels.map((l) => (
          <span
            key={l}
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
            style={{ background: `${color}18`, borderColor: `${color}55`, color }}
          >
            {l}
          </span>
        ))}
      </div>
      <ul className="space-y-1 mb-1">
        {role.tasks.map((t, i) => (
          <li key={i} className="text-[11.5px] text-[#F5EDED]/55 flex gap-2 leading-snug">
            <span style={{ color, flexShrink: 0 }}>•</span> {t}
          </li>
        ))}
      </ul>
      {/* Même rémunération que celle affichée publiquement sur /carrieres
          (2026-09-02) — vue interne, pour que le fondateur voie exactement
          ce qu'un candidat voit avant de publier un changement. */}
      <div className="text-[10px] text-[#F5EDED]/40 pt-2 mt-2 border-t border-dashed border-[#890404]/15 space-y-0.5">
        {role.compensation.variable && <p>Variable : {role.compensation.variable}</p>}
        {role.compensation.fixed && <p>Fixe : {role.compensation.fixed}</p>}
      </div>
      <p className="text-[10px] text-[#F5EDED]/30 pt-2 mt-2 border-t border-dashed border-[#890404]/15">
        Rattaché à : <strong className="text-[#F5EDED]/55 font-bold">{role.reportsTo}</strong>
      </p>
      <RoleStatusPicker status={status} onChange={onChange} />

      {/* Aperçu de l'agent IA du poste (2026-08-17) : en attendant un vrai
          titulaire, l'agent IA correspondant (lib/ai-agents.ts, même clé)
          peut déjà être discuté et recevoir des tâches assignées. */}
      {agent && (
        <Link
          href={`/dashboard/coach/admin/organisation/agents/${role.key}`}
          className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-dashed border-[#890404]/15 group"
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}1f`, color }}
          >
            <Bot size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-[#F5EDED]/75 truncate">
              Agent IA : {agent.name}
            </p>
            <p className="text-[9.5px] text-[#F5EDED]/35 truncate">Discuter · assigner une tâche</p>
          </div>
          {openTaskCount > 0 && (
            <span className="text-[9px] font-black text-white bg-[#E01E1E] rounded-full px-1.5 py-0.5 min-w-[16px] text-center flex-shrink-0">
              {openTaskCount}
            </span>
          )}
          <ArrowRight size={13} className="text-[#F5EDED]/25 group-hover:text-[#F5EDED]/60 transition-colors flex-shrink-0" />
        </Link>
      )}
    </div>
  );
}

function PoleTabBar({
  poles,
  activeKey,
  onChange,
  statuses,
}: {
  poles: Pole[];
  activeKey: string;
  onChange: (key: string) => void;
  statuses: Record<string, RoleStatus>;
}) {
  return (
    <div role="tablist" aria-label="Pôles" className="flex gap-1.5 overflow-x-auto mb-4 border-b border-[#890404]/20 pb-0.5">
      {poles.map((pole) => {
        const active = pole.key === activeKey;
        const filled = pole.roles.filter((r) => statuses[r.key] === "pourvu").length;
        return (
          <button
            key={pole.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(pole.key)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-left whitespace-nowrap flex-shrink-0 transition-colors"
            style={{
              border: "none",
              borderBottom: active ? `2px solid ${pole.color}` : "2px solid transparent",
              background: active ? `${pole.color}14` : "transparent",
            }}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pole.color }} />
            <span className="flex flex-col items-start">
              <span
                className="text-[12px] font-extrabold uppercase tracking-tight"
                style={{ color: active ? "#F5EDED" : "rgba(245,237,237,0.45)" }}
              >
                {pole.name}
              </span>
              <span className="text-[9px] text-[#F5EDED]/30">
                {pole.roles.length} poste{pole.roles.length > 1 ? "s" : ""}
                {filled > 0 && <span style={{ color: "#4ade80" }}> · {filled} pourvu{filled > 1 ? "s" : ""}</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function fmtAppDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

function OnboardingChecklist({
  steps,
  onToggle,
}: {
  steps: OnboardingStepState[];
  onToggle: (stepKey: string, done: boolean) => void;
}) {
  const doneSet = new Set(steps.filter((s) => s.done).map((s) => s.step_key));
  const doneCount = ONBOARDING_STEPS.filter((s) => doneSet.has(s.key)).length;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#890404]/15">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 mb-2 flex items-center gap-1.5">
        <ListChecks size={11} className="text-[#4ade80]" />
        Parcours d&apos;intégration · {doneCount}/{ONBOARDING_STEPS.length}
      </p>
      <div className="space-y-1">
        {ONBOARDING_STEPS.map((step) => {
          const done = doneSet.has(step.key);
          return (
            <button
              key={step.key}
              onClick={() => onToggle(step.key, !done)}
              className="w-full flex items-center gap-2 text-left py-0.5"
            >
              <span
                className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  done ? "bg-[#4ade80] border-[#4ade80]" : "border-[#890404]/40 bg-transparent"
                }`}
              >
                {done && <Check size={10} className="text-[#0a1f0a]" strokeWidth={3} />}
              </span>
              <span className={`text-[11px] ${done ? "text-[#F5EDED]/35 line-through" : "text-[#F5EDED]/65"}`}>
                {step.label}
              </span>
              <span className="text-[9px] text-[#F5EDED]/25 ml-auto flex-shrink-0">{step.when}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ApplicationRow({
  application,
  roleTitle,
  onChange,
  onSaveNotes,
  onboardingSteps,
  onToggleOnboarding,
}: {
  application: JobApplication;
  roleTitle: string;
  onChange: (status: ApplicationStatus) => void;
  onSaveNotes: (notes: string) => void;
  onboardingSteps: OnboardingStepState[];
  onToggleOnboarding: (stepKey: string, done: boolean) => void;
}) {
  const meta = APPLICATION_STATUS_META[application.status];
  const [notes, setNotes] = useState(application.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!application.notes);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-sm font-black text-white truncate">{application.full_name}</p>
          <p className="text-[10.5px] text-[#F5EDED]/35 mt-0.5">{roleTitle} · {fmtAppDate(application.created_at)}</p>
        </div>
        <span
          className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${meta.color}1a`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 mb-1">
        <a href={`mailto:${application.email}`} className="text-[11.5px] text-[#F5EDED]/55 hover:text-white flex items-center gap-1.5">
          <Mail size={11} className="text-[#E01E1E]" /> {application.email}
        </a>
        {application.phone && (
          <span className="text-[11.5px] text-[#F5EDED]/55">{application.phone}</span>
        )}
      </div>

      {/* Réponses de qualification (2026-09-08) : ce que le candidat a
          répondu lui-même à la candidature, jamais ce que le coach note à
          part (ça reste dans "notes" plus bas). */}
      {application.answers && Object.keys(application.answers).length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-dashed border-[#890404]/15 space-y-2">
          {QUALIFYING_QUESTIONS.filter((q) => application.answers?.[q.key]).map((q) => (
            <div key={q.key}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">{q.label}</p>
              {q.key === "link" ? (
                <a
                  href={application.answers![q.key]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11.5px] text-[#E01E1E] hover:underline break-all"
                >
                  {application.answers![q.key]}
                </a>
              ) : (
                <p className="text-[11.5px] text-[#F5EDED]/65 leading-relaxed whitespace-pre-wrap">
                  {application.answers![q.key]}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 pt-2.5 mt-2.5 border-t border-dashed border-[#890404]/15">
        {APPLICATION_STATUS_ORDER.map((s) => {
          const m = APPLICATION_STATUS_META[s];
          const active = application.status === s;
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className="flex-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-1.5 rounded-md border transition-colors"
              style={
                active
                  ? { background: `${m.color}1f`, borderColor: `${m.color}70`, color: m.color }
                  : { background: "transparent", borderColor: "rgba(137,4,4,0.2)", color: "rgba(245,237,237,0.3)" }
              }
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Notes libres (2026-08-17) : repliées par défaut si vides, pour ne
          pas alourdir chaque carte, toujours visibles si déjà remplies. */}
      {showNotes ? (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => onSaveNotes(notes)}
          placeholder="Notes d'entretien, impressions, points à vérifier…"
          rows={2}
          className="w-full mt-2.5 bg-[#150000] border border-[#890404]/25 rounded-lg px-2.5 py-2 text-[11px] text-[#F5EDED]/70 placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50 resize-none"
        />
      ) : (
        <button
          onClick={() => setShowNotes(true)}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#F5EDED]/30 hover:text-[#F5EDED]/60 transition-colors"
        >
          <StickyNote size={11} /> Ajouter une note
        </button>
      )}

      {application.status === "acceptee" && (
        <OnboardingChecklist
          steps={onboardingSteps}
          onToggle={onToggleOnboarding}
        />
      )}
    </div>
  );
}

function SimpleAccordionItem({
  open,
  onToggle,
  header,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-[#890404]/20 mb-2.5 bg-[#1f0101]">
      <button onClick={onToggle} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        {header}
        <ChevronToggle open={open} />
      </button>
      {open && <div className="px-4 pb-4 pt-0.5">{children}</div>}
    </div>
  );
}

export interface AICoachSummary {
  id: string;
  full_name: string | null;
  bio: string | null;
  specializations: string[];
  accepting_new_clients: boolean;
  clientCount: number;
}

export default function OrganisationView({
  poles,
  timeline,
  phases,
  contracts,
  initialStatuses,
  setRoleStatus,
  applications,
  roleTitleByKey,
  setApplicationStatus,
  setApplicationNotes,
  onboardingByApplication,
  toggleOnboardingStep,
  openTaskCountsByAgent,
  aiCoaches,
}: {
  poles: Pole[];
  timeline: TimelineStep[];
  phases: Phase[];
  contracts: Contract[];
  initialStatuses: Record<string, RoleStatus>;
  setRoleStatus: (roleKey: string, status: RoleStatus) => Promise<{ error?: string }>;
  applications: JobApplication[];
  roleTitleByKey: Record<string, string>;
  setApplicationStatus: (applicationId: string, status: ApplicationStatus) => Promise<{ error?: string }>;
  setApplicationNotes: (applicationId: string, notes: string) => Promise<{ error?: string }>;
  onboardingByApplication: Record<string, OnboardingStepState[]>;
  toggleOnboardingStep: (applicationId: string, stepKey: string, done: boolean) => Promise<{ error?: string }>;
  openTaskCountsByAgent: Record<string, number>;
  /** Coachs IA client-facing (lib/ai-coaches.ts) — distincts des 19 agents IA internes (poles/roles) ci-dessus. */
  aiCoaches: AICoachSummary[];
}) {
  const totalRoles = poles.reduce((sum, p) => sum + p.roles.length, 0);
  const [statuses, setStatuses] = useState<Record<string, RoleStatus>>(initialStatuses);
  const filledTotal = Object.values(statuses).filter((s) => s === "pourvu").length;
  const activeTotal = Object.values(statuses).filter((s) => s === "en_recrutement").length;

  const [aiCoachesOpen, setAiCoachesOpen] = useState(false);
  const acceptingAiCoaches = aiCoaches.filter((c) => c.accepting_new_clients).length;
  const totalAiCoachClients = aiCoaches.reduce((sum, c) => sum + c.clientCount, 0);

  const [apps, setApps] = useState<JobApplication[]>(applications);
  const newApplicationsForTab = apps.filter((a) => a.status === "nouvelle").length;

  // Onglets de haut niveau (2026-08-19, meme retour direct que sur
  // Programme/Diete/Roadmap : "regarde sur toute l'appli si tu trouve des
  // endroit ou c'est mieux de mettre un bouton... pour pas que ya trop de
  // truc d'un coup"). Cette page empilait 7 sections en permanence l'une
  // sous l'autre (chacune deja repliee en interne, mais toutes visibles a
  // la fois) — un seul onglet actif desormais, "Vue d'ensemble" reste seule
  // hors onglet (c'est un en-tete de stats, pas du contenu a parcourir).
  // Defaut intelligent : Candidatures si une nouvelle attend une reponse,
  // sinon Poles (section la plus consultee au quotidien).
  const [activeSection, setActiveSection] = useState<
    "coachs-ia" | "candidatures" | "poles" | "parcours" | "formation" | "fiche" | "contrats"
  >(newApplicationsForTab > 0 ? "candidatures" : "poles");
  const newApplications = apps.filter((a) => a.status === "nouvelle").length;
  const [appsOpen, setAppsOpen] = useState(true);

  async function handleChangeApplicationStatus(id: string, status: ApplicationStatus) {
    const backup = apps.find((a) => a.id === id)?.status;
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const result = await setApplicationStatus(id, status);
    if (result.error && backup) {
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status: backup } : a)));
    }
  }

  // Notes : pas de retour en arrière optimiste affiché (un échec silencieux
  // ici ne casse rien de visible), juste une tentative best effort au blur.
  function handleSaveNotes(id: string, notes: string) {
    setApplicationNotes(id, notes);
  }

  const [onboarding, setOnboarding] = useState<Record<string, OnboardingStepState[]>>(onboardingByApplication);
  async function handleToggleOnboarding(applicationId: string, stepKey: string, done: boolean) {
    const backup = onboarding[applicationId] ?? [];
    setOnboarding((prev) => {
      const current = prev[applicationId] ?? [];
      const withoutStep = current.filter((s) => s.step_key !== stepKey);
      return { ...prev, [applicationId]: [...withoutStep, { step_key: stepKey, done }] };
    });
    const result = await toggleOnboardingStep(applicationId, stepKey, done);
    if (result.error) {
      setOnboarding((prev) => ({ ...prev, [applicationId]: backup }));
    }
  }

  const [activePole, setActivePole] = useState<string>(poles[0]?.key ?? "");
  const currentPole = poles.find((p) => p.key === activePole) ?? poles[0];

  const [openTimeline, setOpenTimeline] = useState<Set<number>>(new Set([0]));
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set([0]));
  const [openContracts, setOpenContracts] = useState<Set<number>>(new Set());
  function toggleIn(setFn: (fn: (prev: Set<number>) => Set<number>) => void, i: number) {
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const [ficheOpen, setFicheOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const script = `Salut [Prénom] 👋 merci pour ton message !
Avant de te proposer un créneau avec [Closer], j'ai 2-3 questions
rapides pour être sûr qu'on te fasse gagner du temps :

1. Qu'est-ce qui te pousse à chercher un coach en ce moment ?
2. T'as déjà été coaché avant, ou c'est une première ?
3. Tu serais dispo cette semaine ou plutôt la semaine prochaine
   pour un appel de 20 min ?`;

  async function handleCopyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  // Optimiste, avec retour en arrière si le serveur refuse — même pattern
  // que le reste de l'appli (voir ClientNutritionView.tsx handleDelete).
  async function handleChangeStatus(roleKey: string, status: RoleStatus) {
    const backup = statuses[roleKey];
    setStatuses((prev) => ({ ...prev, [roleKey]: status }));
    const result = await setRoleStatus(roleKey, status);
    if (result.error) {
      setStatuses((prev) => ({ ...prev, [roleKey]: backup ?? "a_pourvoir" }));
    }
  }

  return (
    <>
      {/* ── Vue d'ensemble ── */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={14} className="text-[#E01E1E]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            Organigramme : {totalRoles} postes sur {poles.length} pôles
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-black text-white">{totalRoles - filledTotal - activeTotal}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-[#F5EDED]/45">À pourvoir</p>
          </div>
          <div className="bg-[#150000] border border-amber-500/20 rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-black text-amber-400">{activeTotal}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-amber-400/70">En recrutement</p>
          </div>
          <div className="bg-[#150000] border border-green-500/20 rounded-lg px-3 py-2.5 text-center">
            <p className="text-lg font-black text-green-400">{filledTotal}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider mt-0.5 text-green-400/70">Pourvus</p>
          </div>
        </div>
        <p className="text-[10.5px] text-[#F5EDED]/30 leading-relaxed">
          Chaque pôle peut démarrer à une seule personne, la structure tient même à 1 recrutement près.
          Clique un pôle ci-dessous pour voir ses postes, et le statut de chaque poste pour le mettre à jour.
        </p>
      </div>

      {/* ── Onglets de haut niveau ── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
        {(
          [
            { key: "coachs-ia" as const, label: "Coachs IA", icon: Bot, badge: aiCoaches.length || null },
            { key: "candidatures" as const, label: "Candidatures", icon: Inbox, badge: newApplicationsForTab || null },
            { key: "poles" as const, label: "Pôles & postes", icon: Building2, badge: null },
            { key: "parcours" as const, label: "Intégration", icon: Users, badge: null },
            { key: "formation" as const, label: "Formation", icon: GraduationCap, badge: null },
            { key: "fiche" as const, label: "Fiche exemple", icon: FileText, badge: null },
            { key: "contrats" as const, label: "Contrats", icon: ShieldAlert, badge: null },
          ]
        ).map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`relative flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border text-center transition-colors ${
              activeSection === key
                ? "bg-[#E01E1E]/12 border-[#E01E1E]/40 text-[#E01E1E]"
                : "bg-[#1f0101] border-[#890404]/20 text-[#F5EDED]/45 hover:border-[#890404]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            <Icon size={17} strokeWidth={activeSection === key ? 2.2 : 1.7} />
            <span className="text-[9px] font-bold uppercase tracking-wider leading-tight">{label}</span>
            {!!badge && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[8px] font-black bg-[#E01E1E] text-white">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Coachs IA (retour direct 2026-08-19 : "si c'est des coachs dans
          ma structure j'suis censé les voir dans organisation") — de vraies
          lignes profiles (lib/ai-coaches.ts), distinctes des 19 agents IA
          internes listés par pôle plus bas. Visibles aussi dans l'annuaire
          public /coachs et le choix de coach côté client, toujours avec le
          badge "Coach IA" (jamais présentés comme des humains). ── */}
      {activeSection === "coachs-ia" && aiCoaches.length > 0 && (
        <section className="mb-8">
          <SimpleAccordionItem
            open={aiCoachesOpen}
            onToggle={() => setAiCoachesOpen((v) => !v)}
            header={
              <div className="flex items-center gap-2">
                <Bot size={14} className="text-blue-400" />
                <h2 className="text-base font-black uppercase tracking-tight">Coachs IA</h2>
                <span className="text-[10px] font-bold text-[#F5EDED]/35">
                  {aiCoaches.length} · {acceptingAiCoaches} dispo · {totalAiCoachClients} client{totalAiCoachClients !== 1 ? "s" : ""}
                </span>
              </div>
            }
          >
            <p className="text-[10.5px] text-[#F5EDED]/30 leading-relaxed mb-3">
              Coachs à part entière dans ta structure, badgés &laquo;&nbsp;Coach IA&nbsp;&raquo; partout où un client les voit
              (annuaire, choix de coach, messagerie). Ils répondent réellement aux messages de leurs
              clients. Visible aussi sur{" "}
              <Link href="/coachs" target="_blank" className="text-[#E01E1E] hover:underline">
                l&apos;annuaire public
              </Link>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {aiCoaches.map((coach) => (
                <div key={coach.id} className="bg-[#150000] border border-[#890404]/20 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-xs font-black text-white truncate">{coach.full_name ?? "Coach IA"}</p>
                    <span
                      className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{
                        background: coach.accepting_new_clients ? "rgba(74,222,128,0.15)" : "rgba(245,237,237,0.08)",
                        color: coach.accepting_new_clients ? "#4ade80" : "rgba(245,237,237,0.4)",
                      }}
                    >
                      {coach.accepting_new_clients ? "Dispo" : "Complet"}
                    </span>
                  </div>
                  {coach.bio && (
                    <p className="text-[10.5px] text-[#F5EDED]/40 leading-relaxed line-clamp-2">{coach.bio}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {coach.specializations.slice(0, 2).map((s) => (
                      <span key={s} className="text-[9px] font-bold text-[#F5EDED]/35 bg-white/5 rounded-full px-1.5 py-0.5">
                        {s}
                      </span>
                    ))}
                    <span className="text-[9.5px] text-[#F5EDED]/25 ml-auto flex-shrink-0">
                      {coach.clientCount} client{coach.clientCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SimpleAccordionItem>
        </section>
      )}

      {/* ── Candidatures reçues (voir /carrieres) ── */}
      {activeSection === "candidatures" && (
      <section className="mb-8">
        <button
          onClick={() => setAppsOpen((v) => !v)}
          aria-expanded={appsOpen}
          className="w-full flex items-center justify-between gap-3 bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 text-left mb-3"
        >
          <div className="flex items-center gap-2">
            <Inbox size={14} className="text-[#E01E1E]" />
            <h2 className="text-base font-black uppercase tracking-tight">Candidatures reçues</h2>
            {newApplications > 0 && (
              <span className="text-[9px] font-black text-white bg-[#E01E1E] rounded-full px-1.5 py-0.5 min-w-[16px] text-center">
                {newApplications}
              </span>
            )}
          </div>
          <ChevronToggle open={appsOpen} />
        </button>
        {appsOpen && (
          apps.length === 0 ? (
            <p className="text-[11.5px] text-[#F5EDED]/30 italic px-1">
              Aucune candidature pour l&apos;instant. Le lien public est{" "}
              <span className="text-[#F5EDED]/50 font-mono">/carrieres</span>, à partager.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {apps.map((app) => (
                <ApplicationRow
                  key={app.id}
                  application={app}
                  roleTitle={roleTitleByKey[app.role_key] ?? app.role_key}
                  onChange={(s) => handleChangeApplicationStatus(app.id, s)}
                  onSaveNotes={(notes) => handleSaveNotes(app.id, notes)}
                  onboardingSteps={onboarding[app.id] ?? []}
                  onToggleOnboarding={(stepKey, done) => handleToggleOnboarding(app.id, stepKey, done)}
                />
              ))}
            </div>
          )
        )}
      </section>
      )}

      {/* ── Pôles (onglets) ── */}
      {activeSection === "poles" && (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Building2 size={14} className="text-[#E01E1E]" />
          <h2 className="text-base font-black uppercase tracking-tight">Pôles &amp; postes</h2>
        </div>
        <p className="text-[11px] text-[#F5EDED]/35 mb-3">
          Un onglet par pôle. Chaque poste a son agent IA prêt à discuter en attendant un vrai titulaire.
        </p>
        <PoleTabBar poles={poles} activeKey={activePole} onChange={setActivePole} statuses={statuses} />
        {currentPole && (
          <div className="grid sm:grid-cols-2 gap-3">
            {currentPole.roles.map((role) => (
              <RoleCardView
                key={role.key}
                role={role}
                color={currentPole.color}
                status={statuses[role.key] ?? "a_pourvoir"}
                onChange={(s) => handleChangeStatus(role.key, s)}
                openTaskCount={openTaskCountsByAgent[role.key] ?? 0}
              />
            ))}
          </div>
        )}
      </section>
      )}

      {/* ── Parcours d'intégration (accordéon) ── */}
      {activeSection === "parcours" && (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Users size={14} className="text-[#E01E1E]" />
          <h2 className="text-base font-black uppercase tracking-tight">Parcours d&apos;intégration</h2>
        </div>
        {timeline.map((t, i) => (
          <SimpleAccordionItem
            key={i}
            open={openTimeline.has(i)}
            onToggle={() => toggleIn(setOpenTimeline, i)}
            header={
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[10px] font-black text-[#E01E1E] flex-shrink-0">{t.when}</span>
                <span className="text-[13px] font-bold text-white truncate">{t.title}</span>
              </div>
            }
          >
            <p className="text-[11.5px] text-[#F5EDED]/50 leading-relaxed">{t.desc}</p>
          </SimpleAccordionItem>
        ))}
      </section>
      )}

      {/* ── Formation avant embauche (accordéon) ── */}
      {activeSection === "formation" && (
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap size={14} className="text-[#E01E1E]" />
          <h2 className="text-base font-black uppercase tracking-tight">Formation avant embauche</h2>
        </div>
        {phases.map((phase, i) => (
          <SimpleAccordionItem
            key={i}
            open={openPhases.has(i)}
            onToggle={() => toggleIn(setOpenPhases, i)}
            header={
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[#E01E1E]/15 text-[#E01E1E] font-black text-[11px] flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-[13px] font-bold text-white truncate">{phase.title}</span>
              </div>
            }
          >
            <p className="text-[11.5px] text-[#F5EDED]/50 leading-relaxed mb-2">{phase.desc}</p>
            {phase.status && (
              <span
                className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={
                  phase.ok
                    ? { background: "rgba(74,222,128,0.1)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }
                    : { background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }
                }
              >
                {phase.status}
              </span>
            )}
          </SimpleAccordionItem>
        ))}
      </section>
      )}

      {/* ── Fiche technique exemple (repliée par défaut) ── */}
      {activeSection === "fiche" && (
      <section className="mb-8">
        <button
          onClick={() => setFicheOpen((v) => !v)}
          aria-expanded={ficheOpen}
          className="w-full flex items-center justify-between gap-3 bg-[#1f0101] border border-[#890404]/25 rounded-xl px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={14} className="text-[#E01E1E] flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-black uppercase tracking-tight">Exemple de fiche technique</h2>
              <p className="text-[10.5px] text-[#F5EDED]/35 truncate">Setter : script, étapes, critères de passage en poste</p>
            </div>
          </div>
          <ChevronToggle open={ficheOpen} />
        </button>

        {ficheOpen && (
          <div className="bg-[#1f0101] border border-t-0 border-[#890404]/25 rounded-b-xl -mt-2 pt-4 p-5">
            <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
              <p className="text-[15px] font-black text-white">Setter : qualification de leads</p>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300">
                Pôle Sales
              </span>
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Objectif du poste</p>
              <p className="text-[12px] text-[#F5EDED]/55 leading-relaxed">
                Transformer un message ou un commentaire de quelqu&apos;un d&apos;intéressé en un rendez-vous
                qualifié dans l&apos;agenda du closer, sans jamais faire perdre de temps au closer avec un lead
                qui n&apos;ira nulle part.
              </p>
            </div>

            <div className="mb-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Étapes à maîtriser, dans l&apos;ordre</p>
              <ol className="space-y-1 pl-4 list-decimal">
                <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Répondre en moins de 2h en journée, avec un message qui relance une vraie conversation (jamais un lien direct en premier message)</li>
                <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Poser 3 questions de qualification : objectif, disponibilité budgétaire approximative, urgence</li>
                <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Repérer les signaux d&apos;un lead non qualifié et le laisser partir sans insister</li>
                <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Proposer 2 à 3 créneaux précis, jamais une question ouverte du type &quot;quand es-tu dispo&quot;</li>
                <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Confirmer le rendez-vous par écrit et programmer une relance automatique 24h avant</li>
                <li className="text-[12px] text-[#F5EDED]/55 leading-relaxed">Mettre à jour la fiche CRM du lead à chaque étape</li>
              </ol>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E]">Exemple de script de qualification</p>
                <button
                  onClick={handleCopyScript}
                  className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white hover:border-[#E01E1E]/50 transition-colors"
                >
                  {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                  {copied ? "Copié" : "Copier"}
                </button>
              </div>
              <pre className="bg-[#150000] border border-[#890404]/20 rounded-lg p-3 text-[11px] text-[#F5EDED]/60 leading-relaxed whitespace-pre-wrap font-mono">{script}</pre>
            </div>

            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#E01E1E] mb-1.5">Critères de passage en poste rémunéré</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { k: "Délai de réponse", v: "moins de 2h en journée sur 10 leads test" },
                  { k: "Qualification", v: "8/10 leads correctement qualifiés (audité par le Head of Sales)" },
                  { k: "Taux de présence", v: "au moins 70% des rendez-vous pris se présentent réellement" },
                  { k: "CRM à jour", v: "100% des leads traités ont une fiche complète" },
                ].map((c) => (
                  <div key={c.k} className="bg-[#150000] border border-[#890404]/15 rounded-lg px-3 py-2">
                    <p className="text-[11.5px] text-[#F5EDED]/60"><strong className="text-white font-bold">{c.k}</strong> : {c.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {/* ── Contrats & légal (accordéon) ── */}
      {activeSection === "contrats" && (
      <section className="mb-6">
        <h2 className="text-base font-black uppercase tracking-tight mb-3">Contrats &amp; aspects légaux</h2>
        {contracts.map((c, i) => (
          <SimpleAccordionItem
            key={c.title}
            open={openContracts.has(i)}
            onToggle={() => toggleIn(setOpenContracts, i)}
            header={<span className="text-[13px] font-bold text-white">{c.title}</span>}
          >
            <p className="text-[11.5px] text-[#F5EDED]/45 leading-relaxed">{c.desc}</p>
          </SimpleAccordionItem>
        ))}

        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/25 rounded-xl px-4 py-3.5 mt-4">
          <ShieldAlert size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[12.5px] font-bold text-amber-300 mb-1">Ce document ne remplace pas un avocat</p>
            <p className="text-[11.5px] text-amber-300/75 leading-relaxed">
              Les fiches de poste, la trame d&apos;intégration et le déroulé de formation avant embauche
              ci-dessus sont des points de départ utilisables tels quels. Les contrats de travail, eux,
              doivent être rédigés ou validés par un avocat en droit du travail avant toute signature, à
              faire avant le premier recrutement, pas après.
            </p>
          </div>
        </div>
      </section>
      )}
    </>
  );
}
