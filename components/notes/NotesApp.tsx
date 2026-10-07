"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mic, MicOff, ImagePlus, Send, Search, Pin, PinOff, Trash2, X, Check, Link2, Hash, Inbox, ListChecks, FileText } from "lucide-react";
import { createNoteAction, createCaptureAction, updateNoteAction, deleteNoteAction } from "@/app/actions/notes";
import type { Note, NoteTag } from "@/lib/notes";
import { fuzzyMatchAny } from "@/lib/fuzzy-search";

// Notes façon Obsidian/Tana (2026-09-30) : on jette tout en vrac (texte,
// lien, capture, dictée), ça se range avec des #supertags, on relie des
// notes avec [[Titre]], et on retrouve tout avec la recherche.

type View = { type: "all" } | { type: "inbox" } | { type: "pinned" } | { type: "tasks" } | { type: "tag"; tag: string };

const PALETTE = ["#E01E1E", "#f59e0b", "#4ade80", "#60a5fa", "#a78bfa", "#f472b6", "#2dd4bf"];

function colorFor(tag: string, tags: NoteTag[]): string {
  const known = tags.find((t) => t.name === tag)?.color;
  if (known) return known;
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" });
}

function matches(n: Note, q: string): boolean {
  if (!q) return true;
  return fuzzyMatchAny([n.title, n.body, n.tags.map((t) => `#${t}`).join(" ")], q);
}

type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

export default function NotesApp({ initialNotes, tags, connect }: { initialNotes: Note[]; tags: NoteTag[]; connect?: React.ReactNode }) {
  const tr = useT();
  const router = useRouter();
  const params = useSearchParams();
  const [notes, setNotes] = useState(initialNotes);
  // Nouvelles données du serveur (après router.refresh) : reprises au rendu.
  const [prevInitial, setPrevInitial] = useState(initialNotes);
  if (prevInitial !== initialNotes) {
    setPrevInitial(initialNotes);
    setNotes(initialNotes);
  }
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>({ type: "all" });
  const [openId, setOpenId] = useState<string | null>(params.get("note"));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [dictated, setDictated] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tagCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) for (const t of n.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [notes]);

  const shown = notes.filter((n) => {
    if (!matches(n, query)) return false;
    switch (view.type) {
      case "inbox":
        return n.tags.length === 0;
      case "pinned":
        return n.pinned;
      case "tasks":
        return n.kind === "tache";
      case "tag":
        return n.tags.includes(view.tag);
      default:
        return true;
    }
  });

  function save() {
    const text = draft.trim();
    if (!text) return;
    setError(null);
    start(async () => {
      recRef.current?.stop();
      const res = await createNoteAction({ text, kind: dictated ? "dictee" : undefined, tags: view.type === "tag" ? [view.tag] : undefined });
      if (res.error) return setError(res.error);
      setDraft("");
      setDictated(false);
      router.refresh();
    });
  }

  function toggleDictation() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      setError("La dictée n'est pas disponible sur ce navigateur. Utilise le micro du clavier de ton téléphone.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "fr-FR";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) {
        setDictated(true);
        setDraft((d) => (d ? `${d.trimEnd()} ${text.trim()}` : text.trim()));
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  function uploadCapture(file: File) {
    const fd = new FormData();
    fd.set("image", file);
    fd.set("text", draft);
    setError(null);
    start(async () => {
      const res = await createCaptureAction(fd);
      if (res.error) return setError(res.error);
      setDraft("");
      router.refresh();
    });
  }

  const open = notes.find((n) => n.id === openId) ?? null;

  const chip = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: `1px solid ${active ? "rgba(224,30,30,0.6)" : "rgba(137,4,4,0.35)"}`,
    background: active ? "rgba(224,30,30,0.15)" : "transparent",
    color: active ? "#ff6b6b" : "rgba(245,237,237,0.6)",
  });

  return (
    <div className="page-transition" style={{ padding: "22px 16px 120px", maxWidth: 820, margin: "0 auto" }}>
      <h1 className="ep-h1" style={{ marginBottom: 4 }}>{tr("Notes")}</h1>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", margin: "0 0 14px" }}>
        {tr("Jette tout ici : idées, liens, captures, dictées. Ajoute des #tags pour ranger, relie des notes avec [[Titre]].")}
      </p>

      {connect}

      {/* Capture rapide */}
      <div className="ep-card-hero" style={{ padding: 12, marginBottom: 14 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
          }}
          placeholder={listening ? "Je t'écoute..." : "Une idée, un lien, une tâche ([ ] ...), #tag..."}
          rows={draft.split("\n").length > 2 ? 5 : 2}
          aria-label={tr("Nouvelle note")}
          autoFocus={params.get("capture") === "1"}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: "#F5EDED", fontSize: 15, lineHeight: 1.5, fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <button type="button" onClick={toggleDictation} aria-label={listening ? "Arrêter la dictée" : "Dicter"} style={{ ...chip(listening), padding: "8px 11px" }}>
            {listening ? <MicOff size={15} /> : <Mic size={15} />} {listening ? tr("Stop") : tr("Dicter")}
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} aria-label={tr("Ajouter une capture")} style={{ ...chip(false), padding: "8px 11px" }}>
            <ImagePlus size={15} />{" "}{tr("Capture")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCapture(f);
              e.target.value = "";
            }}
          />
          <button type="button" disabled={pending || !draft.trim()} onClick={save} data-haptic style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer", opacity: pending || !draft.trim() ? 0.5 : 1 }}>
            <Send size={13} />{" "}{tr("Ranger")}
          </button>
        </div>
        {error && <p style={{ fontSize: 12, color: "#fca5a5", margin: "8px 0 0" }}>{error}</p>}
      </div>

      {/* Recherche */}
      <div className="ep-card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", marginBottom: 10 }}>
        <Search size={16} style={{ color: "rgba(245,237,237,0.4)" }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("Chercher dans mes notes")} aria-label={tr("Chercher dans mes notes")} style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#F5EDED", fontSize: 14 }} />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label={tr("Effacer")} style={{ background: "none", border: "none", color: "rgba(245,237,237,0.4)" }}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* Vues + supertags */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14, paddingBottom: 2 }} className="no-scrollbar">
        <button type="button" style={chip(view.type === "all")} onClick={() => setView({ type: "all" })}>
          <FileText size={12} />{" "}{tr("Tout (")}{notes.length})
        </button>
        <button type="button" style={chip(view.type === "inbox")} onClick={() => setView({ type: "inbox" })}>
          <Inbox size={12} />{" "}{tr("À ranger (")}{notes.filter((n) => !n.tags.length).length})
        </button>
        <button type="button" style={chip(view.type === "pinned")} onClick={() => setView({ type: "pinned" })}>
          <Pin size={12} />{" "}{tr("Épinglées")}
        </button>
        <button type="button" style={chip(view.type === "tasks")} onClick={() => setView({ type: "tasks" })}>
          <ListChecks size={12} />{" "}{tr("Tâches")}
        </button>
        {tagCounts.map(([t, n]) => (
          <button key={t} type="button" style={{ ...chip(view.type === "tag" && view.tag === t), borderColor: `${colorFor(t, tags)}66` }} onClick={() => setView({ type: "tag", tag: t })}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: colorFor(t, tags) }} />#{t} ({n})
          </button>
        ))}
      </div>

      {/* Liste */}
      {shown.length === 0 ? (
        <p className="ep-card" style={{ padding: "16px", fontSize: 13, color: "rgba(245,237,237,0.5)", margin: 0 }}>
          {notes.length === 0 ? tr("Aucune note pour l'instant. Écris ta première idée juste au-dessus.") : tr("Rien ne correspond.")}
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
          {shown.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => setOpenId(n.id)}
              className="ep-card"
              style={{ textAlign: "left", padding: 0, overflow: "hidden", cursor: "pointer", color: "#F5EDED", display: "flex", flexDirection: "column" }}
            >
              {n.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.imageUrl} alt="" style={{ width: "100%", height: 130, objectFit: "cover", background: "#1a0202" }} />
              )}
              <span style={{ padding: "12px 14px", display: "block" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {n.kind === "tache" && (
                    <span style={{ width: 16, height: 16, borderRadius: 5, border: "1.5px solid rgba(245,237,237,0.4)", background: n.done ? "#4ade80" : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {n.done && <Check size={11} color="#0D0000" strokeWidth={3} />}
                    </span>
                  )}
                  {n.kind === "lien" && <Link2 size={13} style={{ color: "#60a5fa", flexShrink: 0 }} />}
                  {n.kind === "dictee" && <Mic size={13} style={{ color: "#a78bfa", flexShrink: 0 }} />}
                  <span style={{ fontSize: 14, fontWeight: 800, textDecoration: n.done ? "line-through" : "none", opacity: n.done ? 0.5 : 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.title || tr("Sans titre")}</span>
                  {n.pinned && <Pin size={12} style={{ color: "#E01E1E", flexShrink: 0, marginLeft: "auto" }} />}
                </span>
                {n.body && n.body !== n.title && (
                  <span style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", fontSize: 12.5, color: "rgba(245,237,237,0.6)", marginTop: 4, lineHeight: 1.45 }}>{n.body}</span>
                )}
                <span style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8, alignItems: "center" }}>
                  {n.tags.slice(0, 4).map((t) => (
                    <span key={t} style={{ fontSize: 10.5, fontWeight: 800, color: colorFor(t, tags), background: `${colorFor(t, tags)}18`, borderRadius: 6, padding: "2px 6px" }}>#{t}</span>
                  ))}
                  <span style={{ fontSize: 10.5, color: "rgba(245,237,237,0.35)", marginLeft: "auto" }}>{fmtDate(n.updated_at)}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}

      {open && <NoteEditor key={open.id} note={open} all={notes} tags={tags} onClose={() => setOpenId(null)} onOpen={(id) => setOpenId(id)} onChange={(n) => setNotes((l) => l.map((x) => (x.id === n.id ? n : x)))} onDeleted={(id) => { setNotes((l) => l.filter((x) => x.id !== id)); setOpenId(null); }} />}
    </div>
  );
}

function NoteEditor({ note, all, tags, onClose, onOpen, onChange, onDeleted }: { note: Note; all: Note[]; tags: NoteTag[]; onClose: () => void; onOpen: (id: string) => void; onChange: (n: Note) => void; onDeleted: (id: string) => void }) {
  const tr = useT();
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [tagInput, setTagInput] = useState("");
  const [, start] = useTransition();
  const [saved, setSaved] = useState(true);

  const links = [...new Set([...body.matchAll(/\[\[([^\]\n]{1,120})\]\]/g)].map((m) => m[1].trim()))];
  const linked = links.map((l) => ({ label: l, note: all.find((n) => n.title.toLowerCase() === l.toLowerCase()) ?? null }));
  const backlinks = all.filter((n) => n.id !== note.id && note.title && n.body.toLowerCase().includes(`[[${note.title.toLowerCase()}]]`));

  function persist(patch: Parameters<typeof updateNoteAction>[1]) {
    onChange({ ...note, title, body, ...patch } as Note);
    start(async () => {
      const res = await updateNoteAction(note.id, patch);
      if (!res.error) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    const next = [...new Set([...note.tags, t.toLowerCase()])];
    setTagInput("");
    persist({ tags: next });
  }

  const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 11px", borderRadius: 10, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "rgba(245,237,237,0.8)", fontSize: 12, fontWeight: 800, cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(3px)" }} />
      <div className="ep-modal-panel" style={{ position: "relative", width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", background: "#150000", border: "1px solid rgba(137,4,4,0.4)", borderRadius: "18px 18px 0 0", padding: "16px 16px calc(24px + env(safe-area-inset-bottom, 0px))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: "rgba(245,237,237,0.4)" }}>{saved ? tr("Enregistré") : tr("Modifications non enregistrées")}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {note.kind === "tache" && (
              <button type="button" style={btn} onClick={() => persist({ done: !note.done })}>
                <Check size={13} /> {note.done ? tr("À refaire") : tr("Fait")}
              </button>
            )}
            <button type="button" style={btn} onClick={() => persist({ pinned: !note.pinned })} aria-label={note.pinned ? "Désépingler" : "Épingler"}>
              {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
            </button>
            <button
              type="button"
              style={btn}
              aria-label={tr("Supprimer")}
              onClick={() => {
                if (!confirm("Supprimer cette note ?")) return;
                start(async () => {
                  const res = await deleteNoteAction(note.id);
                  if (!res.error) onDeleted(note.id);
                });
              }}
            >
              <Trash2 size={13} />
            </button>
            <button type="button" style={btn} onClick={onClose} aria-label={tr("Fermer")}>
              <X size={14} />
            </button>
          </div>
        </div>

        {note.imageUrl && (
          <a href={note.imageUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={note.imageUrl} alt={tr("Capture")} style={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 12, background: "#0D0000", marginBottom: 10 }} />
          </a>
        )}
        {note.source_url && (
          <a href={note.source_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#60a5fa", fontSize: 13, fontWeight: 700, marginBottom: 10, wordBreak: "break-all" }}>
            <Link2 size={13} />{" "}{tr("Ouvrir le lien")}
          </a>
        )}

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaved(false);
          }}
          onBlur={() => title !== note.title && persist({ title })}
          placeholder={tr("Titre")}
          aria-label={tr("Titre")}
          style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: "#F5EDED", fontSize: 20, fontWeight: 900, marginBottom: 8 }}
        />
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setSaved(false);
          }}
          onBlur={() => body !== note.body && persist({ body })}
          placeholder={tr("Écris ici. #tag pour ranger, [[Titre d'une note]] pour relier.")}
          aria-label={tr("Contenu")}
          rows={10}
          className="ep-selectable"
          style={{ width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.08)", borderRadius: 12, outline: "none", color: "#F5EDED", fontSize: 15, lineHeight: 1.6, padding: 12, resize: "vertical", fontFamily: "inherit" }}
        />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 10 }}>
          {note.tags.map((t) => (
            <button key={t} type="button" onClick={() => persist({ tags: note.tags.filter((x) => x !== t) })} title={tr("Retirer ce tag")} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: colorFor(t, tags), background: `${colorFor(t, tags)}18`, border: "none", borderRadius: 8, padding: "5px 8px", cursor: "pointer" }}>
              #{t} <X size={11} />
            </button>
          ))}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "1px dashed rgba(245,237,237,0.2)", borderRadius: 8, padding: "3px 8px" }}>
            <Hash size={12} style={{ color: "rgba(245,237,237,0.4)" }} />
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()} onBlur={addTag} placeholder={tr("ajouter")} aria-label={tr("Ajouter un tag")} list="note-tags" style={{ width: 90, background: "transparent", border: "none", outline: "none", color: "#F5EDED", fontSize: 12 }} />
            <datalist id="note-tags">
              {[...new Set(all.flatMap((n) => n.tags))].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </span>
        </div>

        {(linked.length > 0 || backlinks.length > 0) && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(245,237,237,0.07)", display: "flex", flexDirection: "column", gap: 6 }}>
            {linked.length > 0 && <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", margin: 0 }}>{tr("Liens")}</p>}
            {linked.map((l) =>
              l.note ? (
                <button key={l.label} type="button" onClick={() => onOpen(l.note!.id)} style={{ textAlign: "left", background: "none", border: "none", color: "#60a5fa", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                  → {l.note.title}
                </button>
              ) : (
                <span key={l.label} style={{ fontSize: 13, color: "rgba(245,237,237,0.45)" }}>→ {l.label}{" "}{tr("(note pas encore créée)")}</span>
              )
            )}
            {backlinks.length > 0 && <p style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", margin: "6px 0 0" }}>{tr("Mentionnée dans")}</p>}
            {backlinks.map((b) => (
              <button key={b.id} type="button" onClick={() => onOpen(b.id)} style={{ textAlign: "left", background: "none", border: "none", color: "#60a5fa", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                ← {b.title || tr("Sans titre")}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
