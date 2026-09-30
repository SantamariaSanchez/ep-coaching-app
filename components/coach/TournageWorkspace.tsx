"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, ChevronRight, Clock, FileText, Clapperboard, PlayCircle, CheckCircle2, Film } from "lucide-react";
import { updateVideoStatus, updateVideoYoutubeUrl, updateVideoNotes, updateVideoScript } from "@/app/dashboard/coach/admin/tournage/actions";
import { STATUS_LABELS, VIDEO_STATUSES, type FormationGroup, type FounderVideoScript, type VideoStatus } from "@/lib/founder-video-scripts";

// Tournage des formations (fondateur), refait le 2026-09-30 : on ouvre sur
// la PROCHAINE vidéo à tourner (prompteur en un tap), puis la progression
// par formation, des filtres par statut et des actions explicites (plus de
// pastille qui change de statut au clic sans prévenir).

const Teleprompter = dynamic(() => import("@/components/coach/Teleprompter"), { ssr: false });

const STATUS_COLORS: Record<VideoStatus, string> = {
  a_ecrire: "rgba(245,237,237,0.45)",
  a_completer: "#facc15",
  pret_a_tourner: "#60a5fa",
  tourne: "#c084fc",
  publie: "#4ade80",
};

type Filter = "tout" | "a_tourner" | "a_ecrire" | "tourne" | "publie";
const FILTERS: { key: Filter; label: string; match: (s: VideoStatus) => boolean }[] = [
  { key: "a_tourner", label: "À tourner", match: (s) => s === "pret_a_tourner" },
  { key: "a_ecrire", label: "À écrire", match: (s) => s === "a_ecrire" || s === "a_completer" },
  { key: "tourne", label: "Tournées", match: (s) => s === "tourne" },
  { key: "publie", label: "Publiées", match: (s) => s === "publie" },
  { key: "tout", label: "Toutes", match: () => true },
];

function minutesOf(wordCount: number): number {
  return Math.round((wordCount / 145) * 10) / 10;
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: "7px 13px",
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: `1px solid ${active ? "rgba(224,30,30,0.6)" : "rgba(137,4,4,0.35)"}`,
    background: active ? "rgba(224,30,30,0.15)" : "transparent",
    color: active ? "#ff6b6b" : "rgba(245,237,237,0.6)",
  };
}

const btn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, letterSpacing: "0.03em", textTransform: "uppercase", cursor: "pointer" };
const ghost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 12, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "rgba(245,237,237,0.8)", fontSize: 12, fontWeight: 800, cursor: "pointer" };

export default function TournageWorkspace({ formations }: { formations: FormationGroup[] }) {
  // Statuts gardés ici : le passage "tourné" depuis le prompteur met à jour
  // la liste tout de suite, sans recharger la page.
  const [statusById, setStatusById] = useState<Record<string, VideoStatus>>(() =>
    Object.fromEntries(formations.flatMap((f) => f.videos.map((v) => [v.id, v.status])))
  );
  const [filter, setFilter] = useState<Filter>("a_tourner");
  const [prompter, setPrompter] = useState<FounderVideoScript | null>(null);
  const [, start] = useTransition();

  const all = useMemo(() => formations.flatMap((f) => f.videos), [formations]);
  const statusOf = (v: FounderVideoScript) => statusById[v.id] ?? v.status;
  const queue = all.filter((v) => statusOf(v) === "pret_a_tourner");
  const next = queue[0] ?? null;
  const counts = {
    total: all.length,
    ready: queue.length,
    filmed: all.filter((v) => statusOf(v) === "tourne").length,
    published: all.filter((v) => statusOf(v) === "publie").length,
    toWrite: all.filter((v) => ["a_ecrire", "a_completer"].includes(statusOf(v))).length,
  };
  const readyMinutes = Math.round(queue.reduce((s, v) => s + minutesOf(v.word_count), 0));
  const [open, setOpen] = useState<number | null>(next?.formation_num ?? formations[0]?.formation_num ?? null);

  function setStatus(id: string, status: VideoStatus) {
    const prev = statusById[id];
    setStatusById((m) => ({ ...m, [id]: status }));
    start(async () => {
      const res = await updateVideoStatus(id, status);
      if (res.error) setStatusById((m) => ({ ...m, [id]: prev }));
    });
  }

  const f = FILTERS.find((x) => x.key === filter)!;

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 96px" }}>
      <p className="ep-label" style={{ marginBottom: 4 }}>Administration</p>
      <h1 style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", margin: "0 0 4px" }}>Tournage des formations</h1>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", margin: "0 0 18px", maxWidth: 640 }}>
        Tes 5 formations, vidéo par vidéo : script mot pour mot, prompteur, puis lien YouTube une fois en ligne.
      </p>

      {/* Chiffres clés */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8, marginBottom: 14 }}>
        {[
          { v: counts.ready, l: "prêtes à tourner", c: "#60a5fa" },
          { v: counts.filmed, l: "tournées", c: "#c084fc" },
          { v: counts.published, l: "publiées", c: "#4ade80" },
          { v: counts.toWrite, l: "scripts à finir", c: "#facc15" },
        ].map((t) => (
          <div key={t.l} className="ep-card" style={{ padding: "12px 14px" }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: t.c, margin: 0, lineHeight: 1.1 }}>{t.v}</p>
            <p style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", margin: "2px 0 0" }}>{t.l}</p>
          </div>
        ))}
      </div>

      {/* Prochaine vidéo */}
      {next ? (
        <section className="ep-card-hero" style={{ padding: "16px 18px", marginBottom: 18 }}>
          <p className="ep-label" style={{ margin: "0 0 6px", display: "flex", alignItems: "center", gap: 6 }}>
            <Clapperboard size={12} /> Prochaine vidéo à tourner
          </p>
          <p style={{ fontSize: 17, fontWeight: 900, color: "#F5EDED", margin: 0, lineHeight: 1.3 }}>{next.video_title}</p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.55)", margin: "3px 0 12px" }}>
            Formation {next.formation_num} · {next.section_title} · environ {minutesOf(next.word_count)} min
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={btn} onClick={() => setPrompter(next)}>
              <Film size={14} /> Lancer le prompteur
            </button>
            <button type="button" style={ghost} onClick={() => setStatus(next.id, "tourne")}>
              <CheckCircle2 size={14} /> Déjà tournée
            </button>
          </div>
          <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: "10px 0 0" }}>
            {queue.length} vidéo{queue.length > 1 ? "s" : ""} prête{queue.length > 1 ? "s" : ""} dans la file, environ {readyMinutes} min de tournage. Le prompteur enchaîne sur la suivante.
          </p>
        </section>
      ) : (
        <section className="ep-card" style={{ padding: "14px 16px", marginBottom: 18 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: "#F5EDED", margin: 0 }}>Aucune vidéo prête à tourner pour l&apos;instant.</p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.5)", margin: "3px 0 0" }}>Termine un script puis passe-le en « Prêt à tourner » : il arrivera ici.</p>
        </section>
      )}

      {/* Filtres */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 12 }} className="no-scrollbar">
        {FILTERS.map((x) => (
          <button key={x.key} type="button" style={chip(filter === x.key)} onClick={() => setFilter(x.key)}>
            {x.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {formations.map((g) => {
          const videos = g.videos.filter((v) => f.match(statusOf(v)));
          const ready = g.videos.filter((v) => ["pret_a_tourner", "tourne", "publie"].includes(statusOf(v))).length;
          const filmed = g.videos.filter((v) => ["tourne", "publie"].includes(statusOf(v))).length;
          const isOpen = open === g.formation_num;
          return (
            <div key={g.formation_num} className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : g.formation_num)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", color: "#F5EDED", textAlign: "left" }}
              >
                {isOpen ? <ChevronDown size={18} style={{ flexShrink: 0, opacity: 0.6 }} /> : <ChevronRight size={18} style={{ flexShrink: 0, opacity: 0.6 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#E01E1E", textTransform: "uppercase", letterSpacing: "0.05em" }}>Formation {g.formation_num}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 15.5, fontWeight: 800 }}>{g.formation_title}</p>
                  <p style={{ margin: "3px 0 0", fontSize: 11.5, color: "rgba(245,237,237,0.5)" }}>
                    {ready}/{g.totalVideos} scripts prêts · {filmed} tournée{filmed > 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ width: 64, height: 6, borderRadius: 999, background: "rgba(245,237,237,0.1)", overflow: "hidden", flexShrink: 0 }}>
                  <div style={{ width: `${g.totalVideos ? Math.round((ready / g.totalVideos) * 100) : 0}%`, height: "100%", background: ready === g.totalVideos ? "#4ade80" : "#E01E1E" }} />
                </div>
              </button>
              {isOpen && (
                <div style={{ borderTop: "1px solid rgba(245,237,237,0.08)", padding: "10px 12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {videos.length === 0 ? (
                    <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.45)", margin: "6px 4px" }}>Aucune vidéo « {f.label.toLowerCase()} » dans cette formation.</p>
                  ) : (
                    videos.map((v) => <VideoRow key={v.id} video={v} status={statusOf(v)} onStatus={(s) => setStatus(v.id, s)} onPrompter={() => setPrompter(v)} />)
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {prompter && (
        <Teleprompter
          scriptId={prompter.id}
          title={prompter.video_title}
          content={prompter.script_content}
          queueProgress={queue.findIndex((v) => v.id === prompter.id) >= 0 ? { index: queue.findIndex((v) => v.id === prompter.id) + 1, total: queue.length } : undefined}
          onClose={() => setPrompter(null)}
          onFinishedTake={() => {
            // Prise enregistrée : vidéo tournée, on enchaîne sur la suivante.
            const done = prompter;
            setStatus(done.id, "tourne");
            const after = queue.filter((v) => v.id !== done.id)[0] ?? null;
            setPrompter(after);
          }}
        />
      )}
    </div>
  );
}

function VideoRow({ video, status, onStatus, onPrompter }: { video: FounderVideoScript; status: VideoStatus; onStatus: (s: VideoStatus) => void; onPrompter: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState(video.youtube_url ?? "");
  const [notes, setNotes] = useState(video.notes ?? "");
  const [scriptDraft, setScriptDraft] = useState(video.script_content);
  const [scriptSaved, setScriptSaved] = useState(true);
  const [, start] = useTransition();
  const words = scriptDraft.trim() ? scriptDraft.trim().split(/\s+/).length : 0;
  const label = video.module_title ? `${video.module_num}.${video.video_num}` : `${video.video_num}`;

  const field: React.CSSProperties = { width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.1)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "#F5EDED" };
  const lbl: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.45)", marginBottom: 4 };

  return (
    <div style={{ background: "rgba(245,237,237,0.03)", borderRadius: 10, border: "1px solid rgba(245,237,237,0.06)" }}>
      <button type="button" onClick={() => setExpanded((e) => !e)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", background: "none", border: "none", cursor: "pointer", color: "#F5EDED", textAlign: "left" }}>
        {expanded ? <ChevronDown size={15} style={{ opacity: 0.5, flexShrink: 0 }} /> : <ChevronRight size={15} style={{ opacity: 0.5, flexShrink: 0 }} />}
        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700 }}>
          <span style={{ color: "rgba(245,237,237,0.4)" }}>{label}</span> {video.video_title}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(245,237,237,0.45)", flexShrink: 0 }}>
          <Clock size={12} /> {video.word_count > 0 ? `${minutesOf(video.word_count)} min` : "vide"}
        </span>
        {youtubeUrl && <PlayCircle size={14} style={{ color: "#FF0000", flexShrink: 0 }} />}
        <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, padding: "4px 9px", borderRadius: 999, border: `1px solid ${STATUS_COLORS[status]}55`, background: `${STATUS_COLORS[status]}18`, color: STATUS_COLORS[status] }}>{STATUS_LABELS[status]}</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {status === "pret_a_tourner" && (
              <button type="button" style={btn} onClick={onPrompter}>
                <Film size={13} /> Prompteur
              </button>
            )}
            <select value={status} onChange={(e) => onStatus(e.target.value as VideoStatus)} aria-label="Statut de la vidéo" style={{ ...field, width: "auto", padding: "9px 10px", fontWeight: 700 }}>
              {VIDEO_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={lbl}>
              <FileText size={12} /> Script ({words} mots, environ {minutesOf(words)} min)
            </label>
            <textarea
              value={scriptDraft}
              onChange={(e) => {
                setScriptDraft(e.target.value);
                setScriptSaved(false);
              }}
              onBlur={() => start(async () => {
                const res = await updateVideoScript(video.id, scriptDraft);
                if (!res.error) setScriptSaved(true);
              })}
              placeholder="Colle ou écris ici le script mot pour mot de cette vidéo."
              rows={10}
              style={{ ...field, lineHeight: 1.6, resize: "vertical", fontFamily: "inherit" }}
            />
            {!scriptSaved && <p style={{ fontSize: 10.5, color: "rgba(245,237,237,0.45)", margin: "4px 0 0" }}>Enregistrement dès que tu quittes le champ.</p>}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 240px" }}>
              <label style={lbl}>
                <PlayCircle size={12} /> Lien YouTube
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onBlur={() => start(async () => {
                  await updateVideoYoutubeUrl(video.id, youtubeUrl);
                  // Une vidéo en ligne est publiée : un geste de moins.
                  if (youtubeUrl.trim() && status !== "publie") onStatus("publie");
                })}
                placeholder="https://youtube.com/..."
                style={field}
              />
            </div>
            <div style={{ flex: "1 1 240px" }}>
              <label style={lbl}>Note perso</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => start(async () => { await updateVideoNotes(video.id, notes); })} placeholder="Ex : refaire la prise 2, plan large manquant" style={field} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
