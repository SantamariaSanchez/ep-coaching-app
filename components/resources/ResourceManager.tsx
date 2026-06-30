"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, Download } from "lucide-react";
import type { ResourceItem } from "@/utils/resources";
import { getResourceHref } from "@/lib/resource-href";

export default function ResourceManager({ resources }: { resources: ResourceItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleUpload() {
    if (!title.trim() || !file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("file", file);

      const res = await fetch("/api/coach/resources", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Erreur lors de l'upload.");
      } else {
        setTitle("");
        setDescription("");
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

  return (
    <div>
      {/* ── Upload form ── */}
      <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-4 mb-6 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre du guide (ex. Guide nutrition débutant)"
          className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/40"
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optionnel)"
          className="w-full bg-[var(--color-ep-input)] border border-[var(--color-ep-dark-red)]/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--color-ep-light)]/25 focus:outline-none focus:border-[var(--color-ep-red)]/40"
        />
        <div className="flex items-center justify-between pt-1">
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.html,.htm,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov,.mp3,.wav,.zip,application/pdf,text/html,image/*,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,application/zip"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 hover:text-[var(--color-ep-light)]/60 transition-colors"
          >
            <FileText size={14} strokeWidth={1.8} />
            {file ? file.name : "Choisir un fichier (PDF, HTML, image, vidéo...)"}
          </button>
          <button
            onClick={handleUpload}
            disabled={!title.trim() || !file || uploading}
            className="flex items-center gap-1.5 bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
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

      {/* ── List ── */}
      {resources.length === 0 ? (
        <div className="bg-[var(--color-ep-card)] border border-dashed border-[var(--color-ep-dark-red)]/25 rounded-xl py-12 text-center">
          <FileText size={26} className="text-[var(--color-ep-light)]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[var(--color-ep-light)]/35">Aucune ressource publiée pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/20 rounded-xl px-4 py-3.5"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--color-ep-dark-red)]/10 flex items-center justify-center flex-shrink-0">
                <FileText size={15} className="text-[var(--color-ep-dark-red)]" strokeWidth={1.8} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{r.title}</p>
                {r.description && (
                  <p className="text-[10px] text-[var(--color-ep-light)]/35 truncate">{r.description}</p>
                )}
              </div>
              <a
                href={getResourceHref(r)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-ep-light)]/35 hover:text-[var(--color-ep-light)]/70 transition-colors p-1.5"
                title="Voir le fichier"
              >
                <Download size={15} strokeWidth={1.8} />
              </a>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deletingId === r.id}
                className="text-[var(--color-ep-light)]/25 hover:text-red-500 transition-colors p-1.5 disabled:opacity-40"
                title="Supprimer"
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
