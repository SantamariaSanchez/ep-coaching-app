"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, AlertTriangle, Heart, Target, CalendarDays, Dumbbell, Image as ImageIcon, StickyNote, X, ExternalLink } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import type { ClientIntake } from "@/utils/client-intake";
import type { ScheduleBlock } from "@/utils/agenda";
import type { ProgramWithDays } from "@/utils/programs";
import { TRAINING_ACCESS_LABELS } from "@/lib/plan-generator";
import { VOLUME_LANDMARKS } from "@/lib/volume-data";

export interface ContextPhotos {
  gym: string[];
  physique: { label: string; url: string }[];
}

const DAY_SHORT = ["", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
export const SPORT_BLOCK = /(s[ée]ance|muscu|sport|training|entra[iî]n|salle|gym|push|pull|legs|full|haut|bas|cardio|course|run|crossfit|hyrox)/i;

export function plannedVolume(program: ProgramWithDays | null): Record<string, number> {
  const v: Record<string, number> = {};
  if (!program) return v;
  for (const d of program.days)
    for (const e of d.exercises) {
      if (e.is_direct === false || !e.muscle_group || !e.sets) continue;
      v[e.muscle_group] = (v[e.muscle_group] ?? 0) + e.sets;
    }
  return v;
}

export function volumeColor(group: string, sets: number): string {
  const lm = VOLUME_LANDMARKS[group];
  if (!lm) return "rgba(var(--ep-ink-rgb),0.55)";
  if (sets < lm.mev) return "var(--ep-bad)";
  if (sets <= lm.mav) return "var(--ep-ok)";
  if (sets <= lm.mrv) return "var(--ep-warn)";
  return "var(--ep-bad)";
}

// Fiche client compacte à gauche de l'espace de conception : tout ce qu'il
// faut savoir pour programmer sans changer d'onglet. Les sections vides ne
// s'affichent pas ; les notes tiennent sur 3 lignes, pas un pavé.
export default function ClientContextPanel({
  clientName,
  intake,
  scheduleBlocks,
  currentProgram,
  photos,
  coachNotes,
  onCoachNotesChange,
  clientHref,
}: {
  clientName: string;
  intake: ClientIntake | null;
  scheduleBlocks: ScheduleBlock[];
  currentProgram: ProgramWithDays | null;
  photos: ContextPhotos;
  coachNotes: string;
  onCoachNotesChange: (v: string) => void;
  clientHref?: string;
}) {
  const tr = useT();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const avoid = [
    intake?.injuries && { k: tr("Blessures / douleurs"), v: intake.injuries },
    intake?.health_issues && { k: tr("Santé"), v: intake.health_issues },
    intake?.exercises_problematic && { k: tr("Exercices qui font mal"), v: intake.exercises_problematic },
    intake?.disliked_equipment && { k: tr("Machines qu'il n'aime pas"), v: intake.disliked_equipment },
  ].filter(Boolean) as { k: string; v: string }[];

  const likes = [
    intake?.exercises_that_work && { k: tr("Ce qui marche pour lui"), v: intake.exercises_that_work },
    intake?.preferred_split && { k: tr("Split préféré"), v: intake.preferred_split },
    intake?.cardio_preference && { k: tr("Cardio"), v: intake.cardio_preference },
  ].filter(Boolean) as { k: string; v: string }[];

  const profile = [
    intake?.goal_3_months && { k: tr("Objectif 3 mois"), v: intake.goal_3_months },
    intake?.goal_12_months && { k: tr("Objectif 12 mois"), v: intake.goal_12_months },
    {
      k: tr("Lieu"),
      v: [intake?.training_access ? TRAINING_ACCESS_LABELS[intake.training_access] : tr("non renseigné"), intake?.gym_name].filter(Boolean).join(" · "),
    },
    (intake?.sessions_desired || intake?.sessions_current || intake?.session_duration) && {
      k: tr("Fréquence"),
      v: [
        intake?.sessions_desired ? `${intake.sessions_desired}×/sem ${tr("voulues")}` : null,
        intake?.sessions_current != null ? `${intake.sessions_current}×/sem ${tr("aujourd'hui")}` : null,
        intake?.session_duration ? `${intake.session_duration}` : null,
      ].filter(Boolean).join(" · "),
    },
  ].filter(Boolean) as { k: string; v: string }[];

  const sportByDay = new Map<number, ScheduleBlock[]>();
  const busyByDay = new Map<number, number>();
  for (const b of scheduleBlocks) {
    if (b.specific_date) continue;
    busyByDay.set(b.day_of_week, (busyByDay.get(b.day_of_week) ?? 0) + 1);
    if (SPORT_BLOCK.test(b.label)) sportByDay.set(b.day_of_week, [...(sportByDay.get(b.day_of_week) ?? []), b]);
  }

  const vol = plannedVolume(currentProgram);
  const volEntries = Object.entries(vol).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2 text-[12px]">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-(--ep-accent)">{tr("Fiche de")} {clientName.split(" ")[0]}</p>
        {clientHref && (
          <Link href={clientHref} className="text-[10px] text-(--ep-ink)/35 hover:text-(--ep-strong) inline-flex items-center gap-1">
            {tr("Fiche complète")} <ExternalLink size={10} />
          </Link>
        )}
      </div>

      {!intake && (
        <p className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200/90 leading-relaxed">
          {tr("Pas encore d'onboarding rempli. Tu peux programmer quand même, la fiche s'affichera ici dès qu'il l'aura faite.")}
        </p>
      )}

      {profile.length > 0 && (
        <Section icon={<Target size={12} />} title={tr("Objectif & cadre")} defaultOpen>
          <KV items={profile} />
        </Section>
      )}

      {avoid.length > 0 && (
        <Section icon={<AlertTriangle size={12} />} title={tr("À éviter")} tone="danger" defaultOpen>
          <KV items={avoid} />
        </Section>
      )}

      {likes.length > 0 && (
        <Section icon={<Heart size={12} />} title={tr("Ce qu'il aime")} defaultOpen>
          <KV items={likes} />
        </Section>
      )}

      <Section icon={<CalendarDays size={12} />} title={tr("Son agenda")} defaultOpen>
        {scheduleBlocks.length === 0 && !intake?.availability ? (
          <p className="text-(--ep-ink)/35">{tr("Agenda pas encore rempli.")}</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                const sport = sportByDay.get(d) ?? [];
                return (
                  <div
                    key={d}
                    className={`rounded-md px-1 py-1.5 text-center ${sport.length ? "bg-green-500/10 border border-green-500/30" : "bg-(--ep-shade)/25 border border-transparent"}`}
                    title={sport.map((b) => `${b.start_time.slice(0, 5)} ${b.label}`).join("\n") || undefined}
                  >
                    <p className="text-[9.5px] font-bold text-(--ep-ink)/50">{DAY_SHORT[d]}</p>
                    <p className={`text-[10px] font-semibold ${sport.length ? "text-green-300" : "text-(--ep-ink)/25"}`}>
                      {sport.length ? sport[0].start_time.slice(0, 5) : busyByDay.get(d) ? "·" : "—"}
                    </p>
                  </div>
                );
              })}
            </div>
            {intake?.availability && <p className="mt-2 text-(--ep-ink)/60 leading-relaxed">{intake.availability}</p>}
            {intake?.work_hours && <p className="mt-1 text-(--ep-ink)/40">{tr("Travail")} : {intake.work_hours}</p>}
          </>
        )}
      </Section>

      {currentProgram && currentProgram.days.length > 0 && (
        <Section icon={<Dumbbell size={12} />} title={tr("Programme actuel")}>
          <p className="text-(--ep-ink)/75 font-semibold">{currentProgram.name}</p>
          <p className="text-(--ep-ink)/40 mb-2">
            {currentProgram.days.length} {tr("séances")} ·{" "}
            {new Date(currentProgram.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </p>
          {volEntries.length > 0 && (
            <>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/30 mb-1">{tr("Volume actuel (séries / semaine)")}</p>
              <div className="flex flex-wrap gap-1">
                {volEntries.map(([g, s]) => (
                  <span key={g} className="px-1.5 py-0.5 rounded bg-(--ep-shade)/30 text-[10.5px]">
                    <span className="text-(--ep-ink)/55">{g}</span> <b style={{ color: volumeColor(g, s) }}>{s}</b>
                  </span>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      {(photos.gym.length > 0 || photos.physique.length > 0) && (
        <Section icon={<ImageIcon size={12} />} title={tr("Photos")}>
          {photos.physique.length > 0 && (
            <>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/30 mb-1">{tr("Physique")}</p>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {photos.physique.map((p) => (
                  <button key={p.url} type="button" onClick={() => setLightbox(p.url)} className="relative aspect-[3/4] rounded-md overflow-hidden bg-(--ep-shade)/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute bottom-0 inset-x-0 text-[9px] bg-(--ep-shade)/60 text-center py-0.5">{p.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {photos.gym.length > 0 && (
            <>
              <p className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/30 mb-1">{tr("Machines de sa salle")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.gym.map((url, i) => (
                  <button key={url} type="button" onClick={() => setLightbox(url)} className="aspect-square rounded-md overflow-hidden bg-(--ep-shade)/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`${tr("Salle")} ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
        </Section>
      )}

      <Section icon={<StickyNote size={12} />} title={tr("Mes notes (privées)")} defaultOpen>
        <textarea
          value={coachNotes}
          onChange={(e) => onCoachNotesChange(e.target.value)}
          rows={3}
          placeholder={tr("Ex. épaule droite à surveiller, monter le volume dos…")}
          aria-label={tr("Notes privées de conception")}
          className="w-full bg-(--ep-shade)/30 border border-(--ep-line)/25 focus:border-(--ep-accent)/50 rounded-md px-2 py-1.5 text-[12px] text-(--ep-strong) placeholder:text-(--ep-ink)/20 outline-none resize-y min-h-[58px] max-h-48"
        />
      </Section>

      {lightbox && (
        <div className="fixed inset-0 z-[90] bg-(--ep-shade)/90 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button type="button" aria-label={tr("Fermer")} className="absolute top-4 right-4 text-(--ep-strong)/70 hover:text-(--ep-strong)">
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function Section({
  icon,
  title,
  children,
  defaultOpen = false,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: "danger";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-lg border ${tone === "danger" ? "border-red-500/30 bg-red-500/[0.05]" : "border-(--ep-line)/25 bg-(--ep-s3)"}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest ${tone === "danger" ? "text-red-300" : "text-(--ep-ink)/55"}`}
      >
        {icon}
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .15s" }} />
      </button>
      {open && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  );
}

export function KV({ items }: { items: { k: string; v: string }[] }) {
  return (
    <dl className="space-y-1.5">
      {items.map(({ k, v }) => (
        <div key={k}>
          <dt className="text-[9.5px] font-bold uppercase tracking-widest text-(--ep-ink)/30">{k}</dt>
          <dd className="text-(--ep-ink)/80 leading-snug whitespace-pre-line line-clamp-4" title={v}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
