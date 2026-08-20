"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Trash2, Download, Copy, Check, ChevronDown, Plus, StickyNote } from "lucide-react";
import { DOCUMENT_TEMPLATES } from "@/lib/coach-document-templates";
import type { CoachPersonalFile } from "@/lib/coach-personal-files";
import type { CoachPersonalNote } from "@/lib/coach-personal-notes";
import {
  uploadPersonalFile,
  deletePersonalFile,
  createPersonalNote,
  toggleNoteDone,
  deletePersonalNote,
} from "@/app/dashboard/coach/documents/actions";

type Tab = "modeles" | "fichiers" | "notes";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// Axe 2 (VISION.md, cadré 2026-08-20) : un seul espace à onglets internes
// plutôt que 3 pages/items de nav séparés — cohérent avec la préoccupation
// répétée cette session ("pas trop de trucs d'un coup", voir Axes AC/AJ/AV).
export default function CoachDocumentsSpace({
  initialFiles,
  initialNotes,
}: {
  initialFiles: CoachPersonalFile[];
  initialNotes: CoachPersonalNote[];
}) {
  const [tab, setTab] = useState<Tab>("modeles");

  return (
    <div>
      <div className="flex gap-1.5 mb-6 border-b border-[#890404]/20">
        {(
          [
            { key: "modeles", label: "Modèles" },
            { key: "fichiers", label: "Mes fichiers" },
            { key: "notes", label: "Notes" },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-colors ${
              tab === t.key
                ? "border-[#E01E1E] text-white"
                : "border-transparent text-[#F5EDED]/35 hover:text-[#F5EDED]/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "modeles" && <TemplatesTab />}
      {tab === "fichiers" && <FilesTab initialFiles={initialFiles} />}
      {tab === "notes" && <NotesTab initialNotes={initialNotes} />}
    </div>
  );
}

// ── Modèles ─────────────────────────────────────────────────────────────

function TemplatesTab() {
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
          <div key={t.slug} className="bg-[#1a0000] border border-[#890404]/25 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenSlug(isOpen ? null : t.slug)}
              className="w-full flex items-start justify-between gap-3 px-4 py-3.5 text-left"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-white flex items-center gap-2">
                  <FileText size={14} className="text-[#E01E1E] flex-shrink-0" />
                  {t.title}
                </p>
                <p className="text-[11px] text-[#F5EDED]/40 mt-1 leading-relaxed">{t.summary}</p>
              </div>
              <ChevronDown
                size={14}
                className="text-[#F5EDED]/30 flex-shrink-0 mt-1"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}
              />
            </button>

            {isOpen && (
              <div className="border-t border-[#890404]/20 px-4 py-4">
                <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2.5 mb-3">
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">{t.disclaimer}</p>
                </div>

                <button
                  type="button"
                  onClick={() => copy(t.slug, t.content)}
                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/50 hover:text-[#E01E1E] transition-colors border border-[#890404]/25 rounded-lg px-3 py-2 mb-3"
                >
                  {copiedSlug === t.slug ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copiedSlug === t.slug ? "Copié" : "Copier le texte"}
                </button>

                <pre className="whitespace-pre-wrap font-sans text-[11.5px] text-[#F5EDED]/70 leading-relaxed bg-[#0f0000] border border-[#890404]/15 rounded-lg p-3.5 max-h-[420px] overflow-y-auto">
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
      const result = await deletePersonalFile(id, storagePath);
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
      <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-[#890404]/30 hover:border-[#890404]/50 rounded-xl py-8 cursor-pointer transition-colors mb-4">
        <Upload size={18} className="text-[#F5EDED]/30" />
        <span className="text-xs font-bold text-[#F5EDED]/50">
          {uploading ? "Envoi..." : "Choisis un fichier (PDF, image, Word, Excel, ZIP — 20MB max)"}
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

      {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}

      {files.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <FileText size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Rien encore. Dépose un premier fichier.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((f) => (
            <div key={f.id} className="flex items-center gap-3 bg-[#1a0000] border border-[#890404]/20 rounded-xl px-4 py-3">
              <FileText size={14} className="text-[#F5EDED]/30 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-[#F5EDED] truncate">{f.filename}</p>
                <p className="text-[10.5px] text-[#F5EDED]/35 mt-0.5">{formatSize(f.size_bytes)}</p>
              </div>
              {f.url && (
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Télécharger"
                  className="text-[#F5EDED]/30 hover:text-[#E01E1E] transition-colors flex-shrink-0 p-1"
                >
                  <Download size={14} />
                </a>
              )}
              <button
                type="button"
                onClick={() => remove(f.id, f.storage_path)}
                disabled={isPending}
                aria-label="Supprimer"
                className="text-[#F5EDED]/25 hover:text-red-400 transition-colors flex-shrink-0 p-1 disabled:opacity-30"
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

// ── Notes ───────────────────────────────────────────────────────────────

function NotesTab({ initialNotes }: { initialNotes: CoachPersonalNote[] }) {
  const [notes, setNotes] = useState(initialNotes);
  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand
  // initialNotes change (même piège que CoachFinanceTracker.tsx).
  useEffect(() => setNotes(initialNotes), [initialNotes]);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    const trimmed = content.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      const result = await createPersonalNote(trimmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotes((prev) => [
        { id: `tmp-${Date.now()}`, coach_id: "", content: trimmed, done: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ...prev,
      ]);
      setContent("");
    });
  }

  function toggle(id: string, wasDone: boolean) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done: !wasDone } : n)));
    startTransition(async () => {
      const result = await toggleNoteDone(id, !wasDone);
      if (result.error) {
        setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, done: wasDone } : n)));
      }
    });
  }

  function remove(id: string) {
    const idx = notes.findIndex((n) => n.id === id);
    const backup = notes[idx];
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const result = await deletePersonalNote(id);
      if (result.error && backup) {
        setNotes((prev) => {
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
      <div className="flex gap-2 mb-4">
        <input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Une note ou une tâche à ne pas oublier..."
          aria-label="Nouvelle note"
          className="flex-1 bg-[rgba(0,0,0,0.4)] border border-[#890404]/25 rounded-lg px-3.5 py-2.5 text-[13px] text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
        />
        <button
          type="button"
          onClick={add}
          disabled={isPending || !content.trim()}
          className="flex items-center gap-1.5 bg-[#E01E1E] text-white px-4 py-2.5 rounded-lg text-[12px] font-bold disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>

      {error && <p className="text-[12px] text-red-400 mb-3">{error}</p>}

      {notes.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <StickyNote size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">Rien encore. Note une idée, une tâche, un pense-bête.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {notes.map((n) => (
            <div key={n.id} className="flex items-start gap-3 bg-[#1a0000] border border-[#890404]/20 rounded-xl px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(n.id, n.done)}
                aria-label={n.done ? "Marquer non fait" : "Marquer fait"}
                className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                  n.done ? "bg-[#4ade80] border-[#4ade80]" : "border-[#890404]/40 bg-transparent"
                }`}
              >
                {n.done && <Check size={12} className="text-[#0a1f0a]" strokeWidth={3} />}
              </button>
              <p className={`flex-1 min-w-0 text-[12.5px] leading-relaxed break-words ${n.done ? "text-[#F5EDED]/35 line-through" : "text-[#F5EDED]/85"}`}>
                {n.content}
              </p>
              <button
                type="button"
                onClick={() => remove(n.id)}
                aria-label="Supprimer"
                className="text-[#F5EDED]/25 hover:text-red-400 transition-colors flex-shrink-0 p-1"
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
