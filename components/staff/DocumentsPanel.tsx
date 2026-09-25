"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, Trash2, Upload, ExternalLink } from "lucide-react";
import type { TeamDocument } from "@/lib/staff-team";
import { addDocumentAction, deleteDocumentAction } from "@/app/equipe/team-actions";

export default function DocumentsPanel({
  documents,
  meId,
  founder = false,
  targets = [],
  defaultTarget = "all",
}: {
  documents: TeamDocument[];
  meId: string;
  founder?: boolean;
  /** Côté fondateur : à qui partager ("all", "role:<clé>", "user:<id>"). */
  targets?: { value: string; label: string }[];
  defaultTarget?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [target, setTarget] = useState(defaultTarget);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const form = new FormData();
    form.set("title", title);
    form.set("url", url);
    form.set("note", note);
    if (founder) form.set("target", target);
    const file = fileRef.current?.files?.[0];
    if (file) form.set("file", file);
    startTransition(async () => {
      const r = await addDocumentAction(form);
      if ("error" in r) setMessage({ text: r.error, ok: false });
      else {
        setTitle("");
        setUrl("");
        setNote("");
        setFileName(null);
        if (fileRef.current) fileRef.current.value = "";
        setMessage({ text: founder ? "Document partagé." : "Document ajouté.", ok: true });
        router.refresh();
      }
    });
  }

  function remove(id: string, name: string) {
    if (!window.confirm(`Supprimer "${name}" ?`)) return;
    startTransition(async () => {
      const r = await deleteDocumentAction(id);
      if ("error" in r) setMessage({ text: r.error, ok: false });
      else router.refresh();
    });
  }

  return (
    <div>
      <form onSubmit={submit} className="ep-card-hero" style={{ padding: "15px 16px", marginBottom: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        <p className="ep-label" style={{ gridColumn: "1 / -1", margin: 0 }}>{founder ? "Partager un document" : "Ajouter un document"}</p>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex : Attestation SIRET)" aria-label="Titre" className="ep-input" required />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Lien (ou un fichier ci-contre)" aria-label="Lien" className="ep-input" type="url" />
        <label className="ep-input" style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <Upload size={14} style={{ color: "#E01E1E", flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: fileName ? "#F5EDED" : "rgba(245,237,237,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName ?? "Fichier (10 Mo max)"}</span>
          <input ref={fileRef} type="file" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx,.pptx" />
        </label>
        {founder && (
          <select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Partager avec" className="ep-input">
            {targets.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optionnel)" aria-label="Note" className="ep-input" style={{ gridColumn: "1 / -1" }} />
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 12 }}>
          <button type="submit" disabled={pending || !title.trim()} className="ep-btn-primary" style={{ height: 40, padding: "0 18px", fontSize: 12 }}>
            {pending ? "Envoi..." : founder ? "Partager" : "Ajouter"}
          </button>
          {message && <p role="status" style={{ fontSize: 12, margin: 0, color: message.ok ? "#4ade80" : "#FDC4C4" }}>{message.text}</p>}
        </div>
      </form>

      {documents.length === 0 ? (
        <div className="ep-card" style={{ padding: "18px 16px" }}>
          <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: 0 }}>Aucun document pour l&apos;instant.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((d) => (
            <div key={d.id} className="ep-card" style={{ padding: "11px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              {d.storage_path ? <FileText size={17} style={{ color: "#E01E1E", flexShrink: 0 }} /> : <Link2 size={17} style={{ color: "#E01E1E", flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F5EDED", margin: 0 }}>{d.title}</p>
                <p style={{ fontSize: 11, color: "rgba(245,237,237,0.45)", margin: 0 }}>
                  {d.scope} · {new Date(d.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  {d.note ? ` · ${d.note}` : ""}
                </p>
              </div>
              {d.href && (
                <a href={d.href} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir ${d.title}`} style={{ color: "#F5EDED", padding: 6 }}>
                  <ExternalLink size={15} />
                </a>
              )}
              {(founder || d.uploaded_by === meId) && (
                <button type="button" onClick={() => remove(d.id, d.title)} aria-label={`Supprimer ${d.title}`} style={{ background: "none", border: "none", color: "rgba(245,237,237,0.35)", cursor: "pointer", padding: 6 }}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
