"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Video, Users, MessageCircle, Clock, Trash2, Ban, User } from "lucide-react";
import { LIVE_TYPE_LABELS, type LiveEvent } from "@/lib/live-types";

const TYPE_ICONS = {
  "1to1": User,
  webinaire: Video,
  qna: MessageCircle,
} as const;

function formatDateTime(iso: string): string {
  const s = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  onCancel,
  onDelete,
}: {
  event: LiveEvent;
  basePath: string;
  isCoach: boolean;
  onCancel?: () => void;
  onDelete?: () => void;
}) {
  const { canJoin, isPast, isSoon } = useJoinWindow(event.starts_at, event.duration_minutes);
  const Icon = TYPE_ICONS[event.type];
  const cancelled = event.status === "cancelled";

  return (
    <div className={`bg-[#1f0101] border rounded-xl p-4 ${cancelled ? "border-[#890404]/10 opacity-50" : "border-[#890404]/20"}`}>
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
          {event.type === "1to1" && event.invited_client_name && (
            <p className="text-[11px] text-[#F5EDED]/30 flex items-center gap-1.5 mt-0.5">
              <Users size={11} /> Avec {event.invited_client_name}
            </p>
          )}
          {event.description && (
            <p className="text-xs text-[#F5EDED]/55 mt-2">{event.description}</p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {!cancelled && !isPast && (
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
        </div>
      </div>
    </div>
  );
}
