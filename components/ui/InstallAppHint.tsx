"use client";

import { useEffect, useState } from "react";
import { Smartphone, X, MoreVertical, Share } from "lucide-react";

const DISMISS_KEY = "ep-install-hint-dismissed";

type Platform = "ios" | "android" | null;

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
// à l'écran d'accueil. Provisoire : juste un lien texte qui ouvre 3 étapes,
// pas de bandeau intrusif.
export default function InstallAppHint() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setPlatform(detectPlatform());
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!platform || dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="flex justify-center">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#F5EDED]/30 hover:text-[#F5EDED]/55 transition-colors py-2"
      >
        <Smartphone size={11} strokeWidth={1.8} />
        Installer l&apos;appli sur ton téléphone
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#1f0101] border border-[#890404]/25 rounded-2xl p-5 max-w-xs w-full relative"
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
