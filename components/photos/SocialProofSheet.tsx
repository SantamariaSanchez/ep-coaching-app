"use client";

import { useEffect, useRef, useState } from "react";
import { X, Share2, Loader2, ShieldCheck, ScanFace } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import { renderSocialProof, shareOrDownload, type FaceMask } from "@/lib/social-proof-image";
import { daysBetween, durationLabel, formatSetDate } from "@/lib/photo-sets";
import type { ComparatorAudience } from "./PhotoComparator";

// « Un seul bouton si jamais je veux faire un post Insta pour une preuve
// sociale, donc ça ajoute tout seul le logo » : aperçu de l'image 4:5 prête
// à publier, visage masquable en un tap, puis partage natif.

const MASKS: { key: FaceMask; label: string }[] = [
  { key: "none", label: "Visible" },
  { key: "blur", label: "Flouter" },
  { key: "band", label: "Bande" },
];

export default function SocialProofSheet({
  beforeUrl,
  afterUrl,
  beforeDate,
  afterDate,
  audience,
  subjectName,
  onClose,
}: {
  beforeUrl: string;
  afterUrl: string;
  beforeDate: string;
  afterDate: string;
  audience: ComparatorAudience;
  subjectName?: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const [mask, setMask] = useState<FaceMask>("none");
  const [result, setResult] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Toujours dans l'ordre chronologique sur l'image publiée.
  const ordered = beforeDate <= afterDate
    ? { b: beforeUrl, a: afterUrl, bd: beforeDate, ad: afterDate }
    : { b: afterUrl, a: beforeUrl, bd: afterDate, ad: beforeDate };
  const days = daysBetween(ordered.bd, ordered.ad);
  const key = `${ordered.b}|${ordered.a}|${mask}`;

  useEffect(() => {
    let cancelled = false;
    renderSocialProof({
      beforeUrl: ordered.b,
      afterUrl: ordered.a,
      beforeLabel: formatSetDate(ordered.bd, true),
      afterLabel: formatSetDate(ordered.ad, true),
      headline: days > 0 ? durationLabel(days) : "Avant / Après",
      subline: `${formatSetDate(ordered.bd, true)} → ${formatSetDate(ordered.ad, true)}`,
      faceMask: mask,
    })
      .then((blob) => {
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setResult({ key, blob, url });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key, ordered.b, ordered.a, ordered.bd, ordered.ad, days, mask]);

  // Libère la dernière image à la fermeture.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const ready = result?.key === key ? result : null;
  const failed = failedKey === key && !ready;

  async function share() {
    if (!ready) return;
    setSharing(true);
    setNote(null);
    const outcome = await shareOrDownload(ready.blob, `ep-coaching-avant-apres-${ordered.ad}.jpg`, "Avant / Après");
    setSharing(false);
    if (outcome === "downloaded") setNote(t("Image enregistrée. Sur téléphone, tu peux aussi appuyer longuement sur l'aperçu pour l'enregistrer."));
  }

  return (
    <div className="fixed inset-0 flex flex-col justify-end" style={{ zIndex: 1020 }}>
      <button type="button" aria-label={t("Fermer")} onClick={onClose} className="absolute inset-0 bg-(--ep-shade)/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("Post preuve sociale")}
        className="relative rounded-t-2xl border-t border-(--ep-line)/25 bg-(--ep-bg) px-4 pt-3 max-h-[94vh] overflow-y-auto"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-(--ep-ink)/45">{t("Format Instagram 4:5")}</p>
            <p className="text-[15px] font-black uppercase tracking-tight text-(--ep-strong)">{t("Post preuve sociale")}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className="w-11 h-11 flex items-center justify-center text-(--ep-ink)/60">
            <X size={20} />
          </button>
        </div>

        <div className="mt-2 mx-auto rounded-xl overflow-hidden border border-(--ep-line)/20 bg-(--ep-s2)" style={{ aspectRatio: "4 / 5", maxHeight: "52vh" }}>
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ready.url} alt={t("Aperçu du post avant / après")} className="w-full h-full object-contain" />
          ) : failed ? (
            <div className="w-full h-full flex items-center justify-center p-6 text-center">
              <p className="text-xs text-(--ep-ink)/60">{t("Impossible de préparer l'image avec ces photos. Réessaie avec une autre semaine.")}</p>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 size={22} className="animate-spin text-(--ep-ink)/50" />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-1.5" role="group" aria-label={t("Visage")}>
          <ScanFace size={16} className="text-(--ep-ink)/50 flex-shrink-0" />
          {MASKS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMask(m.key)}
              aria-pressed={mask === m.key}
              className={`flex-1 h-11 rounded-xl border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                mask === m.key ? "border-(--ep-accent)/60 bg-(--ep-accent)/15 text-(--ep-accent)" : "border-(--ep-line)/25 bg-(--ep-s1) text-(--ep-ink)/70"
              }`}
            >
              {t(m.label)}
            </button>
          ))}
        </div>

        {audience === "coach" && (
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-(--ep-ink)/70 rounded-xl border border-(--ep-warn)/30 bg-(--ep-warn)/10 px-3 py-2.5">
            <ShieldCheck size={15} className="text-(--ep-warn) flex-shrink-0 mt-px" />
            <span>
              {subjectName
                ? `${t("Demande l'accord de")} ${subjectName} ${t("avant de publier ses photos.")}`
                : t("Demande l'accord de ton client avant de publier ses photos.")}
            </span>
          </p>
        )}

        <button
          type="button"
          onClick={share}
          disabled={!ready || sharing}
          className="mt-3 w-full h-12 rounded-xl bg-(--ep-accent) text-(--ep-strong) text-[12px] font-black uppercase tracking-widest inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
          {t("Partager ou enregistrer")}
        </button>
        {note && <p className="mt-2 text-[11px] text-(--ep-ink)/60 text-center">{note}</p>}
      </div>
    </div>
  );
}
