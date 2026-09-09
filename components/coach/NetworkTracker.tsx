"use client";

import { useMemo, useState } from "react";
import { Users, Plus, StickyNote, Trash2 } from "lucide-react";
import type { NetworkContact, ContactCategory, ContactStatus } from "@/lib/coach-network";
import {
  createNetworkContact,
  updateContactStatus,
  updateContactNote,
  deleteNetworkContact,
} from "@/app/dashboard/coach/business/network-actions";

// Réseau & partenariats (Axe 6, passe "masterclass" 2026-09-09) : un CRM
// léger pour tout ce qui fait grandir un business de coach en dehors de
// ses propres clients — partenaires, affiliés, influenceurs, fournisseurs.
// Distinct de la table leads (données plateforme captées automatiquement) :
// ici, c'est le coach qui construit sa liste lui-même.

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  partenaire: "Partenaire",
  affilie: "Affilié",
  influenceur: "Influenceur",
  fournisseur: "Fournisseur",
  autre: "Autre",
};

const STATUS_LABELS: Record<ContactStatus, string> = {
  a_contacter: "À contacter",
  en_discussion: "En discussion",
  actif: "Actif",
  inactif: "Inactif",
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  a_contacter: "#F5EDED",
  en_discussion: "#facc15",
  actif: "#4ade80",
  inactif: "rgba(245,237,237,0.35)",
};

const STATUS_ORDER: ContactStatus[] = ["a_contacter", "en_discussion", "actif", "inactif"];

function ContactRow({ contact }: { contact: NetworkContact }) {
  const [status, setStatus] = useState(contact.status);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(contact.note ?? "");
  const [savingNote, setSavingNote] = useState(false);

  async function handleStatusChange(next: ContactStatus) {
    const prev = status;
    setStatus(next);
    const res = await updateContactStatus(contact.id, next);
    if (res.error) setStatus(prev);
  }

  async function handleSaveNote() {
    setSavingNote(true);
    const res = await updateContactNote(contact.id, note);
    setSavingNote(false);
    if (!res.error) setNoteOpen(false);
  }

  return (
    <div className="rounded-xl bg-[#1f0101] border border-[#890404]/20 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white truncate">{contact.name}</p>
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#150000] border border-[#890404]/25 text-[#F5EDED]/40 flex-shrink-0">
              {CATEGORY_LABELS[contact.category]}
            </span>
          </div>
          {contact.contact_info && <p className="text-[11px] text-[#F5EDED]/45 mt-0.5 truncate">{contact.contact_info}</p>}
        </div>
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as ContactStatus)}
          aria-label={`Statut de ${contact.name}`}
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
        <button
          type="button"
          onClick={() => deleteNetworkContact(contact.id)}
          aria-label="Supprimer ce contact"
          className="text-[#F5EDED]/15 hover:text-red-400 flex-shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {noteOpen ? (
        <div className="mt-2.5 space-y-1.5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (ex. contacté le 12/09 pour un partenariat croisé, en attente de réponse)"
            rows={2}
            aria-label="Note"
            className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setNote(contact.note ?? "");
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
          {contact.note ? <span className="text-[#F5EDED]/55 italic truncate">{contact.note}</span> : "Ajouter une note"}
        </button>
      )}
    </div>
  );
}

function NewContactForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ContactCategory>("partenaire");
  const [contactInfo, setContactInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    const res = await createNetworkContact({ name, category, contact_info: contactInfo || null });
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onClose();
  }

  return (
    <div className="rounded-lg border border-[#890404]/25 bg-[#150000] p-3.5 space-y-2.5 mb-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom"
        aria-label="Nom du contact"
        className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
      />
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CATEGORY_LABELS) as ContactCategory[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
            style={{
              background: category === c ? "rgba(224,30,30,0.15)" : "transparent",
              borderColor: category === c ? "rgba(224,30,30,0.5)" : "rgba(137,4,4,0.25)",
              color: category === c ? "#fff" : "rgba(245,237,237,0.45)",
            }}
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <input
        value={contactInfo}
        onChange={(e) => setContactInfo(e.target.value)}
        placeholder="Email, tél ou Instagram (optionnel)"
        aria-label="Coordonnées"
        className="w-full bg-[#0D0000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 outline-none focus:border-[#E01E1E]/60"
      />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onClose} className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-white px-2">
          Annuler
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !name.trim()}
          className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg py-2.5"
        >
          {saving ? "Ajout…" : "Ajouter"}
        </button>
      </div>
    </div>
  );
}

export default function NetworkTracker({ contacts }: { contacts: NetworkContact[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [contacts]);

  const visible = statusFilter === "all" ? contacts : contacts.filter((c) => c.status === statusFilter);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setStatusFilter("all")}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
            style={{
              background: statusFilter === "all" ? "rgba(224,30,30,0.14)" : "transparent",
              borderColor: statusFilter === "all" ? "rgba(224,30,30,0.35)" : "rgba(137,4,4,0.25)",
              color: statusFilter === "all" ? "#E01E1E" : "rgba(245,237,237,0.45)",
            }}
          >
            Tous {contacts.length > 0 && <span className="opacity-65">{contacts.length}</span>}
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border"
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
        {!formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] flex-shrink-0"
          >
            <Plus size={12} /> Contact
          </button>
        )}
      </div>

      {formOpen && <NewContactForm onClose={() => setFormOpen(false)} />}

      {visible.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 text-center">
          <Users size={22} className="text-[#F5EDED]/15 mx-auto mb-2.5" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">
            {contacts.length === 0
              ? "Aucun contact pour l'instant. Ajoute un partenaire, un affilié ou un influenceur à suivre."
              : "Aucun contact ne correspond à ce filtre."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((c) => (
            <ContactRow key={c.id} contact={c} />
          ))}
        </div>
      )}
    </div>
  );
}
