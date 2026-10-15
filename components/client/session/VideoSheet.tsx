"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { Send, Save } from "lucide-react";
import Sheet from "@/components/nutrition/Sheet";

// Aperçu de la vidéo d'une série juste filmée, puis envoi en un tap : au
// coach (messagerie, avec exercice, série et charge en légende) ou juste
// rangée avec la série.

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1).replace(".", ",")} Mo`;
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
}

export default function VideoSheet({
  file,
  url,
  caption,
  hasCoach,
  onConfirm,
  onClose,
}: {
  file: File;
  /** URL locale (URL.createObjectURL) créée et libérée par le parent. */
  url: string;
  caption: string;
  hasCoach: boolean;
  onConfirm: (sendToCoach: boolean) => void;
  onClose: () => void;
}) {
  const t = useT();

  return (
    <Sheet
      title={t("Vidéo de ta série")}
      subtitle={`${caption} · ${formatBytes(file.size)}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col gap-2">
          {hasCoach && (
            <button
              type="button"
              onClick={() => onConfirm(true)}
              className="w-full min-h-12 rounded-xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-(--ep-strong) bg-(--ep-accent)"
            >
              <Send size={16} />
              {t("Envoyer au coach")}
            </button>
          )}
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className={`w-full min-h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider ${
              hasCoach
                ? "text-(--ep-ink)/70 border border-(--ep-line)/30 bg-(--ep-s2)"
                : "text-(--ep-strong) bg-(--ep-accent)"
            }`}
          >
            <Save size={14} />
            {hasCoach ? t("Juste l'enregistrer avec la série") : t("Enregistrer avec la série")}
          </button>
        </div>
      }
    >
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className="w-full max-h-[52dvh] rounded-xl bg-(--ep-shade) object-contain"
      />
      <p className="text-[11px] text-(--ep-ink)/50 mt-2 leading-snug">
        {t("L'envoi continue pendant que tu reprends ta séance.")}
      </p>
    </Sheet>
  );
}
