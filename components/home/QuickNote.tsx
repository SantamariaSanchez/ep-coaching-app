"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { NotebookPen, ArrowUp, Check } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { createNoteAction } from "@/app/actions/notes";

// Note rapide directement sur l'accueil : on tape, on envoie, c'est rangé
// dans Notes (titre et #tags déduits du texte). Zéro écran à ouvrir.
export default function QuickNote({ notesHref }: { notesHref: string }) {
  const t = useT();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    const v = text.trim();
    if (!v || pending) return;
    start(async () => {
      const res = await createNoteAction({ text: v });
      if (res.error) return setError(t(res.error));
      setText("");
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    });
  }

  return (
    <div className="ep-card" style={{ padding: "10px 10px 10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <Link href={notesHref} aria-label={t("Mes notes")} style={{ display: "flex", color: "#F06060", flexShrink: 0 }}>
        <NotebookPen size={17} />
      </Link>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") save(); }}
        placeholder={saved ? t("Noté ✓") : t("Note rapide, une idée, une tâche...")}
        aria-label={t("Note rapide")}
        style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "#F5EDED", fontSize: 14.5, height: 36 }}
      />
      <button
        type="button"
        onClick={save}
        disabled={!text.trim() || pending}
        aria-label={t("Enregistrer la note")}
        style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 999, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: text.trim() ? "#E01E1E" : "rgba(245,237,237,0.06)", color: text.trim() ? "#fff" : "rgba(245,237,237,0.35)", transition: "background 0.15s" }}
      >
        {saved ? <Check size={16} /> : <ArrowUp size={16} />}
      </button>
      {error && <span role="alert" style={{ position: "absolute", fontSize: 11, color: "#fca5a5" }}>{error}</span>}
    </div>
  );
}
