"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Send, Check, Circle } from "lucide-react";
import type { Pole, RoleStatus } from "@/components/ui/OrganisationView";
import { submitApplication } from "@/app/carrieres/actions";
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
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitApplication(roleKey, roleTitle, fullName, email, phone);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="flex items-center gap-2 bg-[#0D2B15] border border-[#4ade80]/25 rounded-lg px-3 py-2.5 mt-3">
        <Check size={14} className="text-[#4ade80] flex-shrink-0" />
        <p className="text-[11px] text-[#4ade80] font-semibold">
          Candidature envoyée, on te recontacte par email.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()} role="presentation">
      <input
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Nom complet"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        type="email"
        placeholder="Email"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        type="tel"
        placeholder="Téléphone (optionnel)"
        className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60"
      />
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
