"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardPaste, Clock, Loader2, RefreshCw, X } from "lucide-react";
import type { FormationLesson, FormationSection } from "@/utils/formations";
import {
  MAX_YOUTUBE_LINES,
  parseYoutubeLines,
  secondsToLessonMinutes,
  type YoutubePreviewStatus,
} from "@/lib/youtube";
import { getYoutubeDurationSeconds } from "@/lib/youtube-iframe-api";
import { bulkAssignLessonVideos, bulkUpdateLessonDurations, previewYoutubeVideos } from "../actions";

// ── Coller toutes les vidéos d'un module d'un coup ──────────────────────────
// Remplir l'Académie leçon par leçon (ouvrir, coller l'URL, cocher Publier,
// enregistrer, puis corriger la durée figée à 10 min) représentait plus de
// 100 manipulations rien que pour F1. Ici : une URL par ligne dans l'ordre
// des vidéos, aperçu leçon par leçon (titre YouTube, vidéo privée signalée,
// durée détectée), puis un seul enregistrement.

type RowStatus = YoutubePreviewStatus | "invalide";

interface PreviewRow {
  lesson: FormationLesson;
  raw: string;
  id: string | null;
  status: RowStatus;
  title?: string;
  /** undefined : détection pas encore faite ; null : durée non détectée. */
  durationSec?: number | null;
}

const STATUS_STYLE: Record<RowStatus, { label: string; color: string; bg: string }> = {
  ok: { label: "OK", color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  privee: { label: "Privée", color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
  introuvable: { label: "Introuvable", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  invalide: { label: "URL non reconnue", color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  inconnue: { label: "Non vérifiée", color: "rgba(245,237,237,0.5)", bg: "rgba(245,237,237,0.06)" },
};

function formatSeconds(sec: number): string {
  const total = Math.round(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

export function BulkVideoImport({
  section,
  onClose,
  onSaved,
}: {
  section: FormationSection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [extraLines, setExtraLines] = useState(0);
  const [checking, setChecking] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Chaque aperçu reçoit un numéro : une détection de durées encore en cours
  // pour un aperçu précédent (ou après fermeture du panneau) ne doit plus
  // écrire dans l'état.
  const runRef = useRef(0);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);
  const isCurrent = (run: number) => aliveRef.current && runRef.current === run;

  // Leçons visées, dans l'ordre du module : sans "Remplacer", seulement
  // celles qui n'ont pas encore de vidéo.
  const targets = section.lessons.filter((l) => replaceExisting || !l.youtube_id);

  async function detectDurations(run: number, list: PreviewRow[]) {
    setDetecting(true);
    // Séquentiel : un lecteur caché à la fois, plus léger pour le navigateur.
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      if (!row.id || row.status === "introuvable" || row.status === "privee") continue;
      const seconds = await getYoutubeDurationSeconds(row.id);
      if (!isCurrent(run)) return;
      setRows((prev) => (prev ? prev.map((r, idx) => (idx === i ? { ...r, durationSec: seconds } : r)) : prev));
    }
    if (isCurrent(run)) setDetecting(false);
  }

  async function handlePreview() {
    setError(null);
    const lines = parseYoutubeLines(text);
    if (lines.length === 0) {
      setError("Colle au moins une URL YouTube.");
      return;
    }
    if (lines.length > MAX_YOUTUBE_LINES) {
      setError(`${MAX_YOUTUBE_LINES} URL maximum par collage.`);
      return;
    }
    if (targets.length === 0) {
      setError("Toutes les leçons de ce module ont déjà une vidéo. Coche Remplacer pour les écraser.");
      return;
    }

    const run = ++runRef.current;
    const paired = lines.slice(0, targets.length);
    const ids = paired.map((l) => l.id).filter((id): id is string => !!id);

    setChecking(true);
    let res: Awaited<ReturnType<typeof previewYoutubeVideos>>;
    try {
      res = await previewYoutubeVideos(ids);
    } catch {
      res = { error: "Connexion impossible, réessaie." };
    }
    setChecking(false);
    if (!isCurrent(run)) return;
    if (res.error) {
      setError(res.error);
      return;
    }

    const byId = new Map((res.results ?? []).map((r) => [r.id, r]));
    const nextRows: PreviewRow[] = paired.map((line, i) => {
      const preview = line.id ? byId.get(line.id) : undefined;
      return {
        lesson: targets[i],
        raw: line.raw,
        id: line.id,
        status: line.id ? (preview?.status ?? "inconnue") : "invalide",
        title: preview?.title,
        durationSec: line.id && preview?.status !== "introuvable" && preview?.status !== "privee" ? undefined : null,
      };
    });
    setRows(nextRows);
    setExtraLines(Math.max(0, lines.length - targets.length));
    void detectDurations(run, nextRows);
  }

  function backToEdit() {
    runRef.current++;
    setRows(null);
    setDetecting(false);
    setError(null);
  }

  // Enregistrées : toute ligne reconnue sauf une vidéo introuvable. Une
  // vidéo privée est enregistrée mais jamais publiée (illisible pour un membre).
  const savable = (rows ?? []).filter((r) => r.id && r.status !== "introuvable");
  const privateCount = (rows ?? []).filter((r) => r.status === "privee").length;
  const unusableCount = (rows ?? []).filter((r) => r.status === "introuvable" || r.status === "invalide").length;

  async function handleSave() {
    if (savable.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await bulkAssignLessonVideos(
        section.id,
        savable.map((r) => ({
          lessonId: r.lesson.id,
          youtubeId: r.id as string,
          durationMin: r.durationSec ? secondsToLessonMinutes(r.durationSec) : null,
          playable: r.status !== "privee",
        })),
        publishNow
      );
      if (res.error) {
        setError(res.updated ? `${plural(res.updated, "vidéo")} enregistrée${res.updated > 1 ? "s" : ""}, mais : ${res.error}` : res.error);
        if (res.updated) onSaved();
        return;
      }
      runRef.current++;
      onSaved();
      onClose();
    } catch {
      setError("Connexion impossible, rien n'a été enregistré. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  const checkbox = (checked: boolean, onChange: (v: boolean) => void, label: string, disabled = false) => (
    <label
      style={{
        display: "flex", alignItems: "flex-start", gap: 8, fontSize: 11.5, color: "rgba(245,237,237,0.65)",
        cursor: disabled ? "default" : "pointer", lineHeight: 1.4, opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#E01E1E", marginTop: 2, flexShrink: 0 }}
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        margin: "0 12px 12px 28px",
        padding: "14px 14px 16px",
        borderRadius: 12,
        background: "linear-gradient(135deg, rgba(224,30,30,0.07) 0%, rgba(137,4,4,0.03) 100%)",
        border: "1px solid rgba(224,30,30,0.22)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <p className="ep-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6, color: "rgba(245,237,237,0.5)" }}>
          <ClipboardPaste size={12} style={{ color: "#E01E1E" }} /> Coller les vidéos de ce module
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{ display: "flex", background: "none", border: "none", cursor: "pointer", padding: 4 }}
        >
          <X size={14} style={{ color: "rgba(245,237,237,0.4)" }} />
        </button>
      </div>

      {!rows ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="ep-input"
            rows={6}
            placeholder={"Une URL YouTube par ligne, dans l'ordre des vidéos\nhttps://youtu.be/...\nhttps://www.youtube.com/watch?v=..."}
            aria-label="Une URL YouTube par ligne, dans l'ordre des vidéos"
            style={{ fontSize: 12, padding: "10px 12px", resize: "vertical", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
          />
          {checkbox(
            replaceExisting,
            setReplaceExisting,
            "Remplacer aussi les vidéos déjà renseignées (sinon, seules les leçons sans vidéo sont remplies, dans l'ordre)"
          )}
          <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)" }}>
            {targets.length === 0
              ? "Aucune leçon sans vidéo dans ce module."
              : `${plural(targets.length, "leçon")} à remplir dans ce module.`}
          </p>
          <button
            type="button"
            onClick={handlePreview}
            disabled={checking || !text.trim()}
            className="ep-btn-secondary"
            style={{ alignSelf: "flex-start", padding: "9px 16px", fontSize: 11 }}
          >
            {checking ? <><Loader2 size={13} className="animate-spin" /> Vérification…</> : "Prévisualiser"}
          </button>
        </>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rows.map((row, i) => {
              const st = STATUS_STYLE[row.status];
              return (
                <div
                  key={row.lesson.id}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(224,30,30,0.08)",
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(245,237,237,0.3)", flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#F5EDED", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {row.lesson.title}
                    </span>
                    {row.lesson.youtube_id && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#fb923c", flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Remplace
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                        color: st.color, background: st.bg, borderRadius: 20, padding: "2px 8px", flexShrink: 0,
                      }}
                    >
                      {st.label}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(245,237,237,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>
                      {row.title ?? row.raw}
                    </span>
                    {row.id && row.status !== "introuvable" && (
                      <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, fontWeight: 600, color: "rgba(245,237,237,0.45)", flexShrink: 0 }}>
                        <Clock size={10} />
                        {row.durationSec === undefined
                          ? <Loader2 size={10} className="animate-spin" aria-label="Détection de la durée" />
                          : row.durationSec === null ? "?" : formatSeconds(row.durationSec)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {extraLines > 0 && (
            <p style={{ margin: 0, fontSize: 11, color: "#fb923c", lineHeight: 1.5 }}>
              {plural(extraLines, "URL")} en trop ignorée{extraLines > 1 ? "s" : ""} : ce module n&apos;a que {plural(targets.length, "leçon")} à remplir. Ajoute des leçons ou coche Remplacer.
            </p>
          )}
          {privateCount > 0 && (
            <p style={{ margin: 0, fontSize: 11, color: "#fb923c", lineHeight: 1.5 }}>
              {privateCount > 1 ? `${privateCount} vidéos sont privées` : "1 vidéo est privée"} ou non intégrable : enregistrée{privateCount > 1 ? "s" : ""} mais jamais publiée{privateCount > 1 ? "s" : ""}. Passe-la en Non répertoriée sur YouTube pour qu&apos;un membre puisse la lire.
            </p>
          )}
          {unusableCount > 0 && (
            <p style={{ margin: 0, fontSize: 11, color: "#f87171", lineHeight: 1.5 }}>
              {unusableCount > 1 ? `${unusableCount} lignes ne seront pas enregistrées` : "1 ligne ne sera pas enregistrée"} (URL non reconnue ou vidéo introuvable) : la leçon correspondante reste vide.
            </p>
          )}
          {detecting && (
            <p style={{ margin: 0, fontSize: 11, color: "rgba(245,237,237,0.4)", lineHeight: 1.5 }}>
              Détection des durées en cours. Tu peux enregistrer maintenant : une durée non détectée garde sa valeur actuelle.
            </p>
          )}

          {checkbox(publishNow, setPublishNow, "Publier directement (les vidéos lisibles deviennent visibles si la formation est publiée)")}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || savable.length === 0}
              className="ep-btn-primary"
              style={{ padding: "10px 16px", fontSize: 11 }}
            >
              {saving ? <><Loader2 size={13} className="animate-spin" /> Enregistrement…</> : `Enregistrer ${plural(savable.length, "vidéo")}`}
            </button>
            <button
              type="button"
              onClick={backToEdit}
              disabled={saving}
              className="ep-btn-secondary"
              style={{ padding: "10px 16px", fontSize: 11 }}
            >
              Modifier la liste
            </button>
          </div>
        </>
      )}

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 11.5, color: "#f87171", lineHeight: 1.5 }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Recalculer les durées ───────────────────────────────────────────────────
// Les leçons qui ont déjà une vidéo gardent la durée de création (10 min) :
// détecte la vraie durée de chacune dans le navigateur puis l'enregistre en
// une fois. Une durée non détectée (bloqueur, vidéo privée) n'est jamais
// écrasée.
export function RecalcDurationsButton({
  lessons,
  onSaved,
}: {
  lessons: FormationLesson[];
  onSaved: () => void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Vidéos déjà mesurées pendant cette visite (clé leçon + vidéo). Une vidéo
  // qui dure vraiment 10 min garde duration_min = 10 après le recalcul :
  // sans ce suivi, elle restait candidate et le bouton ne disparaissait
  // jamais. Les durées non détectées n'y entrent pas, pour pouvoir réessayer.
  const [measured, setMeasured] = useState<Set<string>>(() => new Set());
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const measureKey = (l: FormationLesson) => `${l.id}:${l.youtube_id ?? ""}`;
  const candidates = lessons.filter((l) => l.youtube_id && l.duration_min === 10 && !measured.has(measureKey(l)));
  if (candidates.length === 0 && !message) return null;

  async function run() {
    setMessage(null);
    setProgress({ done: 0, total: candidates.length });
    const items: { lessonId: string; durationMin: number }[] = [];
    const measuredKeys: string[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const seconds = await getYoutubeDurationSeconds(candidates[i].youtube_id as string);
      if (!aliveRef.current) return;
      if (seconds) {
        items.push({ lessonId: candidates[i].id, durationMin: secondsToLessonMinutes(seconds) });
        measuredKeys.push(measureKey(candidates[i]));
      }
      setProgress({ done: i + 1, total: candidates.length });
    }

    if (items.length === 0) {
      setProgress(null);
      setMessage({ tone: "error", text: "Aucune durée détectée. Le lecteur YouTube est peut-être bloqué par un bloqueur de pub, ou les vidéos sont privées." });
      return;
    }
    try {
      const res = await bulkUpdateLessonDurations(items);
      if (!aliveRef.current) return;
      setProgress(null);
      if (res.error) {
        setMessage({ tone: "error", text: res.error });
      } else {
        setMeasured((prev) => new Set([...prev, ...measuredKeys]));
        const skipped = candidates.length - items.length;
        setMessage({
          tone: "ok",
          text: `${plural(res.updated ?? 0, "durée")} mise${(res.updated ?? 0) > 1 ? "s" : ""} à jour${skipped > 0 ? `, ${skipped} non détectée${skipped > 1 ? "s" : ""} (inchangée${skipped > 1 ? "s" : ""})` : ""}.`,
        });
      }
      if ((res.updated ?? 0) > 0) onSaved();
    } catch {
      if (!aliveRef.current) return;
      setProgress(null);
      setMessage({ tone: "error", text: "Connexion impossible, rien n'a été enregistré. Réessaie." });
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(224,30,30,0.08)" }}>
      {candidates.length > 0 && (
        <button
          type="button"
          onClick={run}
          disabled={progress !== null}
          className="ep-btn-secondary"
          style={{ alignSelf: "flex-start", padding: "8px 14px", fontSize: 11 }}
        >
          {progress
            ? <><Loader2 size={13} className="animate-spin" /> Détection {progress.done}/{progress.total}…</>
            : <><RefreshCw size={13} /> Recalculer les durées ({plural(candidates.length, "vidéo")})</>}
        </button>
      )}
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} style={{ margin: 0, fontSize: 11, lineHeight: 1.5, color: message.tone === "error" ? "#f87171" : "#4ade80" }}>
          {message.text}
        </p>
      )}
    </div>
  );
}
