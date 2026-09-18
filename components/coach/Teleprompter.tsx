"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Circle, Square, RotateCcw, SwitchCamera, Type } from "lucide-react";
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
//    vérification honnête après coup (checkRecordedFrame) plutôt
//    que de prétendre que c'est toujours parfait.
//
// Repasse 2026-09-18 (bis), retour direct après le correctif précédent :
// "ya toujours tes bande noir, ARRÊTE DE LIVRER ALORS QUE C PAS FINI". Le
// correctif précédent (`resizeMode: "crop-and-scale"`) n'a rien changé —
// et pour cause : `resizeMode` n'a jamais été un constraint standardisé
// (retiré très tôt des specs Media Capture, jamais réellement implémenté
// dans Chrome mobile), donc il était simplement IGNORÉ silencieusement,
// pas "essayé et raté". Deux changements réels cette fois, pas un ajustement
// de plus à l'aveugle :
// 1. Négociation : demander `aspectRatio: 9/16` SANS imposer de width/height
//    précis force le sélecteur de contraintes du navigateur à choisir un
//    mode natif dont le RATIO est déjà portrait, au lieu de lui demander une
//    résolution portrait précise qu'il satisfait en gardant le capteur en
//    paysage et en AJOUTANT des bandes (ce qui produit exactement le
//    symptôme décrit). Après l'obtention du flux, on relit les vraies
//    dimensions accordées (`track.getSettings()`) ; si elles sortent quand
//    même en paysage, on retente explicitement avec `applyConstraints`
//    (exact cette fois, pas ideal) plutôt que de supposer que la première
//    tentative a suffi.
// 2. Vérification : `checkRecordedFrame` ne se contente plus de lire la
//    largeur/hauteur déclarées du fichier (un fichier peut être "portrait"
//    en dimensions ET avoir des bandes noires DEDANS, ce qui est exactement
//    le rapport reçu). Elle échantillonne un vrai pixel de la vidéo
//    enregistrée (canvas hors-écran, une seule fois, pas de captureStream)
//    et compare la luminosité des bandes haut/bas à celle du centre — si le
//    haut/bas est quasi noir alors que le centre ne l'est pas, ce n'est pas
//    déclaré "réussi", la prise est refusée avec un vrai bouton "Recommencer"
//    au lieu d'avancer sur un enregistrement cassé.
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
  queueProgress,
  onClose,
  onFinishedTake,
}: {
  title: string;
  content: string;
  /** Tournage automatique (Studio créatif) : position dans la file, ex. "3/12". */
  queueProgress?: { index: number; total: number };
  onClose: () => void;
  /** Retour direct 2026-09-18 : "faut toujours toujours enregistrer donc
   * enlève le bouton" + "quand j'ai fini une vidéo ça doit m'enchaîner sur
   * la prochaine automatiquement" — appelé une fois la prise sauvegardée
   * (ou la tentative de sauvegarde terminée), jamais sur un clic explicite. */
  onFinishedTake?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const textScrollRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  // Gardé à côté de recordedUrl (qui n'est qu'un object URL) pour pouvoir
  // reconstruire un vrai fichier à partager, voir saveVideoBlob.
  const recordedBlobRef = useRef<Blob | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [ready, setReady] = useState(false);
  // Diagnostic discret (petit texte, voir barre du bas) : la résolution
  // réellement accordée par le navigateur, pour savoir tout de suite si une
  // future prise repart encore en paysage plutôt que de le déduire après coup.
  const [trackInfo, setTrackInfo] = useState<string | null>(null);

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
  // Retour direct 2026-09-18 : plus de bouton "Enregistrer" ni "Refaire" —
  // dès l'arrêt de l'enregistrement, sauvegarde automatique puis passage
  // au script suivant. Cet état pilote l'affichage transitoire entre les
  // deux (spinner + message) au lieu du gros bouton d'enregistrement.
  const [advancing, setAdvancing] = useState(false);
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
        // Voir le commentaire de tête (repasse 2026-09-18 bis) : aspectRatio
        // seul, sans width/height imposés, pour laisser le navigateur choisir
        // un mode natif déjà portrait plutôt que de forcer une résolution
        // précise qu'il satisferait en gardant le capteur en paysage.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, aspectRatio: { ideal: 9 / 16 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const track = stream.getVideoTracks()[0];
        if (track) {
          const settings = track.getSettings();
          const w = settings.width ?? 0;
          const h = settings.height ?? 0;
          // Le mode accordé est quand même en paysage (ou carré) malgré la
          // contrainte aspectRatio — deuxième tentative EXPLICITE (exact,
          // pas ideal) avant d'accepter le flux tel quel.
          if (w > 0 && h > 0 && w >= h) {
            try {
              await track.applyConstraints({
                aspectRatio: { exact: 9 / 16 },
              } as MediaTrackConstraints);
            } catch {
              try {
                await track.applyConstraints({
                  width: { exact: 720 },
                  height: { exact: 1280 },
                } as MediaTrackConstraints);
              } catch {
                // Aucune des deux tentatives n'est acceptée par ce
                // téléphone/navigateur — le flux brut reste tel quel, mais
                // checkRecordedFrame le signalera honnêtement après coup
                // plutôt que de prétendre que c'est réglé.
              }
            }
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (track) {
          const s = track.getSettings();
          setTrackInfo(s.width && s.height ? `${s.width}×${s.height}` : null);
        }
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

  // Vérifie le VRAI fichier produit, pas seulement ses dimensions déclarées
  // — voir le commentaire de tête (repasse 2026-09-18 bis) : un fichier peut
  // être "portrait" en largeur/hauteur ET avoir des bandes noires dedans,
  // ce qui est exactement ce qui a été signalé après le correctif précédent.
  // Charge le blob dans une <video> détachée, va chercher une frame au
  // milieu, la dessine sur un petit canvas hors-écran (une fois, jamais en
  // flux continu — donc pas concerné par le bug canvas.captureStream() +
  // MediaRecorder qui avait fait abandonner le pipeline canvas), et compare
  // la luminosité des bandes haut/bas à celle du centre.
  function checkRecordedFrame(url: string): Promise<{ width: number; height: number; letterboxed: boolean }> {
    return new Promise((resolve) => {
      const probe = document.createElement("video");
      probe.preload = "metadata";
      probe.muted = true;
      probe.playsInline = true;
      probe.src = url;
      let settled = false;
      const finish = (result: { width: number; height: number; letterboxed: boolean }) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      // Filet de sécurité : si la vidéo ne charge/ne seek jamais (fichier
      // corrompu, navigateur atypique), ne jamais bloquer indéfiniment
      // l'enchaînement automatique dessus.
      const timeout = setTimeout(() => finish({ width: probe.videoWidth, height: probe.videoHeight, letterboxed: false }), 4000);
      probe.onloadedmetadata = () => {
        try {
          probe.currentTime = Math.min(0.4, (probe.duration || 0.8) / 2) || 0.1;
        } catch {
          finish({ width: probe.videoWidth, height: probe.videoHeight, letterboxed: false });
        }
      };
      probe.onseeked = () => {
        clearTimeout(timeout);
        const vw = probe.videoWidth;
        const vh = probe.videoHeight;
        if (!vw || !vh) {
          finish({ width: vw, height: vh, letterboxed: false });
          return;
        }
        try {
          const canvas = document.createElement("canvas");
          const sw = 80;
          const sh = Math.max(1, Math.round((sw * vh) / vw));
          canvas.width = sw;
          canvas.height = sh;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            finish({ width: vw, height: vh, letterboxed: false });
            return;
          }
          ctx.drawImage(probe, 0, 0, sw, sh);
          const bandH = Math.max(2, Math.round(sh * 0.08));
          const avgLuma = (y0: number, y1: number) => {
            const { data } = ctx.getImageData(0, y0, sw, Math.max(1, y1 - y0));
            let sum = 0;
            let n = 0;
            for (let i = 0; i < data.length; i += 4) {
              sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              n++;
            }
            return n ? sum / n : 0;
          };
          const top = avgLuma(0, bandH);
          const bottom = avgLuma(sh - bandH, sh);
          const middle = avgLuma(Math.round(sh * 0.4), Math.round(sh * 0.6));
          const letterboxed = top < 18 && bottom < 18 && middle > top + 15 && middle > bottom + 15;
          finish({ width: vw, height: vh, letterboxed });
        } catch {
          finish({ width: vw, height: vh, letterboxed: false });
        }
      };
      probe.onerror = () => finish({ width: 0, height: 0, letterboxed: false });
    });
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
        // découvrir un fichier corrompu dans la galerie ensuite. Dans ce
        // cas précis, PAS d'enchaînement automatique : mieux vaut laisser
        // refaire cette prise plutôt qu'avancer sur un échec.
        if (blob.size < 10_000) {
          setRecordError("L'enregistrement a échoué (fichier vide). Réessaie une nouvelle prise.");
          return;
        }
        recordedBlobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        // Retour direct 2026-09-18 : "faut toujours toujours enregistrer
        // donc enlève le bouton" + "ça doit m'enchaîner sur la prochaine
        // automatiquement" — MAIS ("ARRÊTE DE LIVRER ALORS QUE C PAS FINI")
        // seulement si la prise est vraiment bonne. checkRecordedFrame
        // vérifie le vrai contenu du fichier ; si paysage ou bandes noires
        // détectées, PAS d'enchaînement automatique — la personne doit
        // pouvoir recommencer cette prise plutôt qu'avancer sur un
        // enregistrement cassé sans le savoir.
        void (async () => {
          setAdvancing(true);
          const probe = await checkRecordedFrame(url);
          const isLandscape = probe.width > 0 && probe.width >= probe.height;
          if (isLandscape || probe.letterboxed) {
            setAdvancing(false);
            setOrientationNote(
              isLandscape
                ? `Cette prise est sortie en paysage (${probe.width}×${probe.height}). Tiens le téléphone à la verticale et recommence cette prise.`
                : "Bandes noires détectées sur cette prise (l'image ne remplit pas tout le cadre). Recommence cette prise."
            );
            return;
          }
          setOrientationNote(null);
          await saveVideoBlob(blob, url);
          setAdvancing(false);
          onFinishedTake?.();
        })();
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setScrolling(true);
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
    setScrolling(false);
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
  // Prend le blob/l'url en paramètres explicites (jamais via l'état React)
  // : appelée depuis `onstop` juste après les avoir construits, où l'état
  // React correspondant n'a pas encore été re-rendu (fermeture obsolète).
  async function saveVideoBlob(blob: Blob, url: string) {
    setSaveError(null);
    const filename = `${title.replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "tournage"}.${fileExt}`;

    if (typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
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
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Bouton "Recommencer cette prise" (paysage ou bandes noires détectées) —
  // remet à zéro pour retenter un enregistrement du même script.
  function resetTake() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    recordedBlobRef.current = null;
    setRecordedUrl(null);
    setOrientationNote(null);
    setSaveError(null);
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
          sans aucun retraitement, qui est enregistré (voir saveVideoBlob
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
          {queueProgress ? `${queueProgress.index}/${queueProgress.total} · ${title}` : title}
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

        {/* Retour direct 2026-09-18 : plus de bouton "Enregistrer" — la
            sauvegarde est toujours automatique dès l'arrêt (voir onstop).
            Trois états possibles ici : en train de vérifier/sauvegarder
            (spinner), prise refusée (paysage/bandes noires détectées, bouton
            "Recommencer"), ou prête à filmer (bouton rond classique). */}
        {advancing ? (
          <div className="flex justify-center items-center gap-2 mb-3 py-3">
            <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            <span className="text-xs font-bold text-white/70 uppercase tracking-wide">
              Vérification et enregistrement…
            </span>
          </div>
        ) : orientationNote ? (
          <div className="flex justify-center mb-3">
            <button
              type="button"
              onClick={resetTake}
              className="flex items-center gap-1.5 bg-[#E01E1E] text-white text-xs font-black uppercase tracking-wide px-4 py-2.5 rounded-xl"
            >
              <RotateCcw size={14} /> Recommencer cette prise
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
        {trackInfo && (
          <p className="text-[9px] text-white/25 text-center mt-2">{trackInfo}</p>
        )}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.body);
}
