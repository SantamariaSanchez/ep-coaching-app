"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { parseScreenshotText, type ScreenshotValues } from "@/lib/social/screenshot-parse";

// Remplit les chiffres d'une publication à partir d'une capture d'écran de
// ses statistiques (décision d'Emmanuel du 03/11/2026). La lecture se fait
// dans le navigateur avec Tesseract (OCR classique), l'image n'est jamais
// envoyée ni stockée. Le coach vérifie toujours les chiffres ensuite.

/** Prépare l'image pour l'OCR : agrandie, en niveaux de gris, texte sombre sur fond clair. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = img.width < 1400 ? 2 : 1;
    const c = document.createElement("canvas");
    c.width = img.width * scale;
    c.height = img.height * scale;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) {
      const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      px[i] = px[i + 1] = px[i + 2] = g;
      sum += g;
    }
    // Mode sombre (fréquent sur Instagram et TikTok) : on inverse.
    if (sum / (px.length / 4) < 110) {
      for (let i = 0; i < px.length; i += 4) px[i] = px[i + 1] = px[i + 2] = 255 - px[i];
    }
    ctx.putImageData(data, 0, 0);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function ScreenshotFill({ onValues }: { onValues: (values: ScreenshotValues) => void }) {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "busy" | "done" | "empty" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [found, setFound] = useState(0);

  async function read(file: File) {
    setState("busy");
    setProgress(0);
    try {
      const canvas = await prepare(file);
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["fra", "eng"], 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(canvas);
      await worker.terminate();
      const values = parseScreenshotText(data.text);
      const count = Object.keys(values).length;
      setFound(count);
      if (count === 0) return setState("empty");
      onValues(values);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, border: "1px dashed rgba(var(--ep-accent-rgb),0.45)", background: "rgba(var(--ep-accent-rgb),0.05)" }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) read(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={state === "busy"}
        onClick={() => inputRef.current?.click()}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: 0, color: "var(--ep-accent-hi2)", fontSize: 12.5, fontWeight: 900, cursor: "pointer" }}
      >
        {state === "busy" ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}{" "}
        {state === "busy" ? `${tr("Lecture de la capture")} ${progress} %` : tr("Remplir depuis une capture de tes stats")}
      </button>
      <p style={{ fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.5)", margin: "4px 0 0", lineHeight: 1.5 }}>
        {state === "done"
          ? `${found} ${tr("chiffre(s) trouvé(s). Vérifie-les avant d'enregistrer.")}`
          : state === "empty"
            ? tr("Aucun chiffre reconnu sur cette capture. Essaie une capture plus nette de l'écran des statistiques, ou remplis à la main.")
            : state === "error"
              ? tr("La lecture n'a pas marché. Remplis les chiffres à la main.")
              : tr("Capture de l'écran Statistiques de ta publication (Instagram, TikTok, YouTube…). L'image reste sur ton téléphone.")}
      </p>
    </div>
  );
}
