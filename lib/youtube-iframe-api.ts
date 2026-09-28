// Détection de la durée réelle d'une vidéo YouTube, dans le navigateur.
//
// Toutes les leçons de l'Académie sont figées à 10 min (valeur de création)
// et oEmbed ne donne pas la durée. Plutôt qu'une clé d'API YouTube Data
// (secret à gérer, quota), on charge l'IFrame API officielle, on ouvre un
// lecteur invisible de 1 px hors écran, on lit getDuration() puis on le
// détruit. Aucune lecture n'est lancée (autoplay 0, muet).
//
// Jamais bloquant : si un bloqueur de pub empêche le script, ou si la vidéo
// est privée, la fonction renvoie null et l'appelant garde la durée actuelle.
// La CSP de next.config.ts ne restreint ni script-src ni frame-src.

// Types minimaux déclarés ici plutôt qu'une dépendance @types/youtube.
interface YoutubePlayer {
  getDuration(): number;
  destroy(): void;
}

interface YoutubePlayerOptions {
  videoId: string;
  host?: string;
  width?: number;
  height?: number;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: () => void;
    onError?: () => void;
  };
}

interface YoutubeNamespace {
  Player: new (element: HTMLElement, options: YoutubePlayerOptions) => YoutubePlayer;
}

type YoutubeWindow = Window & {
  YT?: Partial<YoutubeNamespace>;
  onYouTubeIframeAPIReady?: () => void;
};

const IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

// Singleton : le script n'est injecté qu'une fois, même si plusieurs
// détections sont demandées en même temps.
let apiPromise: Promise<YoutubeNamespace> | null = null;

export function loadYoutubeIframeApi(timeoutMs = 10000): Promise<YoutubeNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("Disponible seulement dans le navigateur."));
  const w = window as YoutubeWindow;
  if (w.YT?.Player) return Promise.resolve(w.YT as YoutubeNamespace);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise<YoutubeNamespace>((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    const fail = (message: string) => {
      window.clearTimeout(timer);
      apiPromise = null;
      // Retire un script en échec pour qu'une nouvelle tentative le réinjecte.
      script?.remove();
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail("Lecteur YouTube indisponible (délai dépassé)."), timeoutMs);

    // On chaîne le callback global plutôt que de l'écraser, au cas où un
    // autre lecteur de la page l'utiliserait aussi.
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        // Le callback d'un autre composant ne doit pas bloquer celui-ci.
      }
      if (w.YT?.Player) {
        window.clearTimeout(timer);
        resolve(w.YT as YoutubeNamespace);
      } else {
        fail("Lecteur YouTube indisponible.");
      }
    };

    if (!document.querySelector(`script[src="${IFRAME_API_SRC}"]`)) {
      script = document.createElement("script");
      script.src = IFRAME_API_SRC;
      script.async = true;
      script.onerror = () => fail("Lecteur YouTube bloqué par le navigateur.");
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

/**
 * Durée d'une vidéo en secondes, ou null si elle n'a pas pu être lue
 * (vidéo privée, supprimée, script bloqué, délai dépassé).
 */
export async function getYoutubeDurationSeconds(videoId: string, maxWaitMs = 6000): Promise<number | null> {
  let YT: YoutubeNamespace;
  try {
    YT = await loadYoutubeIframeApi();
  } catch {
    return null;
  }

  return new Promise<number | null>((resolve) => {
    // Conteneur hors écran : jamais visible, jamais cliquable.
    const holder = document.createElement("div");
    holder.setAttribute("aria-hidden", "true");
    Object.assign(holder.style, {
      position: "fixed",
      left: "-9999px",
      top: "0",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      pointerEvents: "none",
    });
    const target = document.createElement("div");
    holder.appendChild(target);
    document.body.appendChild(holder);

    let player: YoutubePlayer | null = null;
    let poll: number | undefined;
    let settled = false;

    const finish = (value: number | null) => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      window.clearTimeout(guardTimer);
      try {
        player?.destroy();
      } catch {
        // Lecteur déjà détruit : rien à faire.
      }
      holder.remove();
      resolve(value);
    };

    // Filet global : même si onReady n'arrive jamais, on libère le lecteur.
    const guardTimer = window.setTimeout(() => finish(null), maxWaitMs + 4000);

    try {
      player = new YT.Player(target, {
        videoId,
        width: 1,
        height: 1,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 0, controls: 0, mute: 1, playsinline: 1, rel: 0 },
        events: {
          // getDuration() renvoie 0 tant que les métadonnées ne sont pas
          // chargées : on l'interroge toutes les 250 ms, au plus maxWaitMs.
          onReady: () => {
            const startedAt = Date.now();
            poll = window.setInterval(() => {
              let duration = 0;
              try {
                duration = player?.getDuration() ?? 0;
              } catch {
                duration = 0;
              }
              if (duration > 0) finish(duration);
              else if (Date.now() - startedAt > maxWaitMs) finish(null);
            }, 250);
          },
          onError: () => finish(null),
        },
      });
    } catch {
      finish(null);
    }
  });
}
