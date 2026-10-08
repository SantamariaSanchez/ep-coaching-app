"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Send, Trash2 } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { publishScript, deleteScript } from "@/app/dashboard/coach/studio/actions";
import type { CoachScript } from "@/lib/coach-ideation";

const LABELS: Record<string, string> = { linkedin: "LinkedIn", threads: "Threads" };

// Posts écrits à publier (2026-10-08) : retour direct, « ça sert à rien de
// laisser les posts LinkedIn dans les scripts ». Ils ne se tournent pas : on
// copie, on poste, on touche « Publié » et le post sort de l'appli (son sujet
// reste mémorisé pour ne pas le refaire).
export default function WrittenPosts({ initialPosts }: { initialPosts: CoachScript[] }) {
  const t = useT();
  const [posts, setPosts] = useState(initialPosts);
  const [seen, setSeen] = useState(initialPosts);
  if (initialPosts !== seen) {
    setSeen(initialPosts);
    setPosts(initialPosts);
  }
  const [copied, setCopied] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const platforms = [...new Set(posts.map((p) => p.platform))];
  const shown = posts.filter((p) => filter === "all" || p.platform === filter);

  function copy(p: CoachScript) {
    navigator.clipboard?.writeText(p.content ?? "").then(() => {
      setCopied(p.id);
      setTimeout(() => setCopied(null), 1600);
    }).catch(() => {});
  }

  function done(p: CoachScript, remove: boolean) {
    const backup = posts;
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    setError(null);
    start(async () => {
      const res = remove ? await deleteScript(p.id, "autre", "Post écrit retiré sans être publié") : await publishScript(p.id);
      if (res.error) {
        setPosts(backup);
        setError(res.error);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: "rgba(245,237,237,0.6)", lineHeight: 1.55 }}>
        {t("Copie, poste, puis touche « Publié » : le post sort d'ici et son sujet est mémorisé pour ne pas être refait.")}
      </p>
      {platforms.length > 1 && (
        <div style={{ display: "flex", gap: 6 }}>
          {["all", ...platforms].map((p) => (
            <button key={p} type="button" onClick={() => setFilter(p)} style={{ padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", border: `1px solid ${filter === p ? "rgba(224,30,30,0.6)" : "rgba(245,237,237,0.1)"}`, background: filter === p ? "rgba(224,30,30,0.15)" : "transparent", color: filter === p ? "#ff6b6b" : "rgba(245,237,237,0.6)" }}>
              {p === "all" ? t("Tous") : LABELS[p] ?? p} ({p === "all" ? posts.length : posts.filter((x) => x.platform === p).length})
            </button>
          ))}
        </div>
      )}
      {error && <p style={{ margin: 0, fontSize: 12.5, color: "#fca5a5" }}>{t(error)}</p>}
      {shown.length === 0 && (
        <p className="ep-card" style={{ margin: 0, padding: "16px", fontSize: 13, color: "rgba(245,237,237,0.55)", textAlign: "center" }}>
          {t("Aucun post à publier. Les nouveaux arrivent ici chaque jour.")}
        </p>
      )}
      {shown.map((p) => (
        <article key={p.id} className="ep-card" style={{ padding: "14px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "3px 8px", borderRadius: 999, background: "rgba(224,30,30,0.12)", color: "#ff6b6b" }}>{LABELS[p.platform] ?? p.platform}</span>
            <span style={{ flex: 1, fontSize: 12, color: "rgba(245,237,237,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
          </div>
          <p className="ep-selectable" style={{ margin: 0, fontSize: 13.5, color: "#F5EDED", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{p.content}</p>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={() => copy(p)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 10, border: "1px solid rgba(245,237,237,0.14)", background: "rgba(245,237,237,0.05)", color: "#F5EDED", fontSize: 12.5, fontWeight: 800, cursor: "pointer", minHeight: 40 }}>
              {copied === p.id ? <Check size={14} /> : <Copy size={14} />} {copied === p.id ? t("Copié") : t("Copier")}
            </button>
            <button type="button" onClick={() => done(p, false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 10, border: "none", background: "#4ade80", color: "#0D0000", fontSize: 12.5, fontWeight: 900, cursor: "pointer", minHeight: 40 }}>
              <Send size={14} /> {t("Publié")}
            </button>
            <button type="button" onClick={() => { if (window.confirm(t("Retirer ce post sans le publier ?"))) done(p, true); }} aria-label={t("Retirer ce post")} style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: 10, border: "none", background: "none", color: "rgba(245,237,237,0.4)", cursor: "pointer" }}>
              <Trash2 size={15} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
