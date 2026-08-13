"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Search, X } from "lucide-react";
import type { Profile } from "@/utils/auth";
// Import "type" uniquement : purement effacé à la compilation, donc sans
// risque même si lib/coaching-phase.ts importe du code serveur ailleurs
// dans le fichier (même précédent que les imports de type déjà présents
// dans ClientProfileTabs.tsx depuis des modules serveur comme utils/nutrition).
import type { CoachingPhaseSummary } from "@/lib/coaching-phase";
// Module pur (aucun import serveur) : sûr depuis un Client Component.
import { PHASE_LABELS } from "@/lib/coaching-phase-helpers";
import type { ClientActivity } from "@/lib/client-activity";
import { ClientCard } from "./ClientCard";

// Silencieux depuis 5 jours ou plus (ou jamais vu sur la fenêtre regardée) —
// même seuil pour le filtre "Inactifs" et pour le point de couleur affiché
// sur chaque carte, voir ClientCard.
const SILENT_THRESHOLD_DAYS = 5;
function isSilent(days: number | null | undefined): boolean {
  return days == null || days >= SILENT_THRESHOLD_DAYS;
}

// Semaine de coaching en cours, calculée depuis start_date (déjà chargé avec
// le profil, aucune requête supplémentaire) — même logique que le calcul
// utilisé sur la page de profil client (weeksSince).
function weekNumber(startDate: string | null): number | null {
  if (!startDate) return null;
  const weeks = Math.floor(
    (Date.now() - new Date(startDate + "T12:00:00").getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return weeks >= 0 ? weeks + 1 : null;
}

// Recherche insensible à la casse ET aux accents : taper "jerome" doit
// trouver "Jérôme".
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

type FilterKey = "all" | "alerts" | "paused" | "new" | "silent";
type SortKey = "name" | "recent" | "alerts" | "seniority";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "alerts", label: "À traiter" },
  { key: "silent", label: "Inactifs" },
  { key: "new", label: "Nouveaux" },
  { key: "paused", label: "En pause" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Ordre alphabétique" },
  { key: "alerts", label: "Alertes en premier" },
  { key: "recent", label: "Arrivés récemment" },
  { key: "seniority", label: "Les plus anciens" },
];

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: "6px 13px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: "pointer",
  whiteSpace: "nowrap",
  transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.12s var(--ep-ease-out)",
  background: active ? "rgba(224,30,30,0.14)" : "rgba(245,237,237,0.04)",
  border: active ? "1px solid rgba(224,30,30,0.35)" : "1px solid rgba(137,4,4,0.25)",
  color: active ? "#E01E1E" : "rgba(245,237,237,0.45)",
});

export default function ClientsSection({
  clients,
  ouraEligibleIds = [],
  phaseOverview = {},
  activity = {},
}: {
  clients: Profile[];
  ouraEligibleIds?: string[];
  phaseOverview?: Record<string, CoachingPhaseSummary>;
  activity?: Record<string, ClientActivity>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const alertCount = (id: string) => phaseOverview[id]?.suggestionCount ?? 0;

  // Un client "nouveau" = moins de 4 semaines de coaching : c'est la période
  // où il a le plus besoin d'attention, et celle où le coach veut pouvoir
  // isoler sa liste d'un geste.
  const isNew = (c: Profile) => {
    const w = weekNumber(c.start_date);
    return w != null && w <= 4;
  };

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    const filtered = clients.filter((c) => {
      if (q && !normalize(c.full_name ?? "").includes(q)) return false;
      if (filter === "alerts") return alertCount(c.id) > 0;
      if (filter === "silent") return isSilent(activity[c.id]?.daysSinceActivity);
      if (filter === "paused") return c.status === "paused" || c.status === "ended";
      if (filter === "new") return isNew(c);
      return true;
    });

    const byName = (a: Profile, b: Profile) =>
      (a.full_name ?? "").localeCompare(b.full_name ?? "", "fr");
    const startTime = (c: Profile) =>
      c.start_date ? new Date(c.start_date + "T12:00:00").getTime() : 0;

    return [...filtered].sort((a, b) => {
      if (sort === "alerts") {
        const diff = alertCount(b.id) - alertCount(a.id);
        return diff !== 0 ? diff : byName(a, b);
      }
      if (sort === "recent") return startTime(b) - startTime(a) || byName(a, b);
      if (sort === "seniority") {
        // Les clients sans date de départ passent en dernier plutôt que de
        // remonter en tête avec un timestamp à 0.
        const at = startTime(a) || Infinity;
        const bt = startTime(b) || Infinity;
        return at - bt || byName(a, b);
      }
      return byName(a, b);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, phaseOverview, activity, query, filter, sort]);

  const totalAlerts = clients.reduce((sum, c) => sum + alertCount(c.id), 0);
  // La barre d'outils n'a de sens qu'à partir de quelques clients : en
  // dessous, la liste tient à l'écran et chercher n'apporte rien.
  const showToolbar = clients.length > 3;

  return (
    <>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <span className="ep-section-title" style={{ marginBottom: 2 }}>Mes clients</span>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            {visible.length === clients.length
              ? `${clients.length} client${clients.length !== 1 ? "s" : ""}`
              : `${visible.length} sur ${clients.length}`}
            {totalAlerts > 0 && (
              <span style={{ color: "rgba(224,30,30,0.75)", fontWeight: 700 }}>
                {" "}&nbsp;·&nbsp; {totalAlerts} point{totalAlerts !== 1 ? "s" : ""} à traiter
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Barre d'outils : chercher, filtrer, trier. Avant, la seule façon de
          retrouver un client était de parcourir la grille à l'œil. */}
      {showToolbar && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 200 }}>
              <Search
                size={14}
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(245,237,237,0.28)" }}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher un client"
                aria-label="Chercher un client"
                style={{
                  width: "100%",
                  background: "#150000",
                  border: "1px solid rgba(137,4,4,0.3)",
                  borderRadius: 10,
                  padding: "9px 32px 9px 34px",
                  fontSize: 13,
                  color: "#F5EDED",
                  outline: "none",
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Effacer la recherche"
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "rgba(245,237,237,0.35)", display: "flex", padding: 0,
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Trier les clients"
              style={{
                background: "#150000",
                border: "1px solid rgba(137,4,4,0.3)",
                borderRadius: 10,
                padding: "9px 12px",
                fontSize: 12.5,
                color: "rgba(245,237,237,0.75)",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {FILTERS.map((f) => {
              const count =
                f.key === "all" ? clients.length
                : f.key === "alerts" ? clients.filter((c) => alertCount(c.id) > 0).length
                : f.key === "silent" ? clients.filter((c) => isSilent(activity[c.id]?.daysSinceActivity)).length
                : f.key === "paused" ? clients.filter((c) => c.status === "paused" || c.status === "ended").length
                : clients.filter(isNew).length;
              return (
                <button key={f.key} onClick={() => setFilter(f.key)} className="ep-press" style={chipStyle(filter === f.key)}>
                  {f.label} {count > 0 && <span style={{ opacity: 0.65 }}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {clients.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
            border: "1px solid var(--ep-border)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "rgba(224,30,30,0.1)",
              border: "1px solid rgba(224,30,30,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Users size={24} style={{ color: "rgba(224,30,30,0.6)" }} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#F5EDED", margin: "0 0 6px" }}>
            Aucun client pour l&apos;instant
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            Les clients s&apos;inscrivent eux-mêmes depuis l&apos;appli, ils apparaîtront ici. Il ne te reste
            plus qu&apos;à activer leur coaching.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div
          style={{
            padding: "36px 24px",
            background: "linear-gradient(160deg, #180101 0%, #0d0000 100%)",
            border: "1px dashed rgba(137,4,4,0.35)",
            borderRadius: "var(--radius-lg)",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,237,237,0.55)", margin: "0 0 4px" }}>
            Aucun client ne correspond
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,237,0.3)", margin: 0 }}>
            Change de filtre ou vide la recherche pour revoir toute la liste.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {visible.map((client, i) => {
            const summary = phaseOverview[client.id];
            return (
              <ClientCard
                key={client.id}
                name={client.full_name ?? "Sans nom"}
                phase={null}
                weight={client.weight_start}
                weekNum={weekNumber(client.start_date)}
                delay={Math.min(i, 12) * 45}
                href={`/dashboard/coach/clients/${client.id}`}
                onClick={() => router.push(`/dashboard/coach/clients/${client.id}`)}
                ouraEligible={ouraEligibleIds.includes(client.id)}
                // Phase de coaching en cours, visible sans ouvrir la fiche.
                coachingPhase={summary ? PHASE_LABELS[summary.phase.phase] : null}
                status={client.status}
                // Nombre de suggestions de phase de coaching en attente
                // (décrochage, prêt à changer de phase...) — voir
                // lib/coaching-phase.ts, jamais affiché côté client.
                alerts={summary?.suggestionCount ?? 0}
                // Silence depuis combien de temps (entraînement/nutrition/
                // bilan) — distinct des suggestions de phase ci-dessus.
                daysSinceActivity={activity[client.id]?.daysSinceActivity ?? null}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
