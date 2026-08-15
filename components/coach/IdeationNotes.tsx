"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Pin, PinOff, Trash2, StickyNote, Search } from "lucide-react";
import { createIdeationNote, updateIdeationNote, deleteIdeationNote } from "@/app/dashboard/coach/studio/actions";
import type { IdeationNote } from "@/lib/coach-ideation";

// Prise de notes libre du coach (Idéation, 2026-08-15) — tout ce qui ne
// rentre pas dans le pipeline idée/brouillon/prêt/publié de ContentStudio :
// un pense-bête, un brouillon de post pas encore assez mûr pour devenir
// une "idée" formelle, une note de réunion, etc.
export default function IdeationNotes({ initialNotes }: { initialNotes: IdeationNote[] }) {
  const [notes, setNotes] = useState(initialNotes);

  // MASTERCLASS.md Axe E : resynchronise depuis le serveur quand initialNotes
  // change — même piège que ContentStudio.
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q));
  }, [notes, query]);

  function submitNew() {
    setError(null);
    const t = title.trim();
    if (!t) {
      setError("Titre requis.");
      return;
    }
    startTransition(async () => {
      const result = await createIdeationNote({ title: t, body: body || undefined });
      if (result.error) {
        setError(result.error);
        return;
      }
      setNotes((prev) => [
        {
          id: `tmp-${Date.now()}`,
          coach_id: "",
          title: t,
          body: body || null,
          pinned: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setTitle("");
      setBody("");
      setShowForm(false);
    });
  }

  function togglePin(note: IdeationNote) {
    setNotes((prev) =>
      [...prev]
        .map((n) => (n.id === note.id ? { ...n, pinned: !n.pinned } : n))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    );
    startTransition(() => {
      updateIdeationNote(note.id, { pinned: !note.pinned });
    });
  }

  function saveBody(id: string) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, body: editBody || null } : n)));
    setEditingId(null);
    startTransition(() => {
      updateIdeationNote(id, { body: editBody });
    });
  }

  function remove(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    startTransition(() => {
      deleteIdeationNote(id);
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={13} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.3)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher une note..."
            aria-label="Chercher une note"
            style={{ ...inputStyle, paddingLeft: 32 }}
          />
        </div>
        <button type="button" onClick={() => setShowForm((v) => !v)} style={addButtonStyle}>
          <Plus size={14} /> Nouvelle note
        </button>
      </div>

      {showForm && (
        <div className="ep-card" style={{ padding: 16, marginBottom: 16 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la note"
            aria-label="Titre de la note"
            style={inputStyle}
            autoFocus
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Le contenu de la note..."
            aria-label="Le contenu de la note"
            rows={4}
            style={{ ...inputStyle, marginTop: 10, resize: "vertical", fontFamily: "inherit" }}
          />
          {error && <p style={{ color: "#fb7185", fontSize: 12, marginTop: 8 }}>{error}</p>}
          <button type="button" onClick={submitNew} disabled={isPending} style={submitButtonStyle(isPending)}>
            {isPending ? "..." : "Ajouter"}
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-[#1f0101] border border-dashed border-[#890404]/25 rounded-xl py-16 text-center">
          <StickyNote size={22} className="text-[#F5EDED]/15 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-[#F5EDED]/35">
            {query ? "Aucune note ne correspond." : "Aucune note pour l'instant."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((note) => (
            <div key={note.id} className="ep-card" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: "#F5EDED" }}>{note.title}</p>
                  {editingId === note.id ? (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        aria-label="Modifier le contenu"
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                        autoFocus
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button type="button" onClick={() => saveBody(note.id)} style={submitButtonStyle(false)}>
                          Enregistrer
                        </button>
                        <button type="button" onClick={() => setEditingId(null)} style={cancelButtonStyle}>
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      onClick={() => {
                        setEditingId(note.id);
                        setEditBody(note.body ?? "");
                      }}
                      style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(245,237,237,0.45)", lineHeight: 1.5, whiteSpace: "pre-wrap", cursor: "text" }}
                    >
                      {note.body || <span style={{ color: "rgba(245,237,237,0.25)" }}>Vide, clique pour écrire.</span>}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => togglePin(note)}
                  aria-label={note.pinned ? "Désépingler" : "Épingler"}
                  style={{ background: "none", border: "none", cursor: "pointer", color: note.pinned ? "#fbbf24" : "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
                >
                  {note.pinned ? <Pin size={14} fill="currentColor" /> : <PinOff size={14} />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(note.id)}
                  aria-label="Supprimer"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(245,237,237,0.25)", flexShrink: 0, padding: 4 }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(224,30,30,0.2)",
  borderRadius: "var(--radius-lg)",
  color: "#F5EDED",
  padding: "12px 16px",
  fontSize: 13,
  outline: "none",
};

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  background: "#E01E1E",
  color: "#fff",
  padding: "8px 14px",
  borderRadius: 999,
  fontWeight: 800,
  fontSize: 12,
  border: "none",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function submitButtonStyle(pending: boolean): React.CSSProperties {
  return {
    marginTop: 10,
    background: "#E01E1E",
    color: "#fff",
    padding: "9px 18px",
    borderRadius: "var(--radius-lg)",
    fontWeight: 800,
    fontSize: 12.5,
    border: "none",
    cursor: "pointer",
    opacity: pending ? 0.6 : 1,
  };
}

const cancelButtonStyle: React.CSSProperties = {
  marginTop: 10,
  background: "transparent",
  color: "rgba(245,237,237,0.5)",
  padding: "9px 18px",
  borderRadius: "var(--radius-lg)",
  fontWeight: 700,
  fontSize: 12.5,
  border: "1px solid rgba(245,237,237,0.15)",
  cursor: "pointer",
};
