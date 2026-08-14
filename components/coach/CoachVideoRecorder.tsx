"use client";

import { useEffect, useRef, useState } from "react";
import { Video, Monitor, Upload, Circle, Square, Send, RotateCcw, X, Loader2 } from "lucide-react";

type Source = "webcam" | "screen";
type Phase = "pick" | "preview" | "recording" | "review";

// Enregistrement vidéo type Loom, simple : webcam OU partage d'écran (pas de
// composition des deux — hors scope, "reste simple" était explicite), un
// enregistrement, une lecture, un envoi. Pas de montage.
export default function CoachVideoRecorder({
  onSend,
  triggerLabel = "Vidéo",
  triggerClassName,
}: {
  onSend: (blob: Blob) => Promise<void>;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("pick");
  const [elapsed, setElapsed] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  useEffect(() => {
    return () => {
      cleanupStream();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reset() {
    cleanupStream();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setRecordedBlob(null);
    setElapsed(0);
    setError(null);
    setPhase("pick");
  }

  function close() {
    reset();
    setOpen(false);
  }

  async function pickSource(source: Source) {
    setError(null);
    try {
      const stream =
        source === "webcam"
          ? await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      setPhase("preview");
      // Le <video> n'est monté qu'une fois phase === "preview" — attacher le
      // stream après le prochain rendu.
      setTimeout(() => {
        if (liveVideoRef.current) liveVideoRef.current.srcObject = stream;
      }, 0);
      // L'utilisateur peut arrêter le partage d'écran depuis la barre du
      // navigateur — sans ça, l'enregistrement continuerait sur une piste morte.
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      });
    } catch {
      setError(
        source === "webcam"
          ? "Impossible d'accéder à la caméra/micro."
          : "Partage d'écran annulé ou indisponible."
      );
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      cleanupStream();
      setRecordedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("review");
    };

    recorder.start(250);
    setPhase("recording");
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopRecording() {
    recorderRef.current?.stop();
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  function handleFilePicked(file: File) {
    setError(null);
    setRecordedBlob(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("review");
  }

  async function handleSend() {
    if (!recordedBlob) return;
    setSending(true);
    setError(null);
    try {
      await onSend(recordedBlob);
      close();
    } catch {
      setError("Échec de l'envoi, réessaie.");
    }
    setSending(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={triggerClassName ?? "inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg border border-[#890404]/30 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 hover:border-[#890404]/50 transition-colors"}
      >
        <Video size={13} />
        {triggerLabel}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="ep-modal-overlay absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={sending ? undefined : close} />
      <div className="ep-modal-panel relative w-full max-w-lg bg-[#150000] border border-[#890404]/40 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-widest text-white">Retour vidéo</p>
          <button onClick={close} disabled={sending} aria-label="Fermer" className="p-1 text-[#F5EDED]/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {phase === "pick" && (
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => pickSource("webcam")}
              className="flex flex-col items-center gap-2 py-6 rounded-xl border border-[#890404]/30 hover:border-[#E01E1E]/50 hover:bg-[#E01E1E]/5 text-[#F5EDED]/60 transition-colors"
            >
              <Video size={22} />
              <span className="text-xs font-bold uppercase tracking-wider">Webcam</span>
            </button>
            <button
              onClick={() => pickSource("screen")}
              className="flex flex-col items-center gap-2 py-6 rounded-xl border border-[#890404]/30 hover:border-[#E01E1E]/50 hover:bg-[#E01E1E]/5 text-[#F5EDED]/60 transition-colors"
            >
              <Monitor size={22} />
              <span className="text-xs font-bold uppercase tracking-wider">Partage d&apos;écran</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 py-6 rounded-xl border border-[#890404]/30 hover:border-[#E01E1E]/50 hover:bg-[#E01E1E]/5 text-[#F5EDED]/60 transition-colors"
            >
              <Upload size={22} />
              <span className="text-xs font-bold uppercase tracking-wider">Importer</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFilePicked(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {(phase === "preview" || phase === "recording") && (
          <div className="space-y-3">
            <video
              ref={liveVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full aspect-video rounded-xl bg-black object-contain"
            />
            {phase === "recording" && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-sm font-black">
                <Circle size={10} className="fill-red-500 animate-pulse" />
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
              </div>
            )}
            <button
              onClick={phase === "recording" ? stopRecording : startRecording}
              className={`w-full py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-colors ${
                phase === "recording"
                  ? "bg-[#1f0101] border border-red-500/40 text-red-400"
                  : "bg-[#E01E1E] hover:bg-[#B00202] text-white"
              }`}
            >
              {phase === "recording" ? (
                <span className="inline-flex items-center gap-2 justify-center"><Square size={13} /> Arrêter</span>
              ) : (
                <span className="inline-flex items-center gap-2 justify-center"><Circle size={13} /> Démarrer l&apos;enregistrement</span>
              )}
            </button>
          </div>
        )}

        {phase === "review" && previewUrl && (
          <div className="space-y-3">
            <video src={previewUrl} controls playsInline className="w-full aspect-video rounded-xl bg-black" />
            <div className="flex gap-2">
              <button
                onClick={reset}
                disabled={sending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl border border-[#890404]/30 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <RotateCcw size={13} /> Recommencer
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {sending ? "Envoi…" : "Envoyer"}
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      </div>
    </div>
  );
}
