"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, PlayCircle, Clock, FileText } from "lucide-react";
import { updateVideoStatus, updateVideoYoutubeUrl, updateVideoNotes, updateVideoScript } from "@/app/dashboard/coach/admin/tournage/actions";
import { STATUS_LABELS, VIDEO_STATUSES, type FormationGroup, type FounderVideoScript, type VideoStatus } from "@/lib/founder-video-scripts";

const STATUS_COLORS: Record<VideoStatus, string> = {
  a_ecrire: "rgba(245,237,237,0.35)",
  a_completer: "#facc15",
  pret_a_tourner: "#60a5fa",
  tourne: "#c084fc",
  publie: "#4ade80",
};

function estimateMinutes(wordCount: number): number {
  return Math.round((wordCount / 145) * 10) / 10;
}

export default function TournageWorkspace({ formations }: { formations: FormationGroup[] }) {
  const [openFormation, setOpenFormation] = useState<number | null>(formations[0]?.formation_num ?? null);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 20px 80px" }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(245,237,237,0.35)", marginBottom: 4 }}>
        Réservé au fondateur
      </p>
      <h1 style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 6 }}>
        Tournage des formations
      </h1>
      <p style={{ fontSize: 13, color: "rgba(245,237,237,0.5)", marginBottom: 28, maxWidth: 640 }}>
        Suivi des scripts mot pour mot, du statut de tournage et des liens YouTube, formation par formation. Cible : 15 minutes par vidéo, soit environ 2100 mots.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {formations.map((f) => (
          <FormationCard
            key={f.formation_num}
            group={f}
            open={openFormation === f.formation_num}
            onToggle={() => setOpenFormation(openFormation === f.formation_num ? null : f.formation_num)}
          />
        ))}
      </div>
    </div>
  );
}

function FormationCard({ group, open, onToggle }: { group: FormationGroup; open: boolean; onToggle: () => void }) {
  const pct = group.totalVideos ? Math.round((group.scriptsReady / group.totalVideos) * 100) : 0;

  // Regroupement section -> module pour l'affichage, dans l'ordre déjà trié.
  const sections = useMemo(() => {
    const map = new Map<string, { section_title: string; videos: FounderVideoScript[] }>();
    for (const v of group.videos) {
      let s = map.get(v.section_key);
      if (!s) {
        s = { section_title: v.section_title, videos: [] };
        map.set(v.section_key, s);
      }
      s.videos.push(v);
    }
    return Array.from(map.values());
  }, [group.videos]);

  return (
    <div className="ep-card" style={{ padding: 0, overflow: "hidden" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "16px 18px", background: "none", border: "none", cursor: "pointer", color: "#F5EDED", textAlign: "left",
        }}
      >
        {open ? <ChevronDown size={18} style={{ flexShrink: 0, opacity: 0.6 }} /> : <ChevronRight size={18} style={{ flexShrink: 0, opacity: 0.6 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#E01E1E", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Formation {group.formation_num}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800 }}>{group.formation_title}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>{group.scriptsReady} / {group.totalVideos}</p>
          <p style={{ margin: 0, fontSize: 10, color: "rgba(245,237,237,0.4)" }}>scripts prêts</p>
        </div>
        <div style={{ width: 60, height: 6, borderRadius: 999, background: "rgba(245,237,237,0.1)", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#4ade80" : "#E01E1E" }} />
        </div>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid rgba(245,237,237,0.08)", padding: "8px 12px 16px" }}>
          {sections.map((s, i) => (
            <div key={i} style={{ marginTop: i === 0 ? 8 : 18 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.45)", margin: "0 0 8px", padding: "0 6px" }}>
                {s.section_title}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.videos.map((v) => (
                  <VideoRow key={v.id} video={v} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VideoRow({ video }: { video: FounderVideoScript }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(video.status);
  const [youtubeUrl, setYoutubeUrl] = useState(video.youtube_url ?? "");
  const [notes, setNotes] = useState(video.notes ?? "");
  const [scriptDraft, setScriptDraft] = useState(video.script_content);
  const [scriptSaved, setScriptSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  const minutes = estimateMinutes(video.word_count);

  function cycleStatus() {
    const idx = VIDEO_STATUSES.indexOf(status);
    const next = VIDEO_STATUSES[(idx + 1) % VIDEO_STATUSES.length];
    setStatus(next);
    startTransition(async () => {
      const result = await updateVideoStatus(video.id, next);
      if (result.error) setStatus(status);
    });
  }

  function saveYoutube() {
    startTransition(async () => {
      await updateVideoYoutubeUrl(video.id, youtubeUrl);
    });
  }

  function saveNotes() {
    startTransition(async () => {
      await updateVideoNotes(video.id, notes);
    });
  }

  function saveScript() {
    startTransition(async () => {
      const result = await updateVideoScript(video.id, scriptDraft);
      if (!result.error) setScriptSaved(true);
    });
  }

  return (
    <div style={{ background: "rgba(245,237,237,0.03)", borderRadius: 8, border: "1px solid rgba(245,237,237,0.06)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "rgba(245,237,237,0.5)", flexShrink: 0 }}
        >
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setExpanded((e) => !e)}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
            {video.module_title ? `${video.module_num}.${video.video_num}` : video.video_num}
            {" — "}
            {video.video_title}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "rgba(245,237,237,0.4)", flexShrink: 0 }}>
          <Clock size={12} />
          {minutes > 0 ? `${minutes} min` : "—"}
        </div>
        {video.youtube_url && <PlayCircle size={14} style={{ color: "#FF0000", flexShrink: 0 }} />}
        <button
          type="button"
          onClick={cycleStatus}
          disabled={isPending}
          title="Cliquer pour passer au statut suivant"
          style={{
            flexShrink: 0, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            border: `1px solid ${STATUS_COLORS[status]}55`, background: `${STATUS_COLORS[status]}18`, color: STATUS_COLORS[status], cursor: "pointer",
          }}
        >
          {STATUS_LABELS[status]}
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.4)", marginBottom: 4 }}>
              <FileText size={12} /> Script ({scriptDraft.trim() ? scriptDraft.trim().split(/\s+/).length : 0} mots)
            </label>
            <textarea
              value={scriptDraft}
              onChange={(e) => { setScriptDraft(e.target.value); setScriptSaved(false); }}
              onBlur={saveScript}
              placeholder="Colle ou écris ici le script mot pour mot de cette vidéo…"
              rows={10}
              style={{
                width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.1)", borderRadius: 6,
                padding: "10px 12px", fontSize: 13, lineHeight: 1.6, color: "#F5EDED", resize: "vertical", fontFamily: "inherit",
              }}
            />
            {!scriptSaved && <p style={{ fontSize: 10, color: "rgba(245,237,237,0.4)", margin: "4px 0 0" }}>Non sauvegardé — clique en dehors du champ pour sauvegarder.</p>}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 260px" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.4)", marginBottom: 4 }}>
                Lien YouTube
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onBlur={saveYoutube}
                placeholder="https://youtube.com/…"
                style={{
                  width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.1)", borderRadius: 6,
                  padding: "7px 10px", fontSize: 12, color: "#F5EDED",
                }}
              />
            </div>
            <div style={{ flex: "1 1 260px" }}>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(245,237,237,0.4)", marginBottom: 4 }}>
                Note perso
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={saveNotes}
                placeholder="Ex : refaire la prise 2, plan large manquant…"
                style={{
                  width: "100%", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(245,237,237,0.1)", borderRadius: 6,
                  padding: "7px 10px", fontSize: 12, color: "#F5EDED",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
