"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { todayInParis } from "@/lib/dates";

// ─────────────────────────────────────────────────────────────────────────
// Podomètre "logiciel" — il n'existe aucune API web qui donne directement le
// nombre de pas (contrairement à CMPedometer sur iOS natif ou Google Fit sur
// Android natif) : le seul capteur exposé aux pages web est l'accéléromètre
// brut (DeviceMotionEvent). On détecte donc les pas nous-mêmes, en isolant
// la composante dynamique de l'accélération (la marche) de la gravité via un
// filtre passe-bas, puis en comptant un pas à chaque pic au-dessus d'un seuil,
// avec une période réfractaire pour ne jamais compter deux fois le même appui.
// C'est l'algorithme standard des podomètres logiciels.
//
// Limite honnête à connaître : ça ne tourne QUE pendant que cette page est
// ouverte et affichée à l'écran (les navigateurs mobiles coupent les capteurs
// dès que l'onglet passe en arrière-plan). Ce n'est pas un vrai suivi 24/7
// façon montre connectée — impossible à obtenir depuis une appli web sans
// passer par une app native. Voir la connexion Oura Ring pour un suivi
// vraiment continu.
// ─────────────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "ep-pedometer-";
export const PEDOMETER_ENABLED_KEY = "ep-pedometer-enabled";

// MASTERCLASS.md Axe L : UTC, pas Paris. Entre minuit et 1h/2h du matin
// heure de Paris (selon été/hiver), la date UTC n'a pas encore basculé —
// cette clé restait donc celle d'HIER, et readLocalSeed() réamorçait le
// compteur en session avec le total de pas déjà fait la veille au lieu de
// repartir de zéro pour le jour qui vient de commencer. Concret : ouvrir
// Steps juste après minuit pouvait faire logger d'un coup plusieurs
// milliers de "pas" du jour, avant le moindre pas réellement fait.
function todayStorageKey(): string {
  return STORAGE_PREFIX + todayInParis();
}

function readLocalSeed(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(todayStorageKey());
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export type PedometerStatus = "idle" | "active" | "paused" | "denied" | "unsupported";

const LOW_PASS_ALPHA = 0.85; // filtre passe-bas qui suit la gravité
const STEP_THRESHOLD = 1.15; // m/s² d'écart au-dessus de la gravité filtrée pour détecter un pic
const STEP_RESET_RATIO = 0.4; // le pic doit redescendre sous ce ratio du seuil avant qu'un nouveau pas puisse être compté
const MIN_STEP_INTERVAL_MS = 280; // ~3.5 pas/s — cadence de marche/course rapide max, évite les doubles comptages
const SYNC_EVERY_N_STEPS = 10; // fréquence des envois au serveur (pas à chaque pas, pour ne pas spammer)

interface DeviceMotionEventWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

function needsExplicitPermission(): boolean {
  if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return false;
  return typeof (DeviceMotionEvent as unknown as DeviceMotionEventWithPermission).requestPermission === "function";
}

export function usePedometer(initialSteps: number, onSync: (total: number) => void) {
  // Lire un ref pendant le rendu (même pour une init "lazy") est interdit
  // par les règles strictes de ce projet (react-hooks/refs) : on repasse
  // donc par l'initialiseur paresseux de useState, le mécanisme prévu pour
  // ça, exécuté une seule fois au tout premier rendu.
  const [status, setStatus] = useState<PedometerStatus>("idle");
  const [steps, setSteps] = useState(() => Math.max(initialSteps, readLocalSeed()));
  const [error, setError] = useState<string | null>(null);

  // L'argument de useRef() est réévalué à chaque rendu (lecture localStorage
  // incluse) mais seul le tout premier est retenu par React — négligeable
  // en coût, et ça évite tout accès à .current pendant le rendu.
  const stepsRef = useRef(Math.max(initialSteps, readLocalSeed()));
  const lastSyncedRef = useRef(Math.max(initialSteps, readLocalSeed()));
  const gravityRef = useRef<number | null>(null);
  const lastStepAtRef = useRef(0);
  const risingRef = useRef(false);
  const attachedRef = useRef(false);
  const statusRef = useRef<PedometerStatus>("idle");

  const flush = useCallback(() => {
    if (stepsRef.current !== lastSyncedRef.current) {
      lastSyncedRef.current = stepsRef.current;
      onSync(stepsRef.current);
    }
  }, [onSync]);

  const handleMotion = useCallback(
    (e: DeviceMotionEvent) => {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);

      if (gravityRef.current == null) {
        gravityRef.current = magnitude;
        return;
      }
      gravityRef.current = LOW_PASS_ALPHA * gravityRef.current + (1 - LOW_PASS_ALPHA) * magnitude;
      const delta = magnitude - gravityRef.current;
      const now = Date.now();

      if (!risingRef.current && delta > STEP_THRESHOLD) {
        if (now - lastStepAtRef.current > MIN_STEP_INTERVAL_MS) {
          risingRef.current = true;
          lastStepAtRef.current = now;
          stepsRef.current += 1;
          setSteps(stepsRef.current);
          try {
            localStorage.setItem(todayStorageKey(), String(stepsRef.current));
          } catch {
            // stockage indisponible (navigation privée…) — le compteur en mémoire continue de fonctionner pour la session
          }
          if (stepsRef.current % SYNC_EVERY_N_STEPS === 0) flush();
        }
      } else if (risingRef.current && delta < STEP_THRESHOLD * STEP_RESET_RATIO) {
        risingRef.current = false;
      }
    },
    [flush]
  );

  const detach = useCallback(() => {
    if (attachedRef.current) {
      window.removeEventListener("devicemotion", handleMotion);
      attachedRef.current = false;
    }
  }, [handleMotion]);

  const attach = useCallback(() => {
    if (!attachedRef.current) {
      gravityRef.current = null;
      risingRef.current = false;
      window.addEventListener("devicemotion", handleMotion);
      attachedRef.current = true;
    }
  }, [handleMotion]);

  // Doit être appelé depuis un vrai geste utilisateur (clic/tap) — sur iOS,
  // DeviceMotionEvent.requestPermission() hors interaction directe est
  // silencieusement refusé, exactement comme Notification.requestPermission()
  // (voir components/messaging/PushPermission.tsx pour le même constat côté
  // notifications).
  const start = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") {
      setStatus("unsupported");
      return false;
    }
    if (needsExplicitPermission()) {
      try {
        const result = await (DeviceMotionEvent as unknown as DeviceMotionEventWithPermission).requestPermission!();
        if (result !== "granted") {
          setStatus("denied");
          setError("Mouvement refusé. Autorise-le dans Réglages → Safari → ce site pour activer le podomètre automatique.");
          return false;
        }
      } catch {
        setStatus("denied");
        setError("Impossible d'activer le podomètre sur cet appareil.");
        return false;
      }
    }
    attach();
    setStatus("active");
    setError(null);
    try {
      localStorage.setItem(PEDOMETER_ENABLED_KEY, "1");
    } catch {
      // ignore
    }
    return true;
  }, [attach]);

  const stop = useCallback(() => {
    detach();
    flush();
    setStatus("idle");
    try {
      localStorage.setItem(PEDOMETER_ENABLED_KEY, "0");
    } catch {
      // ignore
    }
  }, [detach, flush]);

  // Remet le compteur à zéro (ex. bouton "Réinitialiser" côté manuel) — sans
  // ça, le prochain envoi automatique republierait l'ancien total et
  // annulerait silencieusement la remise à zéro voulue par l'utilisateur.
  const resetCount = useCallback((value = 0) => {
    stepsRef.current = value;
    lastSyncedRef.current = value;
    setSteps(value);
    try {
      localStorage.setItem(todayStorageKey(), String(value));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Coupe le capteur quand l'onglet passe en arrière-plan (économie
  // batterie) et le reprend au retour si le podomètre était actif — les
  // navigateurs mobiles coupent de toute façon presque tous les events
  // devicemotion hors premier plan, ceci couvre juste les cas où ce n'est
  // pas automatique.
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        detach();
        flush();
      } else if (statusRef.current === "active") {
        attach();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [attach, detach, flush]);

  useEffect(() => {
    return () => detach();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- démontage uniquement, pas besoin de relancer sur chaque changement de detach
  }, []);

  return {
    status,
    steps,
    error,
    start,
    stop,
    resetCount,
    needsGesture: needsExplicitPermission(),
  };
}
