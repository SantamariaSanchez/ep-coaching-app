"use client";

// Remplace l'ancien ResourceManager.tsx (upload de PDF, retiré 2026-09-02 :
// "c'est inutile maintenant car c'est toi qui les fais"). Un coach ajoute
// ici son propre lead magnet (distinct du catalogue officiel produit par la
// routine IA, déjà consultable juste au dessus via LeadMagnetsExplorer) :
// voir app/dashboard/coach/ressources/leadmagnet-actions.ts.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Trash2, Eye, EyeOff, Hash, BookOpen, ListChecks } from "lucide-react";
import { RESOURCE_CATEGORIES } from "@/lib/resource-categories";
import type { CoachLeadMagnet } from "@/lib/lead-magnets";
import {
  createCoachLeadMagnet,
  deleteCoachLeadMagnet,
  toggleCoachLeadMagnetPublished,
} from "@/app/dashboard/coach/ressources/leadmagnet-actions";

type Format = "guide" | "checklist";

export default function CoachLeadMagnetManager({ ownMagnets }: { ownMagnets: CoachLeadMagnet[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [category, setCategory] = useState<string>(RESOURCE_CATEGORIES[0]);
  const [format, setFormat] = useState<Format>("guide");
  const [body, setBody] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const bodyHint = useMemo(
    () =>
      format === "guide"
        ? "Un paragraphe par idée, sépare-les par une ligne vide."
        : "Un élément par ligne (au moins 2).",
    [format]
  );

  async function handleCreate() {
    if (!title.trim() || !hook.trim() || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    const res = await createCoachLeadMagnet({
      title,
      hook,
      category,
      format,
      body,
      sourceLabel: sourceLabel.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setSaving(false);
    if (res.error) {
      setError(res.error);
    } else {
      setTitle("");
      setHook("");
      setBody("");
      setSourceLabel("");
      setSourceUrl("");
      setOpen(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce lead magnet ? Le lien ne fonctionnera plus.")) return;
    setBusyId(id);
    try {
      await deleteCoachLeadMagnet(id);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(id: string, next: boolean) {
    setBusyId(id);
    try {
      await toggleCoachLeadMagnetPublished(id, next);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mt-8 pt-6 border-t border-[#890404]/15">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-[#E01E1E]" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35">
            Mes lead magnets
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff3b3b] transition-colors"
        >
          <Plus size={13} strokeWidth={2.5} /> {open ? "Annuler" : "Ajouter le mien"}
        </button>
      </div>
      <p className="text-[11px] text-[#F5EDED]/35 mb-4">
        En plus du catalogue EP Coaching ci-dessus (déjà accessible à tous les coachs), tu peux ajouter
        tes propres guides ou checklists. Ils apparaissent au même endroit, pour toi et tes clients.
      </p>

      {open && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-5 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre (ex. Ma routine d'échauffement épaules)"
            aria-label="Titre"
            className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
          />
          <input
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            placeholder="Accroche (une phrase, affichée avant le contenu)"
            aria-label="Accroche"
            className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
          />
          <div className="flex items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Catégorie"
              className="flex-1 bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E01E1E]/40"
            >
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex bg-[#150000] border border-[#890404]/20 rounded-lg p-0.5">
              <button
                onClick={() => setFormat("guide")}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                  format === "guide" ? "bg-[#E01E1E] text-white" : "text-[#F5EDED]/45"
                }`}
              >
                <BookOpen size={12} /> Guide
              </button>
              <button
                onClick={() => setFormat("checklist")}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                  format === "checklist" ? "bg-[#E01E1E] text-white" : "text-[#F5EDED]/45"
                }`}
              >
                <ListChecks size={12} /> Checklist
              </button>
            </div>
          </div>
          <div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={format === "guide" ? "Le contenu, en paragraphes..." : "Un élément par ligne..."}
              aria-label="Contenu"
              rows={6}
              className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40 resize-y"
            />
            <p className="text-[10px] text-[#F5EDED]/30 mt-1">{bodyHint}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="Source (optionnel)"
              aria-label="Source"
              className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
            />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="Lien de la source (optionnel)"
              aria-label="Lien de la source"
              className="bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
            />
          </div>
          <div className="flex items-center justify-end pt-1">
            <button
              onClick={handleCreate}
              disabled={!title.trim() || !hook.trim() || !body.trim() || saving}
              className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus size={13} strokeWidth={2.5} />
              )}
              Publier
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      )}

      {ownMagnets.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-8 text-center">
          <Sparkles size={22} className="text-[#F5EDED]/15 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucun lead magnet perso pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ownMagnets.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 bg-[#1f0101] border border-[#890404]/20 rounded-xl px-4 py-3.5"
            >
              <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
                <Sparkles size={15} className="text-[#890404]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{m.title}</p>
                <p className="text-[10px] text-[#F5EDED]/35 flex items-center gap-2">
                  <span className="flex items-center gap-1"><Hash size={9} />{m.keyword}</span>
                  <span>{m.category}</span>
                  {!m.published && <span className="text-amber-400">Masqué</span>}
                </p>
              </div>
              <button
                onClick={() => handleToggle(m.id, !m.published)}
                disabled={busyId === m.id}
                className="text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors p-1.5 disabled:opacity-40"
                title={m.published ? "Masquer" : "Republier"}
              >
                {m.published ? <Eye size={15} strokeWidth={1.8} /> : <EyeOff size={15} strokeWidth={1.8} />}
              </button>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={busyId === m.id}
                className="text-[#F5EDED]/25 hover:text-red-500 transition-colors p-1.5 disabled:opacity-40"
                title="Supprimer"
                aria-label="Supprimer"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
