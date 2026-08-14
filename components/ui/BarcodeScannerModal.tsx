"use client";

import { useEffect, useRef, useState } from "react";
import { X, ScanBarcode, AlertTriangle } from "lucide-react";

// Détecteur de code-barres natif du navigateur — pas de librairie externe à
// charger. Chrome/Edge (desktop et Android) le supportent, Safari et
// Firefox non : sur ces navigateurs le composant explique clairement la
// limite au lieu d'un écran caméra qui ne détecte jamais rien.
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

// Item 16 (scan code-barres) : appelé depuis ClientNutritionView, renvoie
// un code-barres brut au parent via onScan. Le parent va ensuite chercher
// le produit (OpenFoodFacts) et pré-remplit le formulaire de création
// d'aliment déjà existant — ce composant ne s'occupe que de la caméra et
// de la détection, pas de la recherche produit ni de la sauvegarde.
export default function BarcodeScannerModal({
  onScan,
  onClose,
}: {
  onScan: (barcode: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => typeof window !== "undefined" && "BarcodeDetector" in window);

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new window.BarcodeDetector!({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e"],
        });

        // Toutes les ~350ms plutôt qu'à chaque frame : largement suffisant
        // pour un code-barres immobile devant la caméra, sans saturer le CPU.
        intervalId = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0 && !cancelled) {
              onScan(codes[0].rawValue);
            }
          } catch {
            // frame illisible ponctuelle — pas grave, on retente au prochain tick
          }
        }, 350);
      } catch {
        if (!cancelled) setError("Impossible d'accéder à la caméra. Vérifie l'autorisation dans les réglages du navigateur.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-sm bg-[#150000] border border-[#890404]/40 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#890404]/20">
          <p className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
            <ScanBarcode size={14} className="text-[#E01E1E]" /> Scanner un code-barres
          </p>
          <button onClick={onClose} aria-label="Fermer" className="text-[#F5EDED]/40 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {!supported ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <AlertTriangle size={24} className="text-amber-400" />
            <p className="text-sm text-[#F5EDED]/70">
              Ton navigateur ne permet pas le scan de code-barres ici.
            </p>
            <p className="text-xs text-[#F5EDED]/35">
              Ça marche avec Chrome sur Android. En attendant, ajoute l&apos;aliment manuellement.
            </p>
          </div>
        ) : error ? (
          <div className="p-6 flex flex-col items-center gap-3 text-center">
            <AlertTriangle size={24} className="text-amber-400" />
            <p className="text-sm text-[#F5EDED]/70">{error}</p>
          </div>
        ) : (
          <div className="relative aspect-square bg-black">
            <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-[#E01E1E]/70 rounded-xl pointer-events-none" />
            <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-white/70 font-semibold">
              Centre le code-barres dans le cadre
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
