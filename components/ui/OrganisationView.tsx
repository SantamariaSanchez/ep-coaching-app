"use client";

import { useState } from "react";
import {
  Building2, Users, GraduationCap, FileText, ShieldAlert,
  ChevronDown, Copy, Check,
} from "lucide-react";

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

export type RoleStatus = "a_pourvoir" | "en_recrutement" | "pourvu";

export interface RoleCard {
  key: string;
  title: string;
  mission: string;
  levels: string[];
  tasks: string[];
  reportsTo: string;
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
}: {
  role: RoleCard;
  color: string;
  status: RoleStatus;
  onChange: (s: RoleStatus) => void;
}) {
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
      <p className="text-[10px] text-[#F5EDED]/30 pt-2 mt-2 border-t border-dashed border-[#890404]/15">
        Rattaché à : <strong className="text-[#F5EDED]/55 font-bold">{role.reportsTo}</strong>
      </p>
      <RoleStatusPicker status={status} onChange={onChange} />
    </div>
  );
}

function PoleAccordion({
  pole,
  open,
  onToggle,
  statuses,
  onChangeStatus,
}: {
  pole: Pole;
  open: boolean;
  onToggle: () => void;
  statuses: Record<string, RoleStatus>;
  onChangeStatus: (roleKey: string, status: RoleStatus) => void;
}) {
  const filled = pole.roles.filter((r) => statuses[r.key] === "pourvu").length;
  return (
    <div className="mb-3 rounded-xl overflow-hidden border" style={{ borderColor: `${pole.color}35` }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
        style={{ background: open ? `${pole.color}12` : "transparent" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pole.color }} />
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-tight truncate">{pole.name}</h2>
            <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
              {pole.roles.length} poste{pole.roles.length > 1 ? "s" : ""}
              {filled > 0 && <span style={{ color: "#4ade80" }}> · {filled} pourvu{filled > 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        <ChevronToggle open={open} />
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 grid sm:grid-cols-2 gap-3 bg-[#150000]/40">
          {pole.roles.map((role) => (
            <RoleCardView
              key={role.key}
              role={role}
              color={pole.color}
              status={statuses[role.key] ?? "a_pourvoir"}
              onChange={(s) => onChangeStatus(role.key, s)}
            />
          ))}
        </div>
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
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        {header}
        <ChevronToggle open={open} />
      </button>
      {open && <div className="px-4 pb-4 pt-0.5">{children}</div>}
    </div>
  );
}

export default function OrganisationView({
  poles,
  timeline,
  phases,
  contracts,
  initialStatuses,
  setRoleStatus,
}: {
  poles: Pole[];
  timeline: TimelineStep[];
  phases: Phase[];
  contracts: Contract[];
  initialStatuses: Record<string, RoleStatus>;
  setRoleStatus: (roleKey: string, status: RoleStatus) => Promise<{ error?: string }>;
}) {
  const totalRoles = poles.reduce((sum, p) => sum + p.roles.length, 0);
  const [statuses, setStatuses] = useState<Record<string, RoleStatus>>(initialStatuses);
  const filledTotal = Object.values(statuses).filter((s) => s === "pourvu").length;
  const activeTotal = Object.values(statuses).filter((s) => s === "en_recrutement").length;

  const [openPoles, setOpenPoles] = useState<Set<string>>(new Set([poles[0]?.key].filter((k): k is string => !!k)));
  function togglePole(key: string) {
    setOpenPoles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

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

      {/* ── Pôles (accordéon) ── */}
      <section className="mb-8">
        {poles.map((pole) => (
          <PoleAccordion
            key={pole.key}
            pole={pole}
            open={openPoles.has(pole.key)}
            onToggle={() => togglePole(pole.key)}
            statuses={statuses}
            onChangeStatus={handleChangeStatus}
          />
        ))}
      </section>

      {/* ── Parcours d'intégration (accordéon) ── */}
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

      {/* ── Formation avant embauche (accordéon) ── */}
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

      {/* ── Fiche technique exemple (repliée par défaut) ── */}
      <section className="mb-8">
        <button
          onClick={() => setFicheOpen((v) => !v)}
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

      {/* ── Contrats & légal (accordéon) ── */}
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
    </>
  );
}
