"use client";

import { useEffect, useState } from "react";
import { Smartphone, X, MoreVertical, Share, Download } from "lucide-react";

const DISMISS_KEY = "ep-install-hint-dismissed";

type Platform = "ios" | "android" | null;

// Chrome/Edge exposent cet évènement pour déclencher le VRAI prompt
// d'installation natif du navigateur — pas de type officiel dans le DOM lib.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): Platform {
  if (typeof window === "undefined") return null;
  const ua = window.navigator.userAgent;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (isStandalone) return null;
  if (!/Mobi|Android|iPhone|iPad|iPod/.test(ua)) return null;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  return "android";
}

// Mini tuto discret pour installer la PWA — beaucoup de visiteurs n'ont
// qu'un lien dans le navigateur et ne savent pas qu'ils peuvent l'ajouter
// à l'écran d'accueil. Sur Android/Chrome, on déclenche maintenant le vrai
// prompt natif du navigateur (un tap, pas de manip) via beforeinstallprompt ;
// iOS Safari n'expose pas cette API (limite de la plateforme, pas de
// l'appli), donc les 3 étapes manuelles restent le seul chemin possible là-bas.
export default function InstallAppHint() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!platform || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  async function handleClick() {
    if (!deferredPrompt) {
      setOpen((v) => !v);
      return;
    }
    // Prompt natif disponible : un tap suffit, pas besoin des 3 étapes
    // manuelles. Le navigateur ne réémettra beforeinstallprompt qu'après un
    // nouveau refus, donc on nettoie l'état dans tous les cas.
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") dismiss();
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#F5EDED]/30 hover:text-[#F5EDED]/55 transition-colors py-2"
      >
        {deferredPrompt ? <Download size={11} strokeWidth={1.8} /> : <Smartphone size={11} strokeWidth={1.8} />}
        Installer l&apos;appli sur ton téléphone
      </button>

      {open && (
        <div className="ep-modal-overlay fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="ep-modal-panel bg-[#1f0101] border border-[#890404]/25 rounded-2xl p-5 max-w-xs w-full relative"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-[#F5EDED]/30 hover:text-[#F5EDED]/60"
            >
              <X size={14} />
            </button>
            <p className="text-sm font-black text-[#F5EDED] mb-3 pr-6">
              Installer EP Coaching
            </p>

            {platform === "android" ? (
              <ol className="space-y-2.5 text-xs text-[#F5EDED]/65">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#E01E1E]">1.</span>
                  Ouvre ce lien dans Chrome (colle l&apos;adresse si besoin)
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#E01E1E]">2.</span>
                  Touche les <MoreVertical size={12} className="inline -mt-0.5" /> trois petits points en haut à droite
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#E01E1E]">3.</span>
                  Touche <span className="font-bold text-[#F5EDED]">« Installer l&apos;application »</span> (ou « Ajouter à l&apos;écran d&apos;accueil »)
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-[#F5EDED]/65">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#E01E1E]">1.</span>
                  Ouvre ce lien dans Safari
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#E01E1E]">2.</span>
                  Touche <Share size={12} className="inline -mt-0.5" /> le bouton Partager en bas
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-[#E01E1E]">3.</span>
                  Touche <span className="font-bold text-[#F5EDED]">« Sur l&apos;écran d&apos;accueil »</span>
                </li>
              </ol>
            )}

            <button
              onClick={dismiss}
              className="mt-4 text-[10px] font-semibold text-[#F5EDED]/25 hover:text-[#F5EDED]/50"
            >
              Ne plus afficher
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
