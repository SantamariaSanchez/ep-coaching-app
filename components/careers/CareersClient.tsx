"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Send, Check, Circle, Wallet, ShieldCheck, CalendarCheck, FileUp } from "lucide-react";
import type { Pole, RoleStatus } from "@/components/ui/OrganisationView";
import { submitApplication } from "@/app/carrieres/actions";
import {
  QUALIFYING_QUESTIONS,
  CAREERS_INTERVIEW_BOOKING_URL,
  type QualifyingAnswerKey,
  type QualifyingAnswers,
} from "@/lib/job-applications-shared";
import { onKeyActivate } from "@/lib/a11y";

const STATUS_META: Record<RoleStatus, { label: string; color: string }> = {
  a_pourvoir: { label: "Poste ouvert", color: "#4ade80" },
  en_recrutement: { label: "En cours de recrutement", color: "#fbbf24" },
  pourvu: { label: "Poste pourvu", color: "rgba(245,237,237,0.35)" },
};

function ApplyForm({ roleKey, roleTitle }: { roleKey: string; roleTitle: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [answers, setAnswers] = useState<QualifyingAnswers>({});
  const [cv, setCv] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function setAnswer(key: QualifyingAnswerKey, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function pickCv(file: File | null) {
    setError(null);
    if (!file) return setCv(null);
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setCv(null);
      return setError("Le CV doit être un fichier PDF.");
    }
    if (file.size > 5 * 1024 * 1024) {
      setCv(null);
      return setError("Ton CV dépasse 5 Mo, compresse-le puis réessaie.");
    }
    setCv(file);
  }

  function submit() {
    setError(null);
    if (!cv) {
      setError("Ton CV en PDF est requis.");
      return;
    }
    const form = new FormData();
    form.set("roleKey", roleKey);
    form.set("roleTitle", roleTitle);
    form.set("fullName", fullName);
    form.set("email", email);
    form.set("phone", phone);
    form.set("answers", JSON.stringify(answers));
    form.set("cv", cv);
    startTransition(async () => {
      const result = await submitApplication(form);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 bg-[#0D2B15] border border-[#4ade80]/25 rounded-lg px-3 py-2.5">
          <Check size={14} className="text-[#4ade80] flex-shrink-0" />
          <p className="text-[11px] text-[#4ade80] font-semibold">
            {CAREERS_INTERVIEW_BOOKING_URL
              ? "Candidature envoyée et vraiment lue."
              : "Candidature envoyée. Elle est vraiment lue : si ça matche, tu es recontacté pour un appel."}
          </p>
        </div>
        {/* Dès que CAREERS_INTERVIEW_BOOKING_URL est renseigné (voir
            job-applications-shared.ts), la réservation devient immédiate au
            lieu de faire attendre un email — c'est tout l'objet du chantier
            "de la page carrières jusqu'à l'appel" du 2026-09-08. */}
        {CAREERS_INTERVIEW_BOOKING_URL && (
          <a
            href={CAREERS_INTERVIEW_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ep-btn-primary w-full"
            style={{ height: 44, borderRadius: "var(--radius-sm)", textDecoration: "none" }}
          >
            <CalendarCheck size={13} />
            Réserve ton entretien (20 min)
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()} role="presentation">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Nom complet" aria-label="Nom complet"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email" aria-label="Email"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        placeholder="Téléphone (optionnel)" aria-label="Téléphone (optionnel)"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
      />

      {/* Qualification (2026-09-08) : ce qui distingue une candidature
          alignée d'un formulaire rempli au hasard, avant même le premier
          échange. */}
      <div className="pt-1 pb-0.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
          Quelques questions, pour de vrai
        </p>
      </div>
      {QUALIFYING_QUESTIONS.map((q) => (
        <div key={q.key}>
          <label className="block text-[11px] font-semibold text-[#F5EDED]/60 mb-1">
            {q.label}
            {!q.required && <span className="text-[#F5EDED]/25"> (optionnel)</span>}
          </label>
          <textarea
            value={answers[q.key] ?? ""}
            onChange={(e) => setAnswer(q.key, e.target.value)}
            placeholder={q.placeholder}
            aria-label={q.label}
            rows={q.key === "motivation" ? 3 : 2}
            className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 resize-none"
          />
        </div>
      ))}

      {/* CV obligatoire (demande directe 2026-09-25), en plus des questions
          de qualification. */}
      <div>
        <label className="block text-[11px] font-semibold text-[#F5EDED]/60 mb-1" htmlFor={`cv-${roleKey}`}>
          Ton CV (PDF, 5 Mo max)
        </label>
        <label
          htmlFor={`cv-${roleKey}`}
          className="flex items-center gap-2 w-full bg-[#150000] border border-dashed border-[#890404]/40 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-[#E01E1E]/60"
        >
          <FileUp size={15} className="text-[#E01E1E] flex-shrink-0" />
          <span className={cv ? "text-white truncate" : "text-[#F5EDED]/35"}>{cv ? cv.name : "Choisir mon CV en PDF"}</span>
        </label>
        <input
          id={`cv-${roleKey}`}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => pickCv(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <button
        onClick={submit}
        disabled={isPending}
        className="ep-btn-primary w-full disabled:opacity-50"
        style={{ height: 44, borderRadius: "var(--radius-sm)" }}
      >
        <Send size={13} />
        {isPending ? "Envoi…" : "Envoyer ma candidature"}
      </button>
    </div>
  );
}

function RoleCardPublic({
  role,
  status,
}: {
  role: Pole["roles"][number];
  status: RoleStatus;
}) {
  const [open, setOpen] = useState(false);
  const meta = STATUS_META[status];
  const applyable = status !== "pourvu";

  return (
    <div className="bg-[#150000] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-bold text-white">{role.title}</h3>
        <span
          className="flex-shrink-0 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ color: meta.color, border: `1px solid ${meta.color}44` }}
        >
          <Circle size={6} fill={meta.color} stroke="none" />
          {meta.label}
        </span>
      </div>
      <p className="text-[12px] text-[#F5EDED]/45 leading-relaxed mb-2.5">{role.mission}</p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {role.levels.map((l) => (
          <span
            key={l}
            className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/40 border border-[#890404]/25 rounded-full px-2 py-0.5"
          >
            {l}
          </span>
        ))}
      </div>

      {/* Rémunération (retour direct 2026-09-02 : "ya toujours pas les
          salaires affichés, corrige et mets les") — variable et fixe
          affichés séparément, jamais mélangés, cohérent avec le statut de
          collaboration indépendante rappelé en haut de page. */}
      <div
        className="rounded-lg px-3 py-2.5 mb-3"
        style={{ background: "rgba(217,169,78,0.07)", border: "1px solid rgba(217,169,78,0.2)" }}
      >
        <div className="flex items-center gap-1.5 mb-1.5">
          <Wallet size={11} style={{ color: "var(--ep-gold)" }} />
          <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--ep-gold)" }}>
            Rémunération
          </span>
        </div>
        {/* Les gains en euros d'abord, avant les pourcentages : un candidat veut
            savoir ce qu'il gagne, pas faire le calcul lui-meme (retour direct
            2026-09-08, "les salaires il n'y a pas de chiffre ou de fourchette clair"). */}
        {role.compensation.earnings && (
          <p className="text-[13px] font-bold leading-relaxed mb-2" style={{ color: "var(--ep-gold)" }}>
            {role.compensation.earnings}
          </p>
        )}
        {role.compensation.variable && (
          <p className="text-[11px] text-[#F5EDED]/70 leading-relaxed">
            <span className="font-bold text-[#F5EDED]/90">Variable </span>{role.compensation.variable}
          </p>
        )}
        {role.compensation.fixed && (
          <p className="text-[11px] text-[#F5EDED]/70 leading-relaxed mt-1">
            <span className="font-bold text-[#F5EDED]/90">Fixe </span>{role.compensation.fixed}
          </p>
        )}
      </div>

      {role.nonNegotiable.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <ShieldCheck size={11} className="text-[#F5EDED]/35" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
              Non négociable
            </span>
          </div>
          <ul className="space-y-1">
            {role.nonNegotiable.map((n) => (
              <li key={n} className="text-[11px] text-[#F5EDED]/55 leading-relaxed pl-3 relative">
                <span className="absolute left-0" style={{ color: "#890404" }}>·</span>
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {applyable ? (
        <>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="text-[11px] font-bold uppercase tracking-widest text-[#E01E1E] flex items-center gap-1"
          >
            Postuler
            <ChevronDown size={13} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {open && <ApplyForm roleKey={role.key} roleTitle={role.title} />}
        </>
      ) : (
        <p className="text-[11px] text-[#F5EDED]/30 italic">
          Poste actuellement pourvu, reviens vérifier plus tard.
        </p>
      )}
    </div>
  );
}

function PoleSection({
  pole,
  statuses,
  defaultOpen,
}: {
  pole: Pole;
  statuses: Record<string, RoleStatus>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const openCount = pole.roles.filter((r) => (statuses[r.key] ?? "a_pourvoir") !== "pourvu").length;

  return (
    <div className="ep-card rounded-2xl overflow-hidden mb-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyActivate(() => setOpen((o) => !o))}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: pole.color }} />
          <span className="text-sm font-bold text-white">{pole.name}</span>
          <span className="text-[10px] text-[#F5EDED]/30 font-semibold">
            {openCount} poste{openCount > 1 ? "s" : ""} ouvert{openCount > 1 ? "s" : ""}
          </span>
        </div>
        <ChevronDown size={16} className={`text-[#F5EDED]/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-2.5">
          {pole.roles.map((role) => (
            <RoleCardPublic key={role.key} role={role} status={statuses[role.key] ?? "a_pourvoir"} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CareersClient({
  poles,
  statuses,
}: {
  poles: Pole[];
  statuses: Record<string, RoleStatus>;
}) {
  return (
    <div>
      {poles.map((pole, i) => (
        <PoleSection key={pole.key} pole={pole} statuses={statuses} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
