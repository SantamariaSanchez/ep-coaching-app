"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Send, RotateCcw, Trash2, Loader2 } from "lucide-react";

type Phase = "idle" | "recording" | "review" | "sending";

const MAX_SECONDS = 5 * 60;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  // Safari (iPhone, Mac) n'enregistre qu'en mp4, Chrome et Firefox en webm.
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported?.(type)) return type;
  }
  return undefined;
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Message vocal du coach : on appuie, on parle, on réécoute, on envoie.
// Pensé pour le retour de check-in (comme sur WhatsApp), 5 minutes maximum.
export default function VoiceNoteRecorder({ onSend }: { onSend: (blob: Blob) => Promise<void> }) {
  const t = useT();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError(t("L'enregistrement vocal n'est pas disponible sur cet appareil."));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        const recorded = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        if (recorded.size === 0) {
          setPhase("idle");
          setError(t("Rien n'a été enregistré, réessaie."));
          return;
        }
        setBlob(recorded);
        setPreviewUrl(URL.createObjectURL(recorded));
        setPhase("review");
      };
      recorderRef.current = recorder;
      recorder.start(1000);
      startedAtRef.current = Date.now();
      setElapsed(0);
      setPhase("recording");
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(s);
        if (s >= MAX_SECONDS && recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 250);
    } catch {
      stopStream();
      setError(t("Micro refusé : autorise le micro pour ce site dans ton navigateur."));
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setElapsed(0);
    setPhase("idle");
  }

  async function send() {
    if (!blob) return;
    setPhase("sending");
    setError(null);
    try {
      await onSend(blob);
      discard();
    } catch {
      setPhase("review");
      setError(t("L'envoi du vocal a échoué, réessaie."));
    }
  }

  const pill: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    minHeight: 40, padding: "0 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {phase === "idle" && (
        <button
          type="button"
          onClick={start}
          style={{ ...pill, border: "1px solid rgba(var(--ep-accent-rgb),0.45)", background: "rgba(var(--ep-accent-rgb),0.1)", color: "var(--ep-ink)" }}
        >
          <Mic size={14} /> {t("Message vocal")}
        </button>
      )}

      {phase === "recording" && (
        <button
          type="button"
          onClick={stop}
          aria-label={t("Arrêter l'enregistrement")}
          style={{ ...pill, border: "none", background: "var(--ep-accent)", color: "var(--ep-strong)" }}
        >
          <span aria-hidden className="animate-pulse" style={{ width: 8, height: 8, borderRadius: 999, background: "currentColor" }} />
          {formatDuration(elapsed)} <Square size={13} /> {t("Arrêter")}
        </button>
      )}

      {(phase === "review" || phase === "sending") && previewUrl && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <audio src={previewUrl} controls preload="metadata" style={{ width: "100%", maxWidth: 320 }} />
          <button
            type="button"
            onClick={send}
            disabled={phase === "sending"}
            style={{ ...pill, border: "none", background: "var(--ep-accent)", color: "var(--ep-strong)", opacity: phase === "sending" ? 0.7 : 1 }}
          >
            {phase === "sending" ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {phase === "sending" ? t("Envoi…") : t("Joindre le vocal")}
          </button>
          <button
            type="button"
            onClick={() => { discard(); void start(); }}
            disabled={phase === "sending"}
            style={{ ...pill, border: "1px solid rgba(var(--ep-line-rgb),0.4)", background: "transparent", color: "rgba(var(--ep-ink-rgb),0.75)" }}
          >
            <RotateCcw size={13} /> {t("Refaire")}
          </button>
          <button
            type="button"
            onClick={discard}
            disabled={phase === "sending"}
            aria-label={t("Supprimer le vocal")}
            style={{ ...pill, padding: 0, width: 40, border: "1px solid rgba(var(--ep-line-rgb),0.4)", background: "transparent", color: "rgba(var(--ep-ink-rgb),0.6)" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}

      {error && <span style={{ fontSize: 11, color: "var(--ep-pink)" }}>{error}</span>}
    </div>
  );
}
