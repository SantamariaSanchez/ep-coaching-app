"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Circle, Square, Download, RotateCcw, SwitchCamera, Type } from "lucide-react";
import { createPortal } from "react-dom";

// Prompteur (Studio créatif > Scripts, retour direct 2026-09-17 : "un
// bouton prompteur, ça doit défiler le texte à la vitesse que je veux, et
// aussi ça peut ne pas défiler, et ça doit ouvrir la caméra pour que je
// filme mes reels/vidéos ici, vraiment faut que ça fonctionne, que je
// puisse faire mon tournage ici"). Tout se passe côté navigateur (aucune
// route API, aucune donnée envoyée nulle part) : getUserMedia pour la
// caméra/micro, MediaRecorder pour enregistrer, défilement du texte piloté
// par requestAnimationFrame pour rester fluide à n'importe quelle vitesse.
//
// Repasse 2026-09-18, plusieurs allers-retours réels sur téléphone :
// 1. Écran noir : le <video> n'était monté QUE quand `ready` était déjà
//    vrai, mais `srcObject` était assigné AVANT ce `setReady(true)` — la
//    ref valait encore `null`. Corrigé : <video> monté en permanence,
//    visibilité gérée par opacité.
// 2. Trop zoomé : `object-cover` rognait l'image pour remplir l'écran.
//    Corrigé : `object-contain`, image entière jamais rognée.
// 3. Format vidéo illisible en galerie : le webm était tenté en premier
//    (Chrome Android l'enregistre très bien) mais l'appli Galerie native
//    de la plupart des téléphones ne sait pas LIRE un .webm. Corrigé :
//    mp4 tenté en premier.
// 4. "Toujours en paysage" + "pas fluide" : la V1 de ce correctif
//    redessinait chaque frame caméra sur un <canvas> caché pour FORCER une
//    résolution portrait exacte avant l'enregistrement (`canvas.
//    captureStream()` + `MediaRecorder`). Deux problèmes réels avec cette
//    approche, pas un seul :
//    - Performance : redessiner 30 fois/seconde sur un canvas en plus
//      d'afficher la caméra ET de faire défiler le texte surchargeait le
//      rendu sur téléphone, d'où le manque de fluidité constaté.
//    - Fiabilité : bug Chrome documenté (crbug 897727) — MediaRecorder +
//      canvas.captureStream() sur Android se comporte de façon incorrecte
//      pour certaines résolutions de canvas, l'encodeur matériel retombant
//      sur son format préféré (paysage) au lieu de respecter la résolution
//      demandée.
//    Solution retenue : ARRÊTER de passer par un canvas. On enregistre
//    directement le flux caméra brut (`streamRef.current`) avec
//    MediaRecorder, exactement le chemin standard, le plus testé et le
//    plus efficace du web pour ça — c'est aussi ce qu'une appli caméra
//    native ferait en interne. Ça résout la fluidité (plus de redessin en
//    double) ET l'orientation la plupart du temps (le chemin
//    d'enregistrement direct n'a pas le bug canvas ci-dessus), sans
//    garantie à 100% sur des appareils très anciens/atypiques — d'où la
//    vérification honnête après coup (checkRecordedOrientation) plutôt
//    que de prétendre que c'est toujours parfait.
//
// Note sur "mets l'appareil photo natif du téléphone avec le prompteur en
// extension par-dessus" : c'est un vrai bon réflexe (un vrai prompteur
// pro fonctionne comme ça), mais littéralement impossible depuis une page
// web — aucune techno web ne permet à un site d'afficher du contenu
// par-dessus une AUTRE application (appli Caméra native comprise), c'est
// bloqué par le système (iOS et Android) pour des raisons de sécurité,
// pas un manque d'effort. La meilleure approche possible depuis le web
// est celle ci-dessus : utiliser la caméra du téléphone directement DANS
// cette page (comme le fait une appli native en interne), avec le texte
// affiché par-dessus dans la même page, et un enregistrement le plus
// proche possible du chemin natif (flux brut, sans étape de retraitement
// superflue) pour rester fluide.

// mp4 tenté en premier (lisible par la Galerie native, voir point 3
// ci-dessus), webm en repli pour les navigateurs qui ne savent
// enregistrer que ça (Firefox notamment).
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
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
  // Gardé à côté de recordedUrl (qui n'est qu'un object URL) pour pouvoir
  // reconstruire un vrai fichier à partager, voir handleSaveVideo.
  const recordedBlobRef = useRef<Blob | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
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
  const [saveError, setSaveError] = useState<string | null>(null);
  // Purement informatif désormais (plus de canvas à "corriger") : si le
  // fichier sort quand même en paysage sur un appareil atypique, mieux
  // vaut le dire honnêtement que prétendre que c'est toujours garanti.
  const [orientationNote, setOrientationNote] = useState<string | null>(null);
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

  // Vérifie les VRAIES dimensions du fichier produit (en le chargeant dans
  // une balise <video> détachée) — purement informatif : sans canvas à
  // ajuster, il n'y a plus rien à "corriger" ici, juste à signaler
  // honnêtement si un appareil atypique sort quand même un fichier en
  // paysage plutôt que de prétendre que c'est toujours garanti.
  function checkRecordedOrientation(url: string) {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;
    probe.onloadedmetadata = () => {
      if (probe.videoWidth > 0 && probe.videoWidth > probe.videoHeight) {
        setOrientationNote(
          `Cette prise est sortie en paysage (${probe.videoWidth}×${probe.videoHeight}). Vérifie que ton téléphone est bien tenu à la verticale au moment de filmer.`
        );
      } else {
        setOrientationNote(null);
      }
    };
  }

  // ── Enregistrement ────────────────────────────────────────────────────
  // Enregistre directement le flux caméra brut (streamRef.current), sans
  // aucune étape de retraitement (canvas, redimensionnement) — voir le
  // commentaire de tête sur pourquoi un canvas intermédiaire causait à la
  // fois le manque de fluidité et le bug d'orientation. C'est le chemin le
  // plus léger et le plus fiable que permet le web pour ça.
  function startRecording() {
    if (!streamRef.current) return;
    if (!mimeType) {
      setRecordError("Ton navigateur ne sait pas enregistrer de vidéo ici. Filme avec l'appli caméra de ton téléphone en gardant ce prompteur ouvert à côté.");
      return;
    }
    setRecordError(null);
    setOrientationNote(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
      setRecordedUrl(null);
    }
    chunksRef.current = [];
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        // Filet de sécurité : une capture ratée (flux coupé en cours de
        // route) produit un blob quasi vide plutôt qu'une erreur — sans ce
        // contrôle, le fichier "réussi" présenté à l'enregistrement est en
        // réalité illisible. Mieux vaut le dire tout de suite que laisser
        // découvrir un fichier corrompu dans la galerie ensuite.
        if (blob.size < 10_000) {
          setRecordError("L'enregistrement a échoué (fichier vide). Réessaie une nouvelle prise.");
          return;
        }
        recordedBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        checkRecordedOrientation(url);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setRecSeconds(0);
      recTimerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
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

  // Retour direct 2026-09-18 ("fais attention que ça s'enregistre bien
  // dans ma galerie, aucun bug") : un <a download> sur un blob: URL ouvre
  // souvent juste la vidéo dans un lecteur sur mobile (surtout iOS
  // Safari) au lieu de l'enregistrer réellement dans la pellicule/galerie
  // — aucune vraie intégration "Enregistrer dans Photos" par ce chemin.
  // Web Share API (fichiers) ouvre la feuille de partage native, qui
  // propose "Enregistrer la vidéo"/"Enregistrer dans Photos" de façon
  // fiable sur iOS ET Android. Utilisé en priorité, avec un repli sur le
  // téléchargement classique (desktop, ou navigateur sans support fichiers).
  async function handleSaveVideo() {
    setSaveError(null);
    const blob = recordedBlobRef.current;
    const filename = `${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "tournage"}.${fileExt}`;

    if (blob && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: mimeType ?? blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (err) {
        // AbortError = la personne a fermé la feuille de partage elle-même,
        // jamais une vraie erreur à signaler.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Repli : téléchargement classique (a[download] déclenché par script
    // plutôt qu'un <a> visible, même résultat, un seul chemin à tester).
    if (!recordedUrl) {
      setSaveError("Rien à enregistrer.");
      return;
    }
    const a = document.createElement("a");
    a.href = recordedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
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
          conditionnellement sur `ready`), object-contain (jamais cover)
          pour ne jamais rogner/zoomer l'image. C'est exactement CE flux,
          sans aucun retraitement, qui est enregistré (voir handleSaveVideo
          et le commentaire de tête). */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-contain transition-opacity"
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

      {/* Texte défilant, superposé à la caméra — bande étroite en haut de
          l'écran (22% de la hauteur), pour laisser voir beaucoup plus la
          caméra. Le texte défile UNIQUEMENT dans cette bande
          (overflow-y-auto), jamais toute la page. */}
      <div
        className="absolute left-0 right-0 z-10"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 64px)", height: "22vh", padding: "0 20px" }}
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
        {saveError && (
          <p className="text-[11px] text-amber-300 text-center mb-2">{saveError}</p>
        )}
        {orientationNote && (
          <p className="text-[11px] text-amber-300 text-center mb-2">{orientationNote}</p>
        )}

        {recordedUrl ? (
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={handleSaveVideo}
              className="flex-1 flex items-center justify-center gap-1.5 bg-[#E01E1E] text-white text-xs font-black uppercase tracking-wide py-2.5 rounded-xl"
            >
              <Download size={14} /> Enregistrer la vidéo
            </button>
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(recordedUrl);
                recordedBlobRef.current = null;
                setRecordedUrl(null);
                setSaveError(null);
                setOrientationNote(null);
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
