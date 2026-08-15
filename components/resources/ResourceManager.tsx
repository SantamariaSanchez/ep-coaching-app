"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, Download, AlertTriangle } from "lucide-react";
import { RESOURCE_CATEGORIES, type ResourceItem } from "@/lib/resource-categories";
import { getResourceHref } from "@/lib/resource-href";

export default function ResourceManager({ resources }: { resources: ResourceItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [onlyUncategorized, setOnlyUncategorized] = useState(false);

  // Une ressource sans catégorie n'apparaît sous aucun filtre côté client
  // (ResourcesBrowser) tant qu'elle reste seule dans le lot "Autres" — ça se
  // voit ici, pas là-bas, d'où le besoin de le signaler directement dans
  // l'éditeur plutôt que de laisser le coach le découvrir par hasard.
  const uncategorizedCount = resources.filter((r) => !r.category?.trim()).length;

  const visibleResources = useMemo(() => {
    const list = onlyUncategorized ? resources.filter((r) => !r.category?.trim()) : resources;
    // Non catégorisées en premier — le classement à faire doit sauter aux
    // yeux, pas se noyer dans la liste triée par date.
    return [...list].sort((a, b) => {
      const aUncat = !a.category?.trim();
      const bUncat = !b.category?.trim();
      if (aUncat !== bUncat) return aUncat ? -1 : 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [resources, onlyUncategorized]);

  async function handleUpload() {
    if (!title.trim() || !file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("file", file);

      const res = await fetch("/api/coach/resources", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de l'upload.");
      } else {
        setTitle("");
        setDescription("");
        setCategory("");
        setFile(null);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/coach/resources/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCategoryChange(id: string, newCategory: string) {
    setUpdatingId(id);
    try {
      await fetch(`/api/coach/resources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
      router.refresh();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      {/* ── Upload form ── */}
      <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 mb-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du guide (ex. Guide nutrition débutant)" aria-label="Titre du guide (ex. Guide nutrition débutant)"
          className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnel)" aria-label="Description (optionnel)"
          className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/40"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Catégorie"
          className="w-full bg-[#150000] border border-[#890404]/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E01E1E]/40"
        >
          <option value="">Catégorie : Autres</option>
          {RESOURCE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center justify-between pt-1">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.mp4,.webm,.mov,.mp3,.wav,.zip,application/pdf,image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,application/zip"
            aria-label="Choisir un fichier"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 hover:text-[#F5EDED]/60 transition-colors"
          >
            <FileText size={14} strokeWidth={1.8} />
            {file ? file.name : "Choisir un fichier (PDF, image, vidéo, audio, ZIP)"}
          </button>
          <button
            onClick={handleUpload}
            disabled={!title.trim() || !file || uploading}
            className="flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
          >
            {uploading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={13} strokeWidth={2} />
            )}
            Publier
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* ── Rappel catégorisation ── */}
      {uncategorizedCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
            <p className="text-[11.5px] text-amber-300/90 leading-snug">
              {uncategorizedCount} ressource{uncategorizedCount !== 1 ? "s" : ""} sans catégorie. Tant qu&apos;il n&apos;y
              a qu&apos;une catégorie utilisée (« Autres »), tes clients ne voient aucun filtre pour s&apos;y retrouver.
            </p>
          </div>
          <button
            onClick={() => setOnlyUncategorized((v) => !v)}
            className="flex-shrink-0 text-[10px] font-bold uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-colors"
          >
            {onlyUncategorized ? "Tout afficher" : "Filtrer"}
          </button>
        </div>
      )}

      {/* ── List ── */}
      {resources.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-12 text-center">
          <FileText size={26} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Aucune ressource publiée pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleResources.map((r) => {
            const isUncategorized = !r.category?.trim();
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 border rounded-xl px-4 py-3.5 transition-colors ${
                  isUncategorized ? "bg-amber-500/[0.04] border-amber-500/20" : "bg-[#1f0101] border-[#890404]/20"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-[#890404]/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={15} className="text-[#890404]" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{r.title}</p>
                  {r.description && (
                    <p className="text-[10px] text-[#F5EDED]/35 truncate">{r.description}</p>
                  )}
                </div>
                <select
                  value={r.category ?? ""}
                  onChange={(e) => handleCategoryChange(r.id, e.target.value)}
                  disabled={updatingId === r.id}
                  aria-label="Catégorie"
                  className={`bg-[#150000] border rounded-lg px-2 py-1.5 text-[10px] focus:outline-none disabled:opacity-40 flex-shrink-0 ${
                    isUncategorized ? "border-amber-500/40 text-amber-300" : "border-[#890404]/20 text-[#F5EDED]/60 focus:border-[#E01E1E]/40"
                  }`}
                >
                  <option value="">Autres</option>
                  {RESOURCE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <a
                  href={getResourceHref(r)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#F5EDED]/35 hover:text-[#F5EDED]/70 transition-colors p-1.5"
                  title="Voir le fichier"
                >
                  <Download size={15} strokeWidth={1.8} />
                </a>
                <button
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="text-[#F5EDED]/25 hover:text-red-500 transition-colors p-1.5 disabled:opacity-40"
                  title="Supprimer" aria-label="Supprimer"
                >
                  <Trash2 size={15} strokeWidth={1.8} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
