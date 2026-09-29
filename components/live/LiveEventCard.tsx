"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Users, Clock, Trash2, Ban, Pencil, Check, FileText, GraduationCap, AlertCircle,
} from "lucide-react";
import { LIVE_TYPE_LABELS, isOneToOneType, type LiveEvent } from "@/lib/live-types";
import { LIVE_TYPE_ICONS } from "@/components/live/live-icons";
import type { UpdateLiveEventInput } from "@/app/dashboard/coach/live/actions";
import LiveEditForm from "@/components/live/LiveEditForm";
import { capitalize, formatLiveDateTime } from "@/lib/live-time";

// Fuseau Europe/Paris fixé : sans lui, la carte était rendue en UTC côté
// serveur puis réhydratée à l'heure locale du navigateur (horaire qui
// saute de 2 h au chargement, et écart d'hydratation React).
function formatDateTime(iso: string): string {
  return capitalize(formatLiveDateTime(iso));
}

function useJoinWindow(startsAt: string, durationMinutes: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const start = new Date(startsAt).getTime();
  const joinOpensAt = start - 10 * 60 * 1000;
  const joinClosesAt = start + durationMinutes * 60 * 1000 + 30 * 60 * 1000;
  const canJoin = now >= joinOpensAt && now <= joinClosesAt;
  const isPast = now > joinClosesAt;
  const isSoon = !canJoin && now < joinOpensAt && joinOpensAt - now < 60 * 60 * 1000;

  return { canJoin, isPast, isSoon };
}

export default function LiveEventCard({
  event,
  basePath,
  isCoach,
  clients,
  onCancel,
  onDelete,
  onUpdate,
  onToggleRsvp,
  onSaveRecap,
  autoOpenRecap = false,
}: {
  event: LiveEvent;
  basePath: string;
  isCoach: boolean;
  clients?: { id: string; full_name: string | null }[];
  onCancel?: () => void;
  onDelete?: () => void;
  onUpdate?: (id: string, input: UpdateLiveEventInput) => Promise<{ error?: string }>;
  onToggleRsvp?: (id: string) => Promise<{ error?: string; rsvped?: boolean }>;
  onSaveRecap?: (id: string, recap: string) => Promise<{ error?: string }>;
  /** Le coach revient de "Terminer le live" : la saisie des notes s'ouvre directement. */
  autoOpenRecap?: boolean;
}) {
  const { canJoin, isPast, isSoon } = useJoinWindow(event.starts_at, event.duration_minutes);
  const Icon = LIVE_TYPE_ICONS[event.type];
  const cancelled = event.status === "cancelled";
  const ended = isPast || event.status === "ended";
  const [editing, setEditing] = useState(false);
  const [rsvped, setRsvped] = useState(!!event.has_rsvped);
  const [rsvpCount, setRsvpCount] = useState(event.rsvp_count ?? 0);
  const [rsvpPending, startRsvpTransition] = useTransition();
  const [editingRecap, setEditingRecap] = useState(autoOpenRecap && isCoach && !!onSaveRecap);
  const [recapDraft, setRecapDraft] = useState(event.recap ?? "");
  const [savingRecap, startRecapTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Retour de la salle après "Terminer le live" : on amène la carte à
  // l'écran, la zone de notes est déjà ouverte (voir editingRecap).
  useEffect(() => {
    if (autoOpenRecap) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [autoOpenRecap]);

  function handleToggleRsvp() {
    if (!onToggleRsvp) return;
    setActionError(null);
    startRsvpTransition(async () => {
      try {
        const res = await onToggleRsvp(event.id);
        if (res.error) {
          setActionError(res.error);
        } else if (res.rsvped !== undefined) {
          setRsvped(res.rsvped);
          setRsvpCount((c) => (res.rsvped ? c + 1 : Math.max(0, c - 1)));
        }
      } catch {
        setActionError("Action impossible pour le moment, réessaie.");
      }
    });
  }

  function handleSaveRecap() {
    if (!onSaveRecap) return;
    setActionError(null);
    startRecapTransition(async () => {
      try {
        const res = await onSaveRecap(event.id, recapDraft);
        if (res.error) setActionError(res.error);
        else setEditingRecap(false);
      } catch {
        setActionError("Notes non enregistrées, réessaie.");
      }
    });
  }

  return (
    <div ref={cardRef} className={`bg-[#1f0101] border rounded-xl p-4 ${cancelled ? "border-[#890404]/10 opacity-50" : "border-[#890404]/20"}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E01E1E]/10 border border-[#E01E1E]/20 flex items-center justify-center flex-shrink-0">
          <Icon size={17} className="text-[#E01E1E]" strokeWidth={1.8} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{event.title}</p>
            <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-[#890404]/15 text-[#F5EDED]/55">
              {LIVE_TYPE_LABELS[event.type]}
            </span>
            {cancelled && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/25">
                Annulé
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#F5EDED]/40 mt-1 flex items-center gap-1.5">
            <Clock size={11} /> {formatDateTime(event.starts_at)} · {event.duration_minutes} min
          </p>
          {isOneToOneType(event.type) && event.invited_client_name && (
            <p className="text-[11px] text-[#F5EDED]/30 flex items-center gap-1.5 mt-0.5">
              <Users size={11} /> Avec {event.invited_client_name}
            </p>
          )}
          {event.guest_name && (
            <p className="text-[11px] text-[#F5EDED]/30 flex items-center gap-1.5 mt-0.5">
              <GraduationCap size={11} /> Avec {event.guest_name}
            </p>
          )}
          {event.description && (
            <p className="text-xs text-[#F5EDED]/55 mt-2">{event.description}</p>
          )}

          {!isOneToOneType(event.type) && !cancelled && !ended && (
            <div className="mt-2.5">
              {isCoach ? (
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-[#F5EDED]/40">
                  <Users size={11} /> {rsvpCount} inscrit{rsvpCount !== 1 ? "s" : ""}
                </span>
              ) : onToggleRsvp ? (
                <button
                  onClick={handleToggleRsvp}
                  disabled={rsvpPending}
                  className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                    rsvped
                      ? "bg-green-500/10 text-green-400 border border-green-500/25"
                      : "bg-[#890404]/10 text-[#F5EDED]/45 border border-[#890404]/25 hover:text-white"
                  }`}
                >
                  {rsvped ? <Check size={11} /> : <Users size={11} />}
                  {rsvped ? "J'y serai" : "Confirmer ma présence"}
                  {rsvpCount > 0 && ` · ${rsvpCount}`}
                </button>
              ) : null}
            </div>
          )}

          {ended && !cancelled && (event.recap || isCoach) && (
            <div className="mt-2.5 bg-black/20 border border-[#890404]/15 rounded-lg p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30 flex items-center gap-1 mb-1.5">
                <FileText size={10} /> Notes du live
              </p>
              {editingRecap ? (
                <div className="space-y-1.5">
                  <textarea
                    value={recapDraft}
                    onChange={(e) => setRecapDraft(e.target.value)}
                    rows={3}
                    placeholder="Résumé, points clés, ressources partagées..." aria-label="Résumé, points clés, ressources partagées..."
                    className="w-full bg-black/30 border border-[#890404]/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#F5EDED]/20 focus:outline-none focus:border-[#E01E1E]/50 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveRecap}
                      disabled={savingRecap}
                      className="text-[10px] font-bold text-[#E01E1E] hover:text-[#ff4444]"
                    >
                      {savingRecap ? "..." : "Enregistrer"}
                    </button>
                    <button
                      onClick={() => setEditingRecap(false)}
                      className="text-[10px] font-bold text-[#F5EDED]/35 hover:text-[#F5EDED]/60"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : event.recap ? (
                <p className="text-xs text-[#F5EDED]/60 whitespace-pre-wrap">{event.recap}</p>
              ) : isCoach ? (
                <p className="text-[11px] text-[#F5EDED]/25 italic">Pas de notes pour l&apos;instant</p>
              ) : null}
              {isCoach && onSaveRecap && !editingRecap && (
                <button
                  onClick={() => setEditingRecap(true)}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#F5EDED]/35 hover:text-[#E01E1E] mt-1.5"
                >
                  <Pencil size={10} /> {event.recap ? "Modifier" : "Ajouter des notes"}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {/* Un live terminé ("Terminer le live") garde sa fenêtre horaire,
                mais sa salle renvoie une 404 (pages [id] : status "scheduled"
                exigé) : plus de bouton "Rejoindre" qui mène dans le vide. */}
            {!cancelled && !isPast && event.status === "scheduled" && (
              <Link
                href={canJoin ? `${basePath}/live/${event.id}` : "#"}
                aria-disabled={!canJoin}
                className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors ${
                  canJoin
                    ? "bg-[#E01E1E] hover:bg-[#B00202] text-white"
                    : "bg-[#890404]/10 text-[#F5EDED]/30 cursor-not-allowed pointer-events-none"
                }`}
              >
                {canJoin ? "Rejoindre" : isSoon ? "Ouvre bientôt" : "Pas encore ouvert"}
              </Link>
            )}
            {isCoach && !cancelled && (
              <>
                {onUpdate && !isPast && (
                  <button
                    onClick={() => setEditing((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#F5EDED]/35 hover:text-[#E01E1E] transition-colors"
                  >
                    <Pencil size={11} /> Modifier
                  </button>
                )}
                {onCancel && (
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#F5EDED]/35 hover:text-amber-400 transition-colors"
                  >
                    <Ban size={11} /> Annuler
                  </button>
                )}
              </>
            )}
            {isCoach && onDelete && (
              <button
                onClick={onDelete}
                className="flex items-center gap-1 text-[10px] font-bold text-[#F5EDED]/25 hover:text-red-400 transition-colors"
              >
                <Trash2 size={11} /> Supprimer
              </button>
            )}
          </div>

          {actionError && (
            <p role="alert" className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 mt-2">
              <AlertCircle size={11} className="flex-shrink-0" /> {actionError}
            </p>
          )}

          {editing && onUpdate && (
            <LiveEditForm
              event={event}
              clients={clients ?? []}
              onUpdate={onUpdate}
              onClose={() => setEditing(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
