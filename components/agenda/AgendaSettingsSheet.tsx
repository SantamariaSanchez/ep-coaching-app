"use client";

// Réglages de l'agenda (2026-10-20) : l'heure de début et de fin de SA
// journée. 6h-22h par défaut, mais quelqu'un qui travaille de nuit choisit
// 20h-8h et la grille suit (la journée passe minuit).

import { useState } from "react";
import { useT } from "@/components/i18n/I18nProvider";
import Sheet from "@/components/nutrition/Sheet";
import { Moon, Sun, Sunrise, Sunset } from "lucide-react";
import { durationLabel, isOvernight, windowLabel, windowSpan, type DayWindow } from "@/lib/agenda-engine";
import { Chip, ErrorText, PrimaryButton, SectionLabel, TimeSelect } from "./ui";

const PRESETS: { label: string; icon: typeof Sun; w: DayWindow }[] = [
  { label: "Journée 6h – 22h", icon: Sun, w: { start: 360, end: 1320 } },
  { label: "Lève-tôt 5h – 21h", icon: Sunrise, w: { start: 300, end: 1260 } },
  { label: "Couche-tard 9h – 1h", icon: Sunset, w: { start: 540, end: 60 } },
  { label: "Nuit 20h – 8h", icon: Moon, w: { start: 1200, end: 480 } },
];

export default function AgendaSettingsSheet({
  window: initial,
  ready,
  onSave,
  onClose,
}: {
  window: DayWindow;
  ready: boolean;
  onSave: (w: DayWindow) => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useT();
  const [w, setW] = useState<DayWindow>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { s, e } = windowSpan(w);
  const valid = w.start !== w.end;

  return (
    <Sheet
      title={t("Mes heures")}
      subtitle={t("Ta journée, de ton réveil à ton coucher")}
      onClose={onClose}
      footer={
        <PrimaryButton
          disabled={busy || !valid}
          onClick={async () => {
            setBusy(true);
            const res = await onSave(w);
            setBusy(false);
            if (res) setErr(res);
            else onClose();
          }}
        >
          {busy ? t("Enregistrement…") : t("Enregistrer")}
        </PrimaryButton>
      }
    >
      <div className="space-y-4 pb-2">
        <div>
          <SectionLabel>{t("Rapide")}</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => {
              const active = p.w.start === w.start && p.w.end === w.end;
              const Icon = p.icon;
              return (
                <Chip key={p.label} active={active} onClick={() => setW(p.w)}>
                  <Icon size={13} /> <span className="whitespace-nowrap">{t(p.label)}</span>
                </Chip>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionLabel>{t("Début de journée")}</SectionLabel>
            <TimeSelect label={t("Début de journée")} value={w.start} onChange={(v) => setW((x) => ({ ...x, start: v }))} />
          </div>
          <div>
            <SectionLabel>{t("Fin de journée")}</SectionLabel>
            <TimeSelect label={t("Fin de journée")} value={w.end} allowMidnightEnd onChange={(v) => setW((x) => ({ ...x, end: v }))} />
          </div>
        </div>
        <div className="rounded-xl border border-(--ep-line)/25 bg-(--ep-s1) px-3 py-2.5 text-[12.5px] text-(--ep-ink)/75 leading-relaxed">
          {valid ? (
            <>
              {t("Ta journée dure")} <b className="text-(--ep-strong)">{durationLabel(e - s)}</b>, {t("de")} {windowLabel(w)}.
              {isOvernight(w) && <> {t("Elle passe minuit : ce que tu fais après minuit reste affiché sur la journée commencée la veille.")}</>}
            </>
          ) : (
            t("Choisis une heure de fin différente de l'heure de début.")
          )}
        </div>
        <p className="text-[11px] text-(--ep-ink)/45 leading-relaxed">
          {t("La grille, les créneaux libres et « Construire ma semaine » suivent ces heures. Un bloc en dehors reste visible.")}
        </p>
        {!ready && (
          <p className="text-[11px] leading-relaxed" style={{ color: "var(--ep-warn)" }}>
            {t("L'enregistrement des réglages arrive avec la prochaine mise à jour de la base. En attendant, l'agenda reste sur 6h – 22h.")}
          </p>
        )}
        <ErrorText>{err}</ErrorText>
      </div>
    </Sheet>
  );
}
