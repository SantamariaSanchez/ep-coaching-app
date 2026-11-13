"use client";

import Link from "next/link";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, Download, Copy, Check, ChevronDown } from "lucide-react";
import { DOCUMENT_TEMPLATES } from "@/lib/coach-document-templates";
import type { CoachPersonalFile } from "@/lib/coach-personal-files";
import {
  uploadPersonalFile,
  deletePersonalFile,
} from "@/app/dashboard/coach/documents/actions";
import { safeAction } from "@/lib/safe-action";

type Tab = "modeles" | "fichiers";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Axe 2 (VISION.md, cadré 2026-08-20) : un seul espace à onglets internes
// plutôt que 3 pages/items de nav séparés — cohérent avec la préoccupation
// répétée cette session ("pas trop de trucs d'un coup", voir Axes AC/AJ/AV).
export default function CoachDocumentsSpace({
  initialFiles,
}: {
  initialFiles: CoachPersonalFile[];
}) {
  const tr = useT();
  const [tab, setTab] = useState<Tab>("modeles");

  return (
    <div>
      <div className="flex gap-1.5 mb-6 border-b border-(--ep-line)/20">
        {(
          [
            { key: "modeles", label: tr("Modèles") },
            { key: "fichiers", label: tr("Mes fichiers") },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
              tab === t.key
                ? "border-(--ep-accent) text-(--ep-strong)"
                : "border-transparent text-(--ep-ink)/35 hover:text-(--ep-ink)/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/*
        Repasse 2026-09-15 : même piège de démontage déjà trouvé et corrigé
        ailleurs ce jour-là (MASTERCLASS.md Axe BW, IdeationHub.tsx,
        MindsetView.tsx) — perdait une note en cours de frappe dès qu'on
        quittait l'onglet "Notes". Les 3 onglets restent désormais montés
        en permanence, seule la visibilité change.
      */}
      <div hidden={tab !== "modeles"}>
        <TemplatesTab />
      </div>
      <div hidden={tab !== "fichiers"}>
        <FilesTab initialFiles={initialFiles} />
      </div>
      {/* Notes : un seul bloc-notes dans l'appli (audit 2026-11-13). */}
      <Link href="/dashboard/coach/notes" className="mt-6 inline-flex items-center gap-1.5 text-[12px] font-bold text-(--ep-accent)" style={{ textDecoration: "none" }}>
        {tr("Mes notes")} →
      </Link>
    </div>
  );
}

// ── Modèles ─────────────────────────────────────────────────────────────

function TemplatesTab() {
  const tr = useT();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  function copy(slug: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((s) => (s === slug ? null : s)), 2000);
    });
  }

  return (
    <div className="space-y-3">
      {DOCUMENT_TEMPLATES.map((t) => {
        const isOpen = openSlug === t.slug;
        return (
          <div key={t.slug} className="bg-(--ep-s3) border border-(--ep-line)/25 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSlug(isOpen ? null : t.slug)}
              className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-(--ep-strong) flex items-center gap-2">
                  <FileText size={14} className="text-(--ep-accent) flex-shrink-0" />
                  {t.title}
                </p>
                <p className="text-[11px] text-(--ep-ink)/40 mt-1 leading-relaxed">{t.summary}</p>
              </div>
              <ChevronDown
                size={14}
                className="text-(--ep-ink)/30 flex-shrink-0 mt-1"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
              />
            </button>

            {isOpen && (
              <div className="border-t border-(--ep-line)/20 px-4 py-4">
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 mb-3">
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">{t.disclaimer}</p>
                </div>

                <button
                  type="button"
                  onClick={() => copy(t.slug, t.content)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-(--ep-ink)/50 hover:text-(--ep-accent) transition-colors border border-(--ep-line)/25 rounded-lg px-3 py-2 mb-3"
                >
                  {copiedSlug === t.slug ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copiedSlug === t.slug ? tr("Copié") : tr("Copier le texte")}
                </button>

                <pre className="whitespace-pre-wrap font-sans text-[11.5px] text-(--ep-ink)/70 leading-relaxed bg-(--ep-s5) border border-(--ep-line)/15 rounded-lg p-3.5 max-h-[420px] overflow-y-auto">
                  {t.content}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mes fichiers ────────────────────────────────────────────────────────

function FilesTab({ initialFiles }: { initialFiles: CoachPersonalFile[] }) {
  const tr = useT();
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  // MASTERCLASS.md Axe E : resynchronise depuis le serveur après le
  // router.refresh() de handleFile (même piège que PersonalPhotosView —
  // une URL signée ne s'obtient qu'au prochain chargement serveur, pas
  // d'optimistic update réaliste pour un lien de téléchargement).
  useEffect(() => setFiles(initialFiles), [initialFiles]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError("Fichier trop volumineux (20MB max).");
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    const result = await uploadPersonalFile(formData);
    setUploading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  function remove(id: string, storagePath: string) {
    const idx = files.findIndex((f) => f.id === id);
    const backup = files[idx];
    setFiles((prev) => prev.filter((f) => f.id !== id));
    startTransition(async () => {
      const result = await safeAction(() => deletePersonalFile(id, storagePath));
      if (result.error && backup) {
        setFiles((prev) => {
          const next = [...prev];
          next.splice(Math.min(idx, next.length), 0, backup);
          return next;
        });
        setError(result.error);
      }
    });
  }

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-(--ep-line)/30 hover:border-(--ep-line)/50 rounded-xl py-8 cursor-pointer transition-colors mb-4">
        <Upload size={18} className="text-(--ep-ink)/30" />
        <span className="text-xs font-bold text-(--ep-ink)/50">
          {uploading ? tr("Envoi...") : tr("Choisis un fichier (PDF, image, Word, Excel, ZIP, 20MB max)")}
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.zip,.doc,.docx,.xlsx"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </label>

      {error && <p className="text-[12px] text-red-400 mb-3">{tr(error)}</p>}

      {files.length === 0 ? (
        <div className="bg-(--ep-s1) border border-dashed border-(--ep-line)/25 rounded-xl py-16 text-center">
          <FileText size={22} className="text-(--ep-ink)/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-(--ep-ink)/35">{tr("Rien encore. Dépose un premier fichier.")}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 bg-(--ep-s3) border border-(--ep-line)/20 rounded-xl px-4 py-3">
              <FileText size={14} className="text-(--ep-ink)/30 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-(--ep-ink) truncate">{f.filename}</p>
                <p className="text-[10.5px] text-(--ep-ink)/35 mt-0.5">{formatSize(f.size_bytes)}</p>
              </div>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={tr("Télécharger")}
                  className="text-(--ep-ink)/30 hover:text-(--ep-accent) transition-colors flex-shrink-0 p-1"
                >
                  <Download size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => remove(f.id, f.storage_path)}
                disabled={isPending}
                aria-label={tr("Supprimer")}
                className="text-(--ep-ink)/25 hover:text-red-400 transition-colors flex-shrink-0 p-1 disabled:opacity-30"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
