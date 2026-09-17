"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Circle, Square, Download, RotateCcw, SwitchCamera, Type, RectangleVertical, RectangleHorizontal } from "lucide-react";
import { createPortal } from "react-dom";

// Prompteur (Studio créatif > Scripts, retour direct 2026-09-17 : "un
// bouton prompteur, ça doit défiler le texte à la vitesse que je veux, et
// aussi ça peut ne pas défiler, et ça doit ouvrir la caméra pour que je
// filme mes reels/vidéos ici, vraiment faut que ça fonctionne, que je
// puisse faire mon tournage ici"). Tout se passe côté navigateur (aucune
// route API, aucune donnée envoyée nulle part) : getUserMedia pour la
// caméra/micro, MediaRecorder pour enregistrer directement le tournage,
// défilement du texte piloté par requestAnimationFrame pour rester fluide
// à n'importe quelle vitesse.
//
// Repasse 2026-09-18 (retour direct : "je me vois pas, écran noir" +
// "l'enregistrement est en paysage") — deux bugs réels distincts :
// 1. Le <video> de prévisualisation n'était monté QUE quand `ready` était
//    déjà vrai, mais `videoRef.current.srcObject = stream` s'exécutait
//    AVANT le `setReady(true)` qui le montait : au moment de l'assignation
//    le <video> n'existait pas encore dans le DOM, `videoRef.current`
//    valait `null`, l'affectation ne faisait donc rien. Le flux existait
//    bien (l'enregistrement fonctionnait, lui lisant `streamRef.current`
//    directement) mais ne s'affichait jamais. Corrigé en montant le
//    <video> en permanence (visibilité gérée par opacité, pas par
//    montage/démontage) pour que la ref existe déjà quand le flux arrive.
// 2. `getUserMedia({ width: {ideal:1080}, height: {ideal:1920} })` n'est
//    qu'une PRÉFÉRENCE : beaucoup de caméras (webcam de PC, certains
//    téléphones selon l'orientation du capteur) renvoient quand même un
//    flux natif en paysage, que le <video> affiche correctement à l'écran
//    (rotation géré par les métadonnées d'affichage) mais que
//    MediaRecorder enregistre tel quel, sans cette rotation d'affichage —
//    d'où un fichier bien réel mais en paysage. Corrigé en ne enregistrant
//    plus jamais le flux caméra brut : chaque frame est dessinée sur un
//    <canvas> à la résolution EXACTE voulue (portrait 1080x1920 par
//    défaut, bascule paysage possible), recadrée en "cover" comme le
//    ferait CSS object-fit — le format de sortie ne dépend plus du tout
//    de ce que la caméra source décide de renvoyer.

const MIME_CANDIDATES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "video/mp4",
];

function pickSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return null;
}

function formatRecTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Teleprompter({
  title,
  content,
  onClose,
}: {
  title: string;
  content: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const textScrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Canvas hors-DOM où chaque frame caméra est redessinée à la résolution
  // exacte voulue avant d'être enregistrée — voir commentaire de tête sur
  // le bug "enregistrement en paysage".
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawRafRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [ready, setReady] = useState(false);

  const [scrolling, setScrolling] = useState(false);
  // px/seconde — repère : ~25 mots/ligne à taille par défaut défile en
  // douceur autour de 30-40, ajustable en direct pendant le tournage.
  const [speed, setSpeed] = useState(35);
  const [fontSize, setFontSize] = useState(28);

  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [mimeType] = useState(() => pickSupportedMimeType());
  // Incrémenté par le bouton "Réessayer" pour rejouer l'effet caméra sans
  // changer facingMode (sinon un simple setFacingMode((f) => f) ne change
  // pas la dépendance et l'effet ne se relance jamais).
  const [retryToken, setRetryToken] = useState(0);

  // ── Caméra ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function start() {
      // Reset dans la fonction async plutôt qu'au corps synchrone de
      // l'effet (react-hooks/set-state-in-effect) : le comportement est
      // identique, seul l'endroit d'où part le setState change.
      setCameraError(null);
      setReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // Le <video> est monté en permanence dans le JSX (visibilité gérée
        // par opacité, jamais par montage conditionnel) précisément pour
        // que cette ref existe déjà ici — voir le commentaire de tête sur
        // le bug "écran noir".
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        setCameraError(
          name === "NotAllowedError"
            ? "Autorise la caméra et le micro pour ton navigateur, puis réessaie."
            : name === "NotFoundError"
              ? "Aucune caméra détectée sur cet appareil."
              : "Impossible d'ouvrir la caméra."
        );
      }
    }
    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facingMode, retryToken]);

  // ── Défilement du texte (requestAnimationFrame, fluide à toute vitesse) ─
  useEffect(() => {
    if (!scrolling) {
      lastFrameRef.current = null;
      return;
    }
    function tick(now: number) {
      if (lastFrameRef.current != null && textScrollRef.current) {
        const dt = (now - lastFrameRef.current) / 1000;
        textScrollRef.current.scrollTop += speed * dt;
      }
      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [scrolling, speed]);

  // ── Enregistrement ────────────────────────────────────────────────────
  // Redessine chaque frame caméra sur le canvas hors-DOM, recadrée en
  // "cover" à la résolution cible — c'est ce canvas, jamais le flux caméra
  // brut, qui est enregistré. Le format de sortie ne dépend donc plus de
  // ce que la caméra source décide de renvoyer (voir bug "paysage").
  function drawFrame() {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && video && ctx && video.videoWidth > 0) {
      const targetW = canvas.width;
      const targetH = canvas.height;
      const targetRatio = targetW / targetH;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const srcRatio = vw / vh;
      let sx: number, sy: number, sw: number, sh: number;
      if (srcRatio > targetRatio) {
        sh = vh;
        sw = vh * targetRatio;
        sx = (vw - sw) / 2;
        sy = 0;
      } else {
        sw = vw;
        sh = vw / targetRatio;
        sx = 0;
        sy = (vh - sh) / 2;
      }
      ctx.save();
      if (facingMode === "user") {
        ctx.translate(targetW, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);
      ctx.restore();
    }
    drawRafRef.current = requestAnimationFrame(drawFrame);
  }

  function startRecording() {
    if (!streamRef.current || !videoRef.current) return;
    if (!mimeType) {
      setRecordError("Ton navigateur ne sait pas enregistrer de vidéo ici. Filme avec l'appli caméra de ton téléphone en gardant ce prompteur ouvert à côté.");
      return;
    }
    setRecordError(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    chunksRef.current = [];
    try {
      const canvas = document.createElement("canvas");
      canvas.width = orientation === "portrait" ? 1080 : 1920;
      canvas.height = orientation === "portrait" ? 1920 : 1080;
      canvasRef.current = canvas;
      drawRafRef.current = requestAnimationFrame(drawFrame);

      const canvasStream = canvas.captureStream(30);
      const audioTracks = streamRef.current.getAudioTracks();
      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

      const recorder = new MediaRecorder(combined, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        if (drawRafRef.current != null) cancelAnimationFrame(drawRafRef.current);
        drawRafRef.current = null;
        canvasRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedUrl(URL.createObjectURL(blob));
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      if (drawRafRef.current != null) cancelAnimationFrame(drawRafRef.current);
      drawRafRef.current = null;
      canvasRef.current = null;
      setRecordError("Échec au démarrage de l'enregistrement.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      if (drawRafRef.current != null) cancelAnimationFrame(drawRafRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch {}
      }
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    if (recording) stopRecording();
    onClose();
  }

  const fileExt = mimeType?.includes("mp4") ? "mp4" : "webm";

  const overlay = (
    <div className="fixed inset-0 z-[999] bg-black" style={{ touchAction: "none" }}>
      {/* Caméra en fond, plein écran — TOUJOURS montée (jamais démontée
          conditionnellement sur `ready`) : c'est exactement ce qui causait
          l'écran noir, voir le commentaire de tête du fichier. Seule
          l'opacité change tant que le flux n'est pas encore arrivé. */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover transition-opacity"
        style={{
          transform: facingMode === "user" ? "scaleX(-1)" : "none",
          opacity: ready && !cameraError ? 1 : 0,
        }}
      />

      {!ready && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#E01E1E] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
          <p className="text-sm text-[#F5EDED]/70">{cameraError}</p>
          <button
            type="button"
            onClick={() => setRetryToken((t) => t + 1)}
            className="text-xs font-bold text-[#E01E1E] underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Barre du haut */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer le prompteur"
          className="w-9 h-9 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white"
        >
          <X size={18} />
        </button>
        <p className="text-[11px] font-bold text-white/70 truncate max-w-[45%] text-center">
          {title}
        </p>
        <div className="flex items-center gap-2">
          {recording && (
            <span className="flex items-center gap-1.5 bg-red-600/90 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
              <Circle size={8} fill="white" /> {formatRecTime(recSeconds)}
            </span>
          )}
          {/* Format d'enregistrement — retour direct 2026-09-17 : "l'enregistrement
              est en paysage". Portrait par défaut (reels/stories), bascule
              possible pour une vidéo YouTube en paysage. Verrouillé pendant
              l'enregistrement (changer la taille du canvas en cours de prise
              n'aurait aucun sens). */}
          <button
            type="button"
            onClick={() => setOrientation((o) => (o === "portrait" ? "landscape" : "portrait"))}
            aria-label={orientation === "portrait" ? "Passer en paysage" : "Passer en portrait"}
            title={orientation === "portrait" ? "Portrait (reels) · clique pour paysage" : "Paysage (YouTube) · clique pour portrait"}
            disabled={recording}
            className="w-9 h-9 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white disabled:opacity-40"
          >
            {orientation === "portrait" ? <RectangleVertical size={15} /> : <RectangleHorizontal size={15} />}
          </button>
          <button
            type="button"
            onClick={() => setFacingMode((f) => (f === "user" ? "environment" : "user"))}
            aria-label="Changer de caméra"
            disabled={recording}
            className="w-9 h-9 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white disabled:opacity-40"
          >
            <SwitchCamera size={16} />
          </button>
        </div>
      </div>

      {/* Texte défilant, superposé à la caméra */}
      <div
        className="absolute left-0 right-0 z-10"
        style={{ top: "18%", bottom: "24%", padding: "0 20px" }}
      >
        <div
          ref={textScrollRef}
          className="h-full overflow-y-auto"
          style={{
            background: "rgba(0,0,0,0.45)",
            borderRadius: 16,
            padding: "24px 18px",
            scrollbarWidth: "none",
          }}
        >
          <p
            style={{
              fontSize,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {content}
          </p>
          {/* Espace en bas pour que la dernière ligne puisse remonter jusqu'au
              centre de lecture, pas juste jusqu'au bord bas du cadre. */}
          <div style={{ height: "50vh" }} />
        </div>
      </div>

      {/* Barre du bas — contrôles */}
      <div
        className="absolute bottom-0 left-0 right-0 z-10 px-4"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          paddingTop: 12,
          background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
        }}
      >
        {recordError && (
          <p className="text-[11px] text-amber-300 text-center mb-2">{recordError}</p>
        )}

        {recordedUrl ? (
          <div className="flex items-center gap-2 mb-3">
            <a
              href={recordedUrl}
              download={`${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "tournage"}.${fileExt}`}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#E01E1E] text-white text-xs font-black uppercase tracking-wide py-2.5 rounded-xl"
            >
              <Download size={14} /> Enregistrer la vidéo
            </a>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(recordedUrl);
                setRecordedUrl(null);
              }}
              aria-label="Refaire une prise"
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl bg-white/10 border border-white/15 text-white"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        ) : (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={!ready}
              className="w-16 h-16 rounded-full flex items-center justify-center disabled:opacity-40"
              style={{
                background: recording ? "#fff" : "rgba(224,30,30,0.9)",
                border: "3px solid rgba(255,255,255,0.85)",
              }}
              aria-label={recording ? "Arrêter l'enregistrement" : "Démarrer l'enregistrement"}
            >
              {recording ? <Square size={22} className="text-[#E01E1E]" fill="currentColor" /> : <Circle size={26} className="text-white" fill="currentColor" />}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setScrolling((v) => !v)}
            className="flex items-center gap-1.5 bg-white/10 border border-white/15 text-white text-[11px] font-bold px-3 py-2 rounded-lg flex-shrink-0"
          >
            {scrolling ? <Pause size={13} /> : <Play size={13} />}
            {scrolling ? "Pause" : "Défiler"}
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-white/40 flex-shrink-0">Vitesse</span>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              aria-label="Vitesse de défilement"
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Type size={13} className="text-white/40 flex-shrink-0" />
          <input
            type="range"
            min={16}
            max={44}
            step={2}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            aria-label="Taille du texte"
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => textScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-[10px] font-bold text-white/50 uppercase flex-shrink-0"
          >
            ↑ Début
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
