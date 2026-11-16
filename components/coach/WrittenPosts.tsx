"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Send, Trash2, AlertTriangle, Lightbulb, Pencil, ChevronDown } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { publishScript, deleteScript, updateScript } from "@/app/dashboard/coach/studio/actions";
import PostComposer from "@/components/coach/PostComposer";
import type { CoachScript } from "@/lib/coach-ideation";
import { getContentFormat } from "@/lib/content-formats";
import { WRITTEN_PLATFORMS, checkWrittenPost, effectiveFormat, foldPreview, getWrittenPlatform, type WrittenPlatform } from "@/lib/written-content";
import { withAlpha } from "@/lib/theme-color";
import { ContentFormatBadge, ScriptBody } from "@/components/coach/ScriptFormatView";

// Posts écrits à publier (2026-10-08) : retour direct, « ça sert à rien de
// laisser les posts LinkedIn dans les scripts ». Ils ne se tournent pas : on
// copie, on poste, on touche « Publié » et le post sort de l'appli (son sujet
// reste mémorisé pour ne pas le refaire).
//
// 2026-11-16 : pensé pour un coach sans IA. En tête, « Écrire un post »
// (components/coach/PostComposer.tsx) : réseau, structure de départ,
// aperçu « voir plus », compteur et conseils en direct. Dessous, la liste à
// publier : chaque post replié sur ce qui se voit, modifiable sur place.
//
// 2026-11-15 : un onglet par type (Stories Insta, Posts Insta, LinkedIn,
// Threads), l'objectif du jour en tête (lib/content-cadence.ts), et pour
// chaque post ce qui sera vraiment vu : la séquence story par story, les
// slides et la légende à part, l'aperçu LinkedIn avant « voir plus ». Les
// contrôles (lib/written-content.ts) préviennent sans jamais bloquer.
export default function WrittenPosts({ initialPosts, publishedToday = {}, targets = {}, platforms }: {
  initialPosts: CoachScript[];
  publishedToday?: Record<string, number>;
  /** Objectifs du jour fixés par le coach (lib/content-targets.ts). */
  targets?: Partial<Record<string, number>>;
  /** Plateformes du coach (réglage « Mon appli »), toutes si absent. */
  platforms?: string[];
}) {
  const t = useT();
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [seen, setSeen] = useState(initialPosts);
  const [today, setToday] = useState(publishedToday);
  const [seenToday, setSeenToday] = useState(publishedToday);
  if (initialPosts !== seen) {
    setSeen(initialPosts);
    setPosts(initialPosts);
  }
  if (publishedToday !== seenToday) {
    setSeenToday(publishedToday);
    setToday(publishedToday);
  }
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  // Onglets : les types des plateformes du coach, plus tout type qui a un
  // objectif ou des posts en stock.
  const tabs = useMemo(
    () => WRITTEN_PLATFORMS.filter((w) => !platforms?.length || platforms.includes(w.setting) || !!targets[w.id] || posts.some((p) => p.platform === w.id)),
    [posts, platforms, targets]
  );
  // Réseaux où l'on écrit soi-même un post texte (le coach sans IA).
  const writable = WRITTEN_PLATFORMS.filter((w) => w.formats.includes("post_texte") && (!platforms?.length || platforms.includes(w.setting) || !!targets[w.id]));
  const firstWithPosts = tabs.find((w) => posts.some((p) => p.platform === w.id))?.id ?? tabs[0]?.id ?? "linkedin";
  const [tab, setTab] = useState<string>(firstWithPosts);
  const active = getWrittenPlatform(tab) ?? tabs[0];
  // Le plus ancien d'abord : on vide le stock dans l'ordre.
  const shown = posts
    .filter((p) => p.platform === active?.id)
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  function copy(key: string, value: string) {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1600);
    }).catch(() => {});
  }

  function done(p: CoachScript, remove: boolean) {
    const backup = posts;
    const backupToday = today;
    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    if (!remove) setToday((prev) => ({ ...prev, [p.platform]: (prev[p.platform] ?? 0) + 1 }));
    setError(null);
    start(async () => {
      const res = remove ? await deleteScript(p.id, "autre", "Post écrit retiré sans être publié") : await publishScript(p.id);
      if (res.error) {
        setPosts(backup);
        setToday(backupToday);
        setError(res.error);
      }
    });
  }

  function edited(id: string, content: string) {
    setPosts((prev) => prev.map((x) => (x.id === id ? { ...x, content } : x)));
  }

  const tabsWithStock = tabs.filter((w) => posts.some((p) => p.platform === w.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {writable.length > 0 && <PostComposer platforms={writable} onSaved={() => router.refresh()} />}
      {active && tabsWithStock.length > 1 && <div role="tablist" aria-label={t("Type de post")} style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {tabs.map((w) => {
          const on = w.id === active.id;
          const stock = posts.filter((p) => p.platform === w.id).length;
          return (
            <button
              key={w.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(w.id)}
              style={{
                flexShrink: 0, padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer",
                border: `1px solid ${on ? withAlpha(w.color, "99") : "rgba(var(--ep-ink-rgb),0.1)"}`,
                background: on ? withAlpha(w.color, "22") : "transparent",
                color: on ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)",
              }}
            >
              {t(w.plural)} {stock}{targets[w.id] ? ` · ${today[w.id] ?? 0}/${targets[w.id]}` : ""}
            </button>
          );
        })}
      </div>}

      {error && <p style={{ margin: 0, fontSize: 12.5, color: "#fca5a5" }}>{t(error)}</p>}
      {posts.length > 0 && <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("À publier")} · {shown.length}</p>}
      {posts.length === 0 && (
        <p style={{ margin: 0, padding: "4px 2px", fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.5)" }}>
          {t("Rien en attente. Les posts gardés pour plus tard arrivent ici.")}
        </p>
      )}
      {active && shown.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          platform={active}
          onEdited={(c) => edited(p.id, c)}
          copied={copied}
          onCopy={copy}
          onPublished={() => done(p, false)}
          onRemove={() => { if (window.confirm(t("Retirer ce post sans le publier ?"))) done(p, true); }}
        />
      ))}
    </div>
  );
}

function CopyBtn({ id, label, value, copied, onCopy, primary }: { id: string; label: string; value: string; copied: string | null; onCopy: (k: string, v: string) => void; primary?: boolean }) {
  const t = useT();
  const on = copied === id;
  return (
    <button
      type="button"
      onClick={() => onCopy(id, value)}
      disabled={!value}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 10, minHeight: 40,
        border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: primary ? "rgba(var(--ep-ink-rgb),0.08)" : "rgba(var(--ep-ink-rgb),0.04)",
        color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 800, cursor: value ? "pointer" : "default", opacity: value ? 1 : 0.5,
      }}
    >
      {on ? <Check size={14} /> : <Copy size={14} />} {on ? t("Copié") : t(label)}
    </button>
  );
}

function PostCard({ post, platform, copied, onCopy, onPublished, onRemove, onEdited }: {
  post: CoachScript;
  platform: WrittenPlatform;
  onEdited: (content: string) => void;
  copied: string | null;
  onCopy: (k: string, v: string) => void;
  onPublished: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const formatId = effectiveFormat(post.platform, post.content_format);
  const f = getContentFormat(formatId);
  const content = (post.content ?? "").trim();
  const caption = (post.instagram_caption ?? "").trim();
  const checks = useMemo(
    () => checkWrittenPost({ platform: post.platform, content_format: post.content_format, content: post.content, instagram_caption: post.instagram_caption }),
    [post.platform, post.content_format, post.content, post.instagram_caption]
  );
  const isText = f.shape === "texte";
  const fold = isText && platform.foldChars ? foldPreview(content, platform.foldChars) : null;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, startSave] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  function saveEdit() {
    const next = draft.trim();
    if (!next || next === content) {
      setEditing(false);
      return;
    }
    setSaveError(null);
    startSave(async () => {
      const res = await updateScript(post.id, { content: next });
      if (res.error) setSaveError(res.error);
      else {
        onEdited(next);
        setEditing(false);
      }
    });
  }

  return (
    <article className="ep-card" style={{ padding: "14px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <ContentFormatBadge formatId={formatId} />
        <span style={{ flex: 1, fontSize: 12, color: "rgba(var(--ep-ink-rgb),0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.title}</span>
        {isText && platform.maxChars && (
          <span style={{ fontSize: 10.5, fontWeight: 800, color: content.length > platform.maxChars ? "var(--ep-bad)" : "rgba(var(--ep-ink-rgb),0.4)", whiteSpace: "nowrap" }}>
            {content.length} / {platform.maxChars}
          </span>
        )}
      </div>

      {checks.length > 0 && (
        <ul style={{ listStyle: "none", margin: "0 0 10px", padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {checks.map((c) => (
            <li key={c.message} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11.5, lineHeight: 1.45, color: c.level === "erreur" ? "var(--ep-bad)" : "var(--ep-warn)" }}>
              {c.level === "erreur" ? <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} /> : <Lightbulb size={12} style={{ flexShrink: 0, marginTop: 2 }} />}
              <span>{t(c.message)}</span>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} aria-label={t("Texte du post")} style={{ width: "100%", minHeight: 180, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "var(--ep-ink)", fontSize: 14.5, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit" }} />
          {saveError && <p style={{ margin: 0, fontSize: 12, color: "var(--ep-bad)" }}>{t(saveError)}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" disabled={saving} onClick={saveEdit} style={{ padding: "9px 14px", borderRadius: 10, border: "none", background: "var(--ep-accent)", color: "#fff", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}>{t("Enregistrer")}</button>
            <button type="button" onClick={() => { setDraft(content); setEditing(false); }} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>{t("Annuler")}</button>
          </div>
        </div>
      ) : isText ? (
        <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <p className="ep-selectable" style={{ margin: 0, fontSize: 13.5, color: "var(--ep-ink)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {expanded || !fold?.cut ? content : fold.visible}
            {!expanded && fold?.cut && <span style={{ color: "rgba(var(--ep-ink-rgb),0.45)", fontWeight: 700 }}> … {t("voir plus")}</span>}
          </p>
          {expanded && fold?.cut && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.45)" }}><ChevronDown size={12} style={{ transform: "rotate(180deg)" }} /> {t("Réduire")}</span>}
        </button>
      ) : (
        <div className="ep-selectable"><ScriptBody formatId={formatId} content={content} /></div>
      )}

      {platform.hasCaption && (
        <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(var(--ep-shade-rgb),0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <p style={{ margin: 0, flex: 1, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("Légende")}</p>
            {platform.maxChars && caption && (
              <span style={{ fontSize: 10.5, fontWeight: 800, color: caption.length > platform.maxChars ? "var(--ep-bad)" : "rgba(var(--ep-ink-rgb),0.4)" }}>{caption.length} / {platform.maxChars}</span>
            )}
          </div>
          <p className="ep-selectable" style={{ margin: 0, fontSize: 13, color: caption ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.4)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {caption || t("Pas encore de légende.")}
          </p>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {platform.hasCaption ? (
          <>
            <CopyBtn id={`${post.id}:caption`} label="Copier la légende" value={caption} copied={copied} onCopy={onCopy} primary />
            <CopyBtn id={`${post.id}:content`} label={f.shape === "slides" ? "Copier les slides" : "Copier le visuel"} value={content} copied={copied} onCopy={onCopy} />
          </>
        ) : (
          <CopyBtn id={`${post.id}:content`} label={f.shape === "frames" ? "Copier la séquence" : "Copier"} value={content} copied={copied} onCopy={onCopy} primary />
        )}
        <button type="button" onClick={onPublished} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 10, border: "none", background: "var(--ep-ok)", color: "var(--ep-bg)", fontSize: 12.5, fontWeight: 900, cursor: "pointer", minHeight: 40 }}>
          <Send size={14} /> {t("Publié")}
        </button>
        {isText && !editing && (
          <button type="button" onClick={() => { setDraft(content); setEditing(true); }} aria-label={t("Modifier ce post")} style={{ width: 40, height: 40, borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Pencil size={14} />
          </button>
        )}
        <button type="button" onClick={onRemove} aria-label={t("Retirer ce post")} style={{ marginLeft: "auto", width: 40, height: 40, borderRadius: 10, border: "none", background: "none", color: "rgba(var(--ep-ink-rgb),0.4)", cursor: "pointer" }}>
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
