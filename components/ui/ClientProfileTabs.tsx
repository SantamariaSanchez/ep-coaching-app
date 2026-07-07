"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "./Card";
import type { Profile } from "@/utils/auth";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { PHASE_COLORS, OBJECTIVE_TERM_COLORS } from "@/lib/roadmap-colors";
import { ExternalLink } from "lucide-react";
import SubscriptionToggle from "./SubscriptionToggle";

const TABS = [
  { key: "profil",    label: "Profil" },
  { key: "roadmap",   label: "Road Map" },
  { key: "logbook",   label: "Logbook" },
  { key: "programme", label: "Programme" },
  { key: "nutrition", label: "Nutrition" },
  { key: "bilans",    label: "Bilans" },
  { key: "photos",    label: "Photos" },
  { key: "notes",     label: "Notes" },
  { key: "checkins",  label: "Check-ins" },
  { key: "rappels",   label: "Rappels" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35">
        {label}
      </span>
      <span className="text-sm text-white font-medium">{value || "—"}</span>
    </div>
  );
}

interface RoadmapData {
  roadmap: Roadmap;
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
}

export default function ClientProfileTabs({ client }: { client: Profile }) {
  const [activeTab, setActiveTab] = useState<TabKey>("profil");
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [roadmapLoading, setRoadmapLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/roadmap/${client.id}`)
      .then((r) => r.json())
      .then((data) => setRoadmapData(data.roadmap ? data : null))
      .catch(() => setRoadmapData(null))
      .finally(() => setRoadmapLoading(false));
  }, [client.id]);

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b border-[#890404]/20 pb-0">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors rounded-t-lg -mb-px ${
              activeTab === key
                ? "text-[#E01E1E] border-b-2 border-[#E01E1E]"
                : "text-[#F5EDED]/40 hover:text-[#F5EDED]/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profil" && (
        <div className="space-y-4">
          <SubscriptionToggle
            clientId={client.id}
            currentStatus={client.subscription_status}
          />

          <Card title="Informations personnelles">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Nom complet" value={client.full_name} />
              <InfoRow label="Email" value={client.email} />
              <InfoRow label="Téléphone" value={client.phone} />
              <InfoRow
                label="Statut"
                value={
                  client.status === "active"
                    ? "Actif"
                    : client.status === "paused"
                    ? "En pause"
                    : "Terminé"
                }
              />
            </div>
          </Card>

          <Card title="Suivi">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <InfoRow
                label="Date de début"
                value={formatDate(client.start_date)}
              />
              <InfoRow
                label="Poids de départ"
                value={
                  client.weight_start ? `${client.weight_start} kg` : null
                }
              />
            </div>
          </Card>

          {client.goal && (
            <Card title="Objectif">
              <p className="text-sm text-[#F5EDED]/80 leading-relaxed">
                {client.goal}
              </p>
            </Card>
          )}
        </div>
      )}

      {activeTab === "roadmap" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">Road Map client</p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/roadmap`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
            >
              <ExternalLink size={12} />
              {roadmapData ? "Modifier" : "Configurer"}
            </Link>
          </div>

          {roadmapLoading ? (
            <Card>
              <div className="flex items-center justify-center py-8">
                <p className="text-xs text-[#F5EDED]/40">Chargement…</p>
              </div>
            </Card>
          ) : !roadmapData ? (
            <Card>
              <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
                <p className="text-xs text-[#F5EDED]/40">
                  Clique sur &laquo; Configurer &raquo; pour créer la road map de ce client.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card title="Période">
                <p className="text-sm text-white font-medium">
                  {formatDate(roadmapData.roadmap.start_date)} → {formatDate(roadmapData.roadmap.end_date)}
                </p>
              </Card>

              {roadmapData.phases.length > 0 && (
                <Card title="Phases">
                  <div className="flex flex-col gap-2">
                    {roadmapData.phases.map((phase) => {
                      const colors = PHASE_COLORS[phase.type as keyof typeof PHASE_COLORS] ?? PHASE_COLORS.custom;
                      return (
                        <div
                          key={phase.id}
                          className="flex items-center justify-between rounded-lg px-3 py-2"
                          style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                        >
                          <span className="text-sm font-semibold" style={{ color: colors.solid }}>
                            {colors.icon} {phase.label}
                          </span>
                          <span className="text-xs text-[#F5EDED]/40">
                            {formatDate(phase.start_date)} → {formatDate(phase.end_date)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {roadmapData.objectives.length > 0 && (
                <Card title="Objectifs">
                  <div className="flex flex-col gap-2">
                    {roadmapData.objectives.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex items-center justify-between rounded-lg px-3 py-2"
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          border: `1px solid ${obj.is_achieved ? "rgba(74,222,128,0.3)" : "rgba(224,30,30,0.15)"}`,
                        }}
                      >
                        <span
                          className="text-sm font-semibold"
                          style={{ color: obj.is_achieved ? "#4ade80" : OBJECTIVE_TERM_COLORS[obj.term] }}
                        >
                          {obj.is_achieved ? "✓ " : ""}{obj.label}
                          {obj.target_value ? ` — ${obj.target_value}${obj.target_unit ?? ""}` : ""}
                        </span>
                        <span className="text-xs text-[#F5EDED]/40">{formatDate(obj.target_date)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "logbook" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Logbook d&apos;entraînement
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/logbook`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir le logbook
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "programme" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Programme d&apos;entraînement
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/program`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir le programme
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "bilans" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Bilans quotidiens
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/bilan`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir les bilans
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "photos" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Suivi photos &amp; posing
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/photos`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir les photos
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "notes" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Journal de suivi
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/notes`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir les notes
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "checkins" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Historique des check-ins
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/checkins`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir les check-ins
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "rappels" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Rappels & messages de motivation
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/tasks`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Gérer les rappels
            </Link>
          </div>
        </Card>
      )}

      {activeTab === "nutrition" && (
        <Card>
          <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
            <p className="text-xs text-[#F5EDED]/40 uppercase tracking-widest font-semibold">
              Plan nutritionnel
            </p>
            <Link
              href={`/dashboard/coach/clients/${client.id}/nutrition`}
              className="inline-flex items-center gap-2 bg-[#E01E1E] hover:bg-[#B00202] text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-lg transition-colors"
            >
              <ExternalLink size={13} />
              Voir la nutrition
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
