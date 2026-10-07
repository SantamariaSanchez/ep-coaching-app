"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import type { SessionSet, SessionWithSets } from "@/utils/sessions";
import { safeExternalUrl } from "@/lib/sanitize";

// Carte d'historique de séance, partagée par le logbook coach (fiche d'un
// membre) et le logbook perso ("Mes dernières séances"). Extraite de
// components/coach/CoachLogbookClient.tsx pour que le fondateur puisse lui
// aussi déplier une séance passée sur place, séries comprises, sans changer
// de page.

// Repère les notes de set qui mentionnent probablement une gêne physique,
// pour les distinguer visuellement des notes techniques ("pause en bas",
// "tempo lent"...) au milieu de toutes les autres. Volontairement une
// simple liste de mots-clés côté client, pas une analyse "intelligente" :
// un faux négatif reste visible (la note s'affiche quand même), un faux
// positif ne fait que la mettre en rouge à tort.
const PAIN_KEYWORDS = /douleur|douloureux|mal au|mal à|mal aux|gêne|gene|tirai|craqu|brûl|brul|bless|pinc|inconfort/i;

function isPainNote(note: string): boolean {
  return PAIN_KEYWORDS.test(note);
}

type BreakdownSet = Pick<
  SessionSet,
  "id" | "exercise_name" | "set_number" | "weight_kg" | "reps_actual" | "rir_actual" | "is_pr" | "notes" | "video_url"
>;

/**
 * Une ligne par (exercice, numéro de série), la plus récente gardée (les
 * séries arrivent triées par created_at croissant). Des doublons
 * d'enregistrement existent en base (double-tap, revalidation) : sans ce
 * filtre ils s'affichaient deux fois, comme SessionView le fait déjà.
 */
export function dedupeSessionSets<T extends BreakdownSet>(sets: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const s of sets) byKey.set(`${s.exercise_name}\u0000${s.set_number}`, s);
  return [...byKey.values()];
}

/** Séries groupées par exercice, dans l'ordre où les exercices ont été faits. */
function groupByExercise<T extends BreakdownSet>(sets: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const s of dedupeSessionSets(sets)) {
    const list = groups.get(s.exercise_name);
    if (list) list.push(s);
    else groups.set(s.exercise_name, [s]);
  }
  // Première apparition = ordre des exercices ; à l'intérieur, l'ordre des
  // séries (une série corrigée plus tard ne passe pas en dernier).
  const firstSeen = new Map<string, number>();
  sets.forEach((s, i) => {
    if (!firstSeen.has(s.exercise_name)) firstSeen.set(s.exercise_name, i);
  });
  return [...groups.entries()]
    .sort((a, b) => (firstSeen.get(a[0]) ?? 0) - (firstSeen.get(b[0]) ?? 0))
    .map(([name, list]) => [name, [...list].sort((a, b) => a.set_number - b.set_number)]);
}

/** Nombre d'exercices avec un record dans la séance (un seul PR par exercice). */
export function countSessionPRs(sets: BreakdownSet[]): number {
  return new Set(
    dedupeSessionSets(sets)
      .filter((s) => s.is_pr)
      .map((s) => s.exercise_name.toLowerCase())
  ).size;
}

/**
 * Liste des séries par exercice : pastilles poids × reps RIR, PR, vidéo, et
 * notes (celles qui signalent une gêne ressortent en rouge).
 * `videoUrlFor` : pour une source où video_url n'est encore qu'un chemin de
 * stockage (récap de séance), l'URL signée à utiliser à la place.
 */
export function SessionSetsBreakdown({
  sets,
  videoUrlFor,
}: {
  sets: BreakdownSet[];
  videoUrlFor?: (set: BreakdownSet) => string | null;
}) {
  const t = useT();
  const groups = groupByExercise(sets);
  if (groups.length === 0) {
    return <p className="text-xs text-[#F5EDED]/35 italic">{t("Aucune série enregistrée pour cette séance.")}</p>;
  }

  return (
    <div className="space-y-3">
      {groups.map(([name, exSets]) => {
        // Un seul PR par exercice et par séance : la série marquée PR la
        // plus lourde (la première à égalité). Des séances passées portent
        // plusieurs séries marquées PR pour le même exercice (bug corrigé
        // depuis, ex. 60 kg marqué deux fois) : les autres s'affichent
        // comme des séries normales.
        const prHolder = exSets
          .filter((s) => s.is_pr)
          .reduce<BreakdownSet | null>(
            (best, s) => (best == null || (s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best),
            null
          );
        // Item 29 : notes laissées par le client sur un set précis. La note
        // d'exercice est recopiée sur chaque série enregistrée : une seule
        // fois par texte, sinon la même phrase s'empilait 3 ou 4 fois.
        const notes = [...new Set(exSets.map((s) => s.notes?.trim()).filter((n): n is string => !!n))];
        return (
          <div key={name}>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-1.5 break-words">
              {name}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exSets.map((s) => {
                const videoHref = s.video_url
                  ? videoUrlFor
                    ? videoUrlFor(s)
                    : safeExternalUrl(s.video_url)
                  : null;
                const isPR = prHolder?.id === s.id;
                return (
                  <span
                    key={s.id}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                      isPR
                        ? "bg-amber-500/15 text-amber-300 border-amber-500/25"
                        : "bg-[#890404]/10 text-[#F5EDED]/60 border-[#890404]/20"
                    }`}
                  >
                    {s.weight_kg != null ? `${s.weight_kg}kg` : "···"}
                    {" × "}
                    {s.reps_actual ?? "···"}
                    {s.rir_actual != null && ` RIR${s.rir_actual}`}
                    {isPR && " 🏆"}
                    {s.video_url &&
                      (videoHref ? (
                        <a
                          href={videoHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="ml-1.5 text-[#E01E1E]"
                          title={t("Voir la vidéo du set")}
                        >
                          🎥
                        </a>
                      ) : (
                        <span className="ml-1.5" title={t("Vidéo envoyée")}>
                          🎥
                        </span>
                      ))}
                  </span>
                );
              })}
            </div>
            {notes.length > 0 && (
              <div className="mt-1.5 space-y-1">
                {notes.map((note) => {
                  const pain = isPainNote(note);
                  return (
                    <p
                      key={note}
                      className={`text-[10.5px] leading-relaxed px-2 py-1 rounded-lg ${
                        pain
                          ? "bg-red-500/10 text-red-300 border border-red-500/25"
                          : "text-[#F5EDED]/40 italic"
                      }`}
                    >
                      {pain && <AlertCircle size={10} className="inline mr-1 -mt-0.5" />}
                      {note}
                    </p>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FeelingDots({ value, max = 5 }: { value: number | null; max?: number }) {
  if (value == null) return <span className="text-[#F5EDED]/25">···</span>;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i < value ? "bg-[#E01E1E]" : "bg-[#F5EDED]/15"}`}
        />
      ))}
    </div>
  );
}

export default function SessionHistoryCard({
  session,
  recapHref,
}: {
  session: SessionWithSets;
  /** Lien vers le récap complet de la séance (logbook perso uniquement). */
  recapHref?: string;
}) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);

  const totalSets = dedupeSessionSets(session.sets).length;
  const prCount = countSessionPRs(session.sets);

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#890404]/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white truncate">
              {session.day_label}
            </p>
            {prCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25 flex-shrink-0">
                🏆 {prCount}{" "}{t("PR")}
              </span>
            )}
          </div>
          <p className="text-[10px] text-[#F5EDED]/35 mt-0.5">
            {new Intl.DateTimeFormat("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "long",
            }).format(new Date(session.session_date + "T12:00:00"))}
            {session.duration_minutes != null && ` · ${session.duration_minutes} min`}
            {` · ${totalSets} sets`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {session.general_feeling != null && (
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i < (session.general_feeling ?? 0) ? "bg-[#E01E1E]" : "bg-[#F5EDED]/15"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[8px] text-[#F5EDED]/25 uppercase tracking-wider">
                {t("feeling")}
              </span>
            </div>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-[#F5EDED]/30" />
          ) : (
            <ChevronDown size={14} className="text-[#F5EDED]/30" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#890404]/15 px-4 py-3 space-y-3">
          {/* Feeling row */}
          {/* != null plutôt qu'un test de vérité : une note à 0 aurait
              affiché un "0" isolé à la place de la ligne. */}
          {(session.general_feeling != null || session.energy_level != null || session.pump != null) && (
            <div className="flex gap-4">
              {session.general_feeling != null && (
                <div>
                  <p className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider mb-0.5">{t("Feeling")}</p>
                  <FeelingDots value={session.general_feeling} />
                </div>
              )}
              {session.energy_level != null && (
                <div>
                  <p className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider mb-0.5">{t("Énergie")}</p>
                  <FeelingDots value={session.energy_level} />
                </div>
              )}
              {session.pump != null && (
                <div>
                  <p className="text-[8px] text-[#F5EDED]/30 uppercase tracking-wider mb-0.5">{t("Pump")}</p>
                  <FeelingDots value={session.pump} />
                </div>
              )}
            </div>
          )}

          {session.notes && (
            <p className="text-xs text-[#F5EDED]/50 italic leading-relaxed whitespace-pre-wrap break-words">
              {session.notes}
            </p>
          )}

          <SessionSetsBreakdown sets={session.sets} />

          {recapHref && (
            <Link
              href={recapHref}
              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#E01E1E]/80 hover:text-[#E01E1E] transition-colors"
            >
              {t("Ouvrir le récap")}
              <ChevronRight size={12} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
