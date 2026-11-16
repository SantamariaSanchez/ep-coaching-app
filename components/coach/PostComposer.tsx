"use client";

import { useMemo, useState, useTransition } from "react";
import { PenLine, Copy, Check, Send, Save, AlertTriangle, Lightbulb } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { createScript, publishScript } from "@/app/dashboard/coach/studio/actions";
import { safeAction } from "@/lib/safe-action";
import { checkWrittenPost, foldPreview, type WrittenPlatform } from "@/lib/written-content";
import { templatesFor, titleFromPost, unfilledLines } from "@/lib/post-templates";
import { withAlpha } from "@/lib/theme-color";

// Écrire un post soi-même (2026-11-16) : le Studio pensé pour un coach qui
// n'utilise pas d'IA. Un réseau, une structure si on veut un point de départ,
// le texte, et en direct ce qui sera vu avant « voir plus », le compteur et
// les conseils. Puis : garder pour plus tard, ou copier et marquer publié.
export default function PostComposer({ platforms, onSaved }: {
  /** Réseaux écrits du coach (texte seulement). */
  platforms: WrittenPlatform[];
  /** Appelé quand un post est gardé dans la liste « À publier ». */
  onSaved: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [platformId, setPlatformId] = useState(platforms[0]?.id ?? "linkedin");
  const platform = platforms.find((p) => p.id === platformId) ?? platforms[0];
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const checks = useMemo(
    () => (text.trim() ? checkWrittenPost({ platform: platformId, content_format: "post_texte", content: text, instagram_caption: null }) : []),
    [platformId, text]
  );
  const fold = platform?.foldChars && text.trim() ? foldPreview(text.trim(), platform.foldChars) : null;
  const left = unfilledLines(text);
  const len = text.trim().length;
  const over = !!platform?.maxChars && len > platform.maxChars;
  const ready = len > 0 && !over && left === 0;

  if (!platform) return null;

  function save(publish: boolean) {
    const content = text.trim();
    if (!content) return;
    setMsg(null);
    if (publish) void navigator.clipboard?.writeText(content).catch(() => {});
    start(async () => {
      const res = await safeAction(() => createScript({ title: titleFromPost(content), format: "court", content, platform: platformId, status: "a_tourner", contentFormat: "post_texte" }));
      if (res.error || !res.id) {
        setMsg(res.error ?? "Enregistrement impossible, réessaie.");
        return;
      }
      if (publish) {
        const pub = await safeAction(() => publishScript(res.id!));
        if (pub.error) {
          setMsg(pub.error);
          return;
        }
        setMsg("Copié et compté comme publié.");
      } else {
        setMsg("Gardé dans « À publier ».");
        onSaved();
      }
      setText("");
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="ep-card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", width: "100%", cursor: "pointer", border: "1px dashed rgba(var(--ep-accent-rgb),0.45)", background: "transparent", color: "var(--ep-ink)", textAlign: "left" }}>
        <PenLine size={16} style={{ color: "var(--ep-accent)" }} />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 800 }}>{t("Écrire un post")}</span>
        <span style={{ fontSize: 11.5, color: "rgba(var(--ep-ink-rgb),0.45)" }}>{platforms.map((p) => t(p.label)).join(" · ")}</span>
      </button>
    );
  }

  return (
    <section className="ep-card" style={{ padding: "14px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }} aria-label={t("Écrire un post")}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} role="radiogroup" aria-label={t("Réseau")}>
        {platforms.map((p) => {
          const on = p.id === platformId;
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPlatformId(p.id)} style={{ padding: "7px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", border: `1px solid ${on ? withAlpha(p.color, "99") : "rgba(var(--ep-ink-rgb),0.12)"}`, background: on ? withAlpha(p.color, "22") : "transparent", color: on ? "var(--ep-ink)" : "rgba(var(--ep-ink-rgb),0.6)" }}>
              {t(p.label)}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }} aria-label={t("Partir d'une structure")}>
        {templatesFor(platformId).map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            title={t(tpl.hint)}
            onClick={() => { if (!text.trim() || window.confirm(t("Remplacer le texte par cette structure ?"))) setText(tpl.skeleton); }}
            style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 9, fontSize: 11.5, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(var(--ep-ink-rgb),0.12)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "var(--ep-ink)" }}
          >
            {t(tpl.label)}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={t("Ta première ligne compte le plus : c'est elle qui donne envie de lire la suite.")}
        aria-label={t("Texte du post")}
        style={{ width: "100%", minHeight: 200, padding: "12px", borderRadius: 12, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "rgba(var(--ep-shade-rgb),0.3)", color: "var(--ep-ink)", fontSize: 15, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, fontWeight: 700 }}>
        <span style={{ color: over ? "var(--ep-bad)" : "rgba(var(--ep-ink-rgb),0.45)" }}>
          {len}{platform.maxChars ? ` / ${platform.maxChars}` : ""} {t("caractères")}
        </span>
        {left > 0 && <span style={{ color: "var(--ep-warn)" }}>· {left} {t(left > 1 ? "lignes à remplacer" : "ligne à remplacer")}</span>}
      </div>

      {fold && (
        <div style={{ padding: "10px 12px", borderRadius: 10, background: withAlpha(platform.color, "12"), border: `1px solid ${withAlpha(platform.color, "33")}` }}>
          <p style={{ margin: "0 0 4px", fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(var(--ep-ink-rgb),0.45)" }}>{t("Ce qu'on voit avant « voir plus »")}</p>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ep-ink)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {fold.visible}{fold.cut && <span style={{ color: "rgba(var(--ep-ink-rgb),0.45)", fontWeight: 700 }}> … {t("voir plus")}</span>}
          </p>
        </div>
      )}

      {checks.length > 0 && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {checks.map((c) => (
            <li key={c.message} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11.5, lineHeight: 1.45, color: c.level === "erreur" ? "var(--ep-bad)" : "var(--ep-warn)" }}>
              {c.level === "erreur" ? <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 2 }} /> : <Lightbulb size={12} style={{ flexShrink: 0, marginTop: 2 }} />}
              <span>{t(c.message)}</span>
            </li>
          ))}
        </ul>
      )}

      {msg && <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: msg.startsWith("Copié") || msg.startsWith("Gardé") ? "var(--ep-ok)" : "var(--ep-bad)" }}>{t(msg)}</p>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={!ready || pending} onClick={() => save(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: "none", background: "var(--ep-accent)", color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer", minHeight: 42, opacity: ready ? 1 : 0.45 }}>
          <Copy size={14} /><Send size={14} /> {t("Copier et publier")}
        </button>
        <button type="button" disabled={!len || over || pending} onClick={() => save(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(var(--ep-ink-rgb),0.14)", background: "transparent", color: "var(--ep-ink)", fontSize: 13, fontWeight: 800, cursor: "pointer", minHeight: 42, opacity: len && !over ? 1 : 0.45 }}>
          <Save size={14} /> {t("Garder pour plus tard")}
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ marginLeft: "auto", padding: "10px 12px", borderRadius: 10, border: "none", background: "none", color: "rgba(var(--ep-ink-rgb),0.5)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          {t("Fermer")}
        </button>
      </div>
      {pending && <p style={{ margin: 0, fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.45)" }}><Check size={11} /> {t("Enregistrement…")}</p>}
    </section>
  );
}
