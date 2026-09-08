"use client";

import { useMemo, useState } from "react";
import { Mail, Phone, Bot, Search, X, StickyNote } from "lucide-react";
import type { Lead, LeadStatus } from "@/utils/leads";

// Pipeline de suivi manuel des leads (20260909b/c) : avant, cet écran
// n'était qu'un journal en lecture seule (email/tel/date), aucune façon de
// savoir qui a déjà été contacté ni de laisser une trace du suivi. Demande
// directe 2026-09-09 : "lead" cité en exemple d'onglet qui ne sert à rien
// d'utile mais que de l'info, doit devenir un vrai outil.

const STATUS_LABELS: Record<LeadStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  interesse: "Intéressé",
  converti: "Converti",
  perdu: "Perdu",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  nouveau: "#F5EDED",
  contacte: "#facc15",
  interesse: "#60a5fa",
  converti: "#4ade80",
  perdu: "rgba(245,237,237,0.4)",
};

const STATUS_ORDER: LeadStatus[] = ["nouveau", "contacte", "interesse", "converti", "perdu"];

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function LeadRow({
  lead,
  magnetTitle,
  updateLeadStatus,
  updateLeadNote,
}: {
  lead: Lead;
  magnetTitle: string;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<{ error?: string }>;
  updateLeadNote: (leadId: string, note: string) => Promise<{ error?: string }>;
}) {
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(lead.coach_note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  async function handleStatusChange(next: LeadStatus) {
    const prev = status;
    setStatus(next); // optimiste : ne bloque jamais le select le temps de l'aller-retour serveur
    const res = await updateLeadStatus(lead.id, next);
    if (res.error) setStatus(prev);
  }

  async function handleSaveNote() {
    setSavingNote(true);
    const res = await updateLeadNote(lead.id, note);
    setSavingNote(false);
    if (!res.error) setNoteOpen(false);
  }

  return (
    <div className="rounded-xl bg-[#1f0101] border border-[#890404]/20 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{magnetTitle}</p>
            {lead.qualification_sent_at && (
              <span
                title={`Email de qualification envoyé le ${formatDate(lead.qualification_sent_at)}`}
                className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/35 flex-shrink-0"
              >
                <Bot size={9} /> Setter IA
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {lead.email && (
              <span className="flex items-center gap-1 text-[11px] text-[#F5EDED]/50">
                <Mail size={10} /> {lead.email}
              </span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-1 text-[11px] text-[#F5EDED]/50">
                <Phone size={10} /> {lead.phone}
              </span>
            )}
          </div>
        </div>

        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
          aria-label={`Statut de ${lead.email ?? lead.phone ?? "ce lead"}`}
          className="flex-shrink-0"
          style={{
            background: "#150000",
            border: "1px solid rgba(137,4,4,0.3)",
            borderRadius: 8,
            fontSize: 10.5,
            fontWeight: 700,
            padding: "6px 8px",
            color: STATUS_COLORS[status],
            outline: "none",
          }}
        >
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} style={{ color: "#F5EDED", background: "#150000" }}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <span className="text-[10px] text-[#F5EDED]/25 flex-shrink-0 hidden sm:block">
          {formatDate(lead.created_at)}
        </span>
      </div>

      {noteOpen ? (
        <div className="mt-2.5 space-y-1.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note de suivi (ex. appelé le 12/09, pas de réponse, relancer semaine prochaine)"
            rows={2}
            aria-label="Note de suivi"
            className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNote(lead.coach_note ?? "");
                setNoteOpen(false);
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-white px-2"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote}
              className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg px-3 py-1.5"
            >
              {savingNote ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="flex items-center gap-1.5 mt-2 text-[10.5px] text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors"
        >
          <StickyNote size={11} />
          {lead.coach_note ? <span className="text-[#F5EDED]/55 italic truncate">{lead.coach_note}</span> : "Ajouter une note"}
        </button>
      )}
    </div>
  );
}

export default function LeadsPipeline({
  leads,
  magnetTitleBySlug,
  updateLeadStatus,
  updateLeadNote,
}: {
  leads: Lead[];
  magnetTitleBySlug: Record<string, string>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<{ error?: string }>;
  updateLeadNote: (leadId: string, note: string) => Promise<{ error?: string }>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
    return counts;
  }, [leads]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${l.email ?? ""} ${l.phone ?? ""} ${magnetTitleBySlug[l.lead_magnet_slug] ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [leads, query, statusFilter, magnetTitleBySlug]);

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        <button
          onClick={() => setStatusFilter("all")}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-colors"
          style={{
            background: statusFilter === "all" ? "rgba(224,30,30,0.14)" : "transparent",
            borderColor: statusFilter === "all" ? "rgba(224,30,30,0.35)" : "rgba(137,4,4,0.25)",
            color: statusFilter === "all" ? "#E01E1E" : "rgba(245,237,237,0.45)",
          }}
        >
          Tous {leads.length > 0 && <span className="opacity-65">{leads.length}</span>}
        </button>
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-colors"
            style={{
              background: statusFilter === s ? "rgba(224,30,30,0.14)" : "transparent",
              borderColor: statusFilter === s ? "rgba(224,30,30,0.35)" : "rgba(137,4,4,0.25)",
              color: statusFilter === s ? "#E01E1E" : "rgba(245,237,237,0.45)",
            }}
          >
            {STATUS_LABELS[s]} {countByStatus[s] > 0 && <span className="opacity-65">{countByStatus[s]}</span>}
          </button>
        ))}
      </div>

      <div className="relative mb-4" style={{ maxWidth: 340 }}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Chercher un email, un numéro, un lead magnet"
          aria-label="Chercher un lead"
          className="w-full bg-[#150000] border border-[#890404]/30 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            aria-label="Effacer la recherche"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#F5EDED]/35 hover:text-white"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <Mail size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">
            {leads.length === 0 ? "Aucun lead capté pour l'instant." : "Aucun lead ne correspond."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              magnetTitle={magnetTitleBySlug[lead.lead_magnet_slug] ?? lead.lead_magnet_slug}
              updateLeadStatus={updateLeadStatus}
              updateLeadNote={updateLeadNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
