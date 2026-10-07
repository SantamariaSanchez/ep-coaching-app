"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { savePostAction, deletePostAction, type PostInput } from "@/app/dashboard/coach/stats-reseaux/actions";

// Ajout ou mise à jour d'une publication par le coach : ses chiffres,
// son format, et le script du Studio dont elle vient. Remettre à jour les
// chiffres quelques jours plus tard garde l'historique (un instantané par jour).

const LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
};

const TYPES: { value: string; label: string }[] = [
  { value: "reel", label: "Reel" },
  { value: "video", label: "Vidéo" },
  { value: "short", label: "Short" },
  { value: "carrousel", label: "Carrousel" },
  { value: "post", label: "Post photo" },
  { value: "texte", label: "Post texte" },
  { value: "story", label: "Story" },
  { value: "live", label: "Live" },
];

const METRICS: { key: keyof PostInput; label: string; hint?: string; video?: boolean }[] = [
  { key: "views", label: "Vues" },
  { key: "reach", label: "Comptes touchés" },
  { key: "likes", label: "J'aime" },
  { key: "comments", label: "Commentaires" },
  { key: "shares", label: "Partages" },
  { key: "saves", label: "Enregistrements" },
  { key: "newFollowers", label: "Nouveaux abonnés" },
  { key: "avgWatchSeconds", label: "Temps moyen regardé", hint: "secondes", video: true },
  { key: "durationSeconds", label: "Durée de la vidéo", hint: "secondes", video: true },
  { key: "completionRate", label: "Vues complètes", hint: "%", video: true },
];

export interface EditablePost {
  id: string;
  platform: string;
  published_at: string | null;
  url: string | null;
  post_type: string | null;
  caption: string | null;
  script_id: string | null;
  duration_seconds: number | null;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  new_followers: number | null;
  avg_watch_seconds: number | null;
  completion_rate: number | null;
}

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(137,4,4,0.35)",
  borderRadius: 10,
  padding: "9px 10px",
  fontSize: 14,
  color: "#F5EDED",
  outline: "none",
};
const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 4 };

function toParisLocal(iso: string | null, fallback: string): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  const date = d.toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  return `${date}T${time}`;
}

function fromPost(p: EditablePost | null, platforms: string[], nowLocal: string): Record<string, string> {
  const s = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
  return {
    platform: p?.platform ?? platforms[0] ?? "instagram",
    publishedAt: toParisLocal(p?.published_at ?? null, nowLocal),
    url: p?.url ?? "",
    postType: p?.post_type ?? "",
    caption: p?.caption ?? "",
    scriptId: p?.script_id ?? "",
    durationSeconds: s(p?.duration_seconds),
    views: s(p?.views),
    reach: s(p?.reach),
    likes: s(p?.likes),
    comments: s(p?.comments),
    shares: s(p?.shares),
    saves: s(p?.saves),
    newFollowers: s(p?.new_followers),
    avgWatchSeconds: s(p?.avg_watch_seconds),
    completionRate: s(p?.completion_rate),
  };
}

export default function PostEntryForm({
  platforms,
  scripts,
  nowLocal,
  post = null,
}: {
  platforms: string[];
  scripts: { id: string; title: string; platform: string | null }[];
  /** "YYYY-MM-DDTHH:mm" à Paris, calculé côté serveur. */
  nowLocal: string;
  post?: EditablePost | null;
}) {
  const tr = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>(() => fromPost(post, platforms, nowLocal));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, val: string) => setV((cur) => ({ ...cur, [k]: val }));
  const isVideo = ["reel", "video", "short", "live", ""].includes(v.postType);
  const scriptOptions = scripts.filter((s) => !s.platform || s.platform === v.platform || s.id === v.scriptId);
  const allPlatforms = platforms.includes(v.platform) ? platforms : [...platforms, v.platform];

  function save() {
    setError(null);
    start(async () => {
      const res = await savePostAction({ ...(v as unknown as PostInput), id: post?.id ?? null, scriptId: v.scriptId || null, postType: v.postType || null });
      if (res.error) return setError(res.error);
      setOpen(false);
      if (!post) setV(fromPost(null, platforms, nowLocal));
      router.refresh();
    });
  }

  function remove() {
    if (!post || !confirm("Supprimer cette publication de tes stats ?")) return;
    start(async () => {
      const res = await deletePostAction(post.id);
      if (res.error) return setError(res.error);
      router.refresh();
    });
  }

  if (!open) {
    return post ? (
      <span style={{ display: "inline-flex", gap: 10 }}>
        <button type="button" onClick={() => setOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: 0, color: "#ff6b6b", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}>
          <Pencil size={11} />{" "}{tr("Mettre à jour")}
        </button>
        <button type="button" onClick={remove} disabled={pending} aria-label={tr("Supprimer")} style={{ display: "inline-flex", alignItems: "center", background: "none", border: "none", padding: 0, color: "rgba(245,237,237,0.4)", cursor: "pointer" }}>
          <Trash2 size={12} />
        </button>
        {error && <span style={{ fontSize: 10.5, color: "#fca5a5" }}>{error}</span>}
      </span>
    ) : (
      <button type="button" onClick={() => setOpen(true)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 14px", borderRadius: 12, border: "1px dashed rgba(224,30,30,0.55)", background: "rgba(224,30,30,0.06)", color: "#F5EDED", fontSize: 12.5, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}>
        <Plus size={15} />{" "}{tr("Ajouter une publication")}
      </button>
    );
  }

  return (
    <div className="ep-card" style={{ padding: "14px 14px", marginTop: post ? 10 : 0, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p className="ep-label" style={{ margin: 0 }}>{post ? tr("Mettre à jour la publication") : tr("Nouvelle publication")}</p>
        <button type="button" onClick={() => setOpen(false)} aria-label={tr("Fermer")} style={{ background: "none", border: "none", color: "rgba(245,237,237,0.5)", cursor: "pointer" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        <div>
          <label style={lbl}>{tr("Plateforme")}</label>
          <select style={input} value={v.platform} onChange={(e) => set("platform", e.target.value)} aria-label={tr("Plateforme")}>
            {allPlatforms.map((p) => (
              <option key={p} value={p}>{LABELS[p] ?? p}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>{tr("Format")}</label>
          <select style={input} value={v.postType} onChange={(e) => set("postType", e.target.value)} aria-label={tr("Format")}>
            <option value="">{tr("Choisir")}</option>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>{tr("Publiée le")}</label>
          <input type="datetime-local" style={input} value={v.publishedAt} max={nowLocal} onChange={(e) => set("publishedAt", e.target.value)} aria-label={tr("Date de publication")} />
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={lbl}>{tr("Sujet ou accroche")}</label>
        <input style={input} value={v.caption} onChange={(e) => set("caption", e.target.value)} placeholder={tr("Ex. 3 erreurs qui bloquent ta sèche")} aria-label={tr("Sujet")} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginTop: 10 }}>
        <div>
          <label style={lbl}>{tr("Lien")}</label>
          <input style={input} value={v.url} onChange={(e) => set("url", e.target.value)} placeholder={tr("https://")} aria-label={tr("Lien")} />
        </div>
        <div>
          <label style={lbl}>{tr("Script du Studio")}</label>
          <select style={input} value={v.scriptId} onChange={(e) => set("scriptId", e.target.value)} aria-label={tr("Script lié")}>
            <option value="">{tr("Aucun")}</option>
            {scriptOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.title.slice(0, 60)}</option>
            ))}
          </select>
        </div>
      </div>

      <p style={{ ...lbl, marginTop: 14 }}>{tr("Chiffres (laisse vide ce que tu n'as pas)")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
        {METRICS.filter((m) => !m.video || isVideo).map((m) => (
          <div key={m.key}>
            <label style={lbl}>
              {m.label}
              {m.hint ? <span style={{ textTransform: "none", fontWeight: 600, color: "rgba(245,237,237,0.3)" }}> ({m.hint})</span> : null}
            </label>
            <input style={input} inputMode="decimal" value={v[m.key] ?? ""} onChange={(e) => set(m.key, e.target.value)} placeholder="-" aria-label={m.label} />
          </div>
        ))}
      </div>

      {error && <p style={{ fontSize: 12, color: "#fca5a5", margin: "10px 0 0" }}>{error}</p>}
      <button type="button" disabled={pending} onClick={save} style={{ marginTop: 14, width: "100%", padding: "12px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12.5, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", opacity: pending ? 0.6 : 1 }}>
        {pending ? "..." : post ? tr("Enregistrer les chiffres") : tr("Ajouter")}
      </button>
    </div>
  );
}
