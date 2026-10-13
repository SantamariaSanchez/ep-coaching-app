"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition, useEffect } from "react";
import { UserPlus, UserX, Check, Clock } from "lucide-react";
import { toggleAcceptingNewClients, markWaitlistContacted } from "@/app/dashboard/coach/profile/actions";
import type { WaitlistEntry } from "@/utils/waitlist";

// Item 45 : bascule "j'accepte de nouveaux clients" + liste d'attente de
// ceux qui veulent rejoindre dès qu'une place se libère.
export default function AcceptingClientsCard({
  initialAccepting,
  waitlist,
}: {
  initialAccepting: boolean;
  waitlist: WaitlistEntry[];
}) {
  const t = useT();
  const [accepting, setAccepting] = useState(initialAccepting);
  const [isPending, startTransition] = useTransition();
  const [contactedIds, setContactedIds] = useState<Set<string>>(
    new Set(waitlist.filter((w) => w.contacted_at).map((w) => w.id))
  );

  // MASTERCLASS.md Axe E : sans ça, un changement fait ailleurs (autre
  // onglet) restait invisible tant que le composant ne remontait pas.
  useEffect(() => {
    setAccepting(initialAccepting);
  }, [initialAccepting]);
  useEffect(() => {
    setContactedIds(new Set(waitlist.filter((w) => w.contacted_at).map((w) => w.id)));
  }, [waitlist]);

  function toggle() {
    const next = !accepting;
    const previous = accepting;
    setAccepting(next);
    startTransition(async () => {
      // MASTERCLASS.md Axe B : le résultat n'était jamais vérifié, un échec
      // serveur laissait la bascule affichée sur le mauvais état.
      const result = await toggleAcceptingNewClients(next);
      if (result.error) setAccepting(previous);
    });
  }

  function markContacted(id: string) {
    setContactedIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const result = await markWaitlistContacted(id);
      if (result.error) {
        setContactedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  }

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-(--ep-ink)/35 mb-1">
        {t("Capacité")}
      </p>
      <h2 className="text-xl font-black uppercase tracking-tight mb-4">{t("Nouveaux clients")}</h2>
      <div className="ep-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {accepting ? (
            <UserPlus size={18} style={{ color: "var(--ep-ok)", flexShrink: 0 }} />
          ) : (
            <UserX size={18} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--ep-ink)" }}>
              {accepting ? t("Tu acceptes de nouveaux clients") : t("Complet, liste d'attente active")}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.4)" }}>
              {accepting
                ? t("Désactive si tu es à capacité, les membres verront rejoindre une liste d'attente.")
                : t("Les membres non-clients voient un bouton pour rejoindre ta liste d'attente.")}
            </p>
          </div>
          <button
            type="button"
            onClick={toggle}
            disabled={isPending}
            role="switch"
            aria-checked={accepting}
            style={{
              flexShrink: 0, width: 40, height: 24, borderRadius: 999, border: "none", cursor: "pointer",
              background: accepting ? "var(--ep-ok)" : "rgba(var(--ep-ink-rgb),0.15)", position: "relative", transition: "background 0.15s ease",
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: accepting ? 19 : 3, width: 18, height: 18, borderRadius: "50%",
              background: "var(--ep-bg)", transition: "left 0.15s ease",
            }} />
          </button>
        </div>

        {waitlist.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(var(--ep-accent-rgb),0.12)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(var(--ep-ink-rgb),0.3)", marginBottom: 10 }}>
              {waitlist.length}{" "}{t("en attente")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {waitlist.map((entry) => {
                const contacted = contactedIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10,
                      background: "rgba(var(--ep-shade-rgb),0.25)", border: "1px solid rgba(var(--ep-accent-rgb),0.1)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "var(--ep-ink)" }}>
                        {entry.member_name ?? t("Sans nom")}
                      </p>
                      {entry.note && (
                        <p style={{ margin: "1px 0 0", fontSize: 11, color: "rgba(var(--ep-ink-rgb),0.4)" }}>{entry.note}</p>
                      )}
                    </div>
                    {contacted ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "var(--ep-ok)", flexShrink: 0 }}>
                        <Check size={12} />{" "}{t("Contacté")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markContacted(entry.id)}
                        style={{
                          flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                          fontSize: 10, fontWeight: 700, color: "rgba(var(--ep-ink-rgb),0.5)",
                          background: "none", border: "1px solid rgba(var(--ep-ink-rgb),0.2)", borderRadius: 8,
                          padding: "5px 9px", cursor: "pointer",
                        }}
                      >
                        <Clock size={11} />{" "}{t("Marquer contacté")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
