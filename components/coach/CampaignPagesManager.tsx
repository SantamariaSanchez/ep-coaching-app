"use client";

import { useState, useTransition } from "react";
import { Plus, Copy, Check, Trash2, Eye, Link2 } from "lucide-react";
import {
  createCampaignPage,
  toggleCampaignPage,
  deleteCampaignPage,
} from "@/app/dashboard/coach/studio/campaign-actions";
import { slugify } from "@/lib/campaign-pages";
import type { CampaignPage } from "@/lib/campaign-pages";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60";

function CampaignRow({
  page,
  onToggle,
  onDelete,
}: {
  page: CampaignPage;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ep-coaching.vercel.app";
  const link = `${origin}/c/${page.slug}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-bold text-white">{page.headline}</p>
        <button
          onClick={() => onToggle(page.id, !page.is_active)}
          className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
          style={
            page.is_active
              ? { background: "rgba(74,222,128,0.1)", borderColor: "rgba(74,222,128,0.3)", color: "#4ade80" }
              : { background: "rgba(245,237,237,0.05)", borderColor: "rgba(245,237,237,0.15)", color: "rgba(245,237,237,0.4)" }
          }
        >
          {page.is_active ? "Active" : "Désactivée"}
        </button>
      </div>
      <div className="flex items-center gap-2 mb-2.5">
        <Link2 size={12} className="text-[#E01E1E] flex-shrink-0" />
        <span className="text-[11.5px] text-[#F5EDED]/50 truncate">{link}</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-[#890404]/30 text-[#F5EDED]/50 hover:text-white hover:border-[#E01E1E]/50 transition-colors"
        >
          {copied ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
          {copied ? "Copié" : "Copier"}
        </button>
        <span className="inline-flex items-center gap-1 text-[10px] text-[#F5EDED]/30">
          <Eye size={11} /> {page.view_count} vue{page.view_count > 1 ? "s" : ""}
        </span>
        <button
          onClick={() => onDelete(page.id)}
          className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-red-400/70 hover:text-red-400"
        >
          <Trash2 size={11} /> Supprimer
        </button>
      </div>
    </div>
  );
}

export default function CampaignPagesManager({ initialPages }: { initialPages: CampaignPage[] }) {
  const [pages, setPages] = useState(initialPages);
  const [showForm, setShowForm] = useState(false);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Rejoindre gratuitement");
  const [ctaHref, setCtaHref] = useState("/auth/client");
  const [slugHint, setSlugHint] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewSlug = slugify(slugHint || headline);

  function submit() {
    setError(null);
    if (!headline.trim()) {
      setError("Le titre est requis.");
      return;
    }
    startTransition(async () => {
      const result = await createCampaignPage({ slugHint, headline, subheadline, ctaLabel, ctaHref });
      if (result.error) {
        setError(result.error);
        return;
      }
      setPages((prev) => [
        {
          id: `tmp-${Date.now()}`,
          owner_id: "",
          slug: result.slug ?? previewSlug,
          headline: headline.trim(),
          subheadline: subheadline.trim() || null,
          cta_label: ctaLabel.trim() || "Rejoindre gratuitement",
          cta_href: ctaHref.trim() || "/auth/client",
          view_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setHeadline("");
      setSubheadline("");
      setCtaLabel("Rejoindre gratuitement");
      setCtaHref("/auth/client");
      setSlugHint("");
      setShowForm(false);
    });
  }

  // Optimiste avec retour en arrière si le serveur refuse, même pattern que
  // OrganisationView.tsx::handleChangeStatus (MASTERCLASS Axe B : jamais
  // ignorer le résultat d'une server action déclenchée depuis l'UI).
  async function handleToggle(id: string, active: boolean) {
    const backup = pages.find((p) => p.id === id)?.is_active;
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: active } : p)));
    const result = await toggleCampaignPage(id, active);
    if (result.error && backup !== undefined) {
      setPages((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: backup } : p)));
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    const backup = pages;
    setPages((prev) => prev.filter((p) => p.id !== id));
    const result = await deleteCampaignPage(id);
    if (result.error) {
      setPages(backup);
      setError(result.error);
    }
  }

  return (
    <div>
      <p className="text-[12px] text-[#F5EDED]/40 leading-relaxed mb-4">
        Une page à message unique pour un lien de bio ou une description de vidéo précise, plutôt
        que de renvoyer vers l&apos;accueil générique.
      </p>

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-[11px] font-semibold text-[#F5EDED]/40">
          {pages.length} page{pages.length > 1 ? "s" : ""} de campagne
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          aria-expanded={showForm}
          className="inline-flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[12px] font-extrabold px-3.5 py-2 rounded-full transition-colors flex-shrink-0"
        >
          <Plus size={14} /> Nouvelle page
        </button>
      </div>

      {error && !showForm && (
        <p className="text-[11px] text-red-400 mb-3">{error}</p>
      )}

      {showForm && (
        <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-5 space-y-2.5">
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Titre (ex : Ton programme prise de masse commence ici)"
            className={inputCls}
          />
          <input
            value={subheadline}
            onChange={(e) => setSubheadline(e.target.value)}
            placeholder="Sous-titre (optionnel)"
            className={inputCls}
          />
          <div className="grid sm:grid-cols-2 gap-2.5">
            <input
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="Texte du bouton"
              className={inputCls}
            />
            <input
              value={ctaHref}
              onChange={(e) => setCtaHref(e.target.value)}
              placeholder="Lien du bouton (ex : /auth/client)"
              className={inputCls}
            />
          </div>
          <input
            value={slugHint}
            onChange={(e) => setSlugHint(e.target.value)}
            placeholder="Identifiant d'URL (optionnel, déduit du titre sinon)"
            className={inputCls}
          />
          <p className="text-[10.5px] text-[#F5EDED]/30">
            URL : {typeof window !== "undefined" ? window.location.origin : "https://ep-coaching.vercel.app"}/c/
            <span className="text-[#F5EDED]/55">{previewSlug || "..."}</span>
          </p>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button
            onClick={submit}
            disabled={isPending}
            className="ep-btn-primary disabled:opacity-50"
            style={{ height: 42, borderRadius: "var(--radius-sm)" }}
          >
            {isPending ? "Création…" : "Créer la page"}
          </button>
        </div>
      )}

      {pages.length === 0 ? (
        <p className="text-[12px] text-[#F5EDED]/35 italic">
          Aucune page de campagne pour l&apos;instant.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {pages.map((p) => (
            <CampaignRow key={p.id} page={p} onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
