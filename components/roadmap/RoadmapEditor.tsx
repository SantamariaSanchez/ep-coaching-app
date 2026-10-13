"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useEffect, useMemo, useState } from "react";
import { Save, Eye, EyeOff, AlertCircle, AlertTriangle, RotateCw } from "lucide-react";
import RoadmapCalendar from "@/components/roadmap/RoadmapCalendar";
import QuickRoadmapForm from "@/components/roadmap/QuickRoadmapForm";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import type { Roadmap, RoadmapPhase, RoadmapObjective } from "@/utils/roadmap";
import { validateRoadmapInput } from "@/lib/roadmap-validation";
import { todayInParis } from "@/lib/dates";

// ── Local form types ──────────────────────────────────────────────────────────

interface PhaseForm extends Omit<RoadmapPhase, "id" | "roadmap_id"> {
  localId: string;
}

interface ObjectiveForm extends Omit<RoadmapObjective, "id" | "roadmap_id"> {
  localId: string;
}

// ── Editor body — shared by the coach editor and the client self-serve editor ──

export default function RoadmapEditor({
  clientId,
  onSaved,
}: {
  clientId: string;
  /** Appelé après une sauvegarde réussie (ex. router.refresh() pour le pilote de phase). */
  onSaved?: () => void;
}) {
  const tr = useT();
  const [loading, setLoading] = useState(true);
  // Repasse "petit détail utile" (2026-09-10) : sans ça, un échec réseau au
  // chargement laissait existingRoadmap à null exactement comme "pas encore
  // de roadmap" — affichant le formulaire de CRÉATION à un coach dont le
  // client a pourtant déjà une roadmap, avec le risque d'en créer une
  // deuxième en double sans s'en rendre compte.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Passe à true au premier clic sur "Sauvegarder" : les erreurs de
  // validation s'affichent alors même si la période n'est pas encore saisie.
  const [saveAttempted, setSaveAttempted] = useState(false);
  // Vue globale visible par defaut — avant, la vraie vision multi-mois
  // (blocs de phase sur les semaines) etait cachee derriere un toggle et
  // seule la liste plate des cartes de phase etait visible d'emblee.
  const [showCalendar, setShowCalendar] = useState(true);
  const [existingRoadmap, setExistingRoadmap] = useState<Roadmap | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [phases, setPhases] = useState<PhaseForm[]>([]);
  const [objectives, setObjectives] = useState<ObjectiveForm[]>([]);


  // Audit 2026-09-28 : r.ok n'était pas vérifié. Un 403 ou un 500 renvoyait
  // { error } et donc data.roadmap undefined : l'éditeur affichait le
  // formulaire de CRÉATION vide, et l'enregistrer écrasait la vraie road map
  // (la route GET répond maintenant 500 sur une panne base au lieu de
  // { roadmap: null }). Toute réponse non OK est une erreur de chargement.
  useEffect(() => {
    fetch(`/api/roadmap/${clientId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`GET /api/roadmap ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (data.roadmap) {
          setExistingRoadmap(data.roadmap);
          setStartDate(data.roadmap.start_date);
          setEndDate(data.roadmap.end_date);
          setPhases(
            (data.phases ?? []).map((p: RoadmapPhase) => ({ ...p, localId: p.id }))
          );
          setObjectives(
            (data.objectives ?? []).map((o: RoadmapObjective) => ({ ...o, localId: o.id }))
          );
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error("RoadmapEditor load error:", e);
        setLoadError(true);
        setLoading(false);
      });
  }, [clientId, reloadKey]);

  function retryLoad() {
    setLoading(true);
    setLoadError(false);
    setReloadKey((k) => k + 1);
  }

  // Validation (lib/roadmap-validation.ts, la même que la route POST) :
  // avant, deux phases qui se chevauchaient étaient enregistrées et l'une
  // disparaissait du calendrier sans un mot. Calculée en direct pour que les
  // chevauchements se voient pendant la saisie, pas seulement au clic.
  const issues = useMemo(
    () => validateRoadmapInput({ start_date: startDate, end_date: endDate, phases, objectives }),
    [startDate, endDate, phases, objectives]
  );
  // Sur un formulaire de création encore vide, "renseigne les dates" dès
  // l'ouverture serait du bruit : on attend que la période soit saisie ou
  // qu'un enregistrement soit tenté.
  const showIssues = saveAttempted || (!!startDate && !!endDate);

  async function handleSave() {
    setSaveError(null);
    setSaveAttempted(true);
    if (issues.errors.length > 0) {
      setSaveError("Corrige les points signalés ci-dessus avant d'enregistrer.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/roadmap/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          phases: phases.map(({ localId: _l, ...p }) => p),
          objectives: objectives.map(({ localId: _l, ...o }) => o),
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; roadmapId?: string; error?: string } | null;
      if (res.ok && data?.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Avant, existingRoadmap restait null après la toute première
        // sauvegarde : l'écran restait en mode création. On bascule sur la
        // vue d'ensemble, avec les dates tout juste enregistrées.
        setExistingRoadmap((prev) => ({
          id: data.roadmapId ?? prev?.id ?? "",
          client_id: clientId,
          created_by: prev?.created_by ?? null,
          start_date: startDate,
          end_date: endDate,
          created_at: prev?.created_at ?? "",
          updated_at: new Date().toISOString(),
        }));
        onSaved?.();
      } else {
        setSaveError(data?.error ?? `Erreur de sauvegarde (code ${res.status}). Réessaie.`);
      }
    } catch (e) {
      console.error(e);
      setSaveError("Connexion perdue pendant la sauvegarde : recharge la page pour vérifier ce qui a été enregistré, puis réessaie si besoin.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div>
        <div style={{ animation: "shimmer 1.5s ease infinite", background: "var(--ep-s3)", borderRadius: 12, height: 40, marginBottom: 16 }} />
        <div style={{ animation: "shimmer 1.5s ease infinite", background: "var(--ep-s3)", borderRadius: 12, height: 200 }} />
      </div>
    );
  }

  if (loadError) {
    // Texte neutre (lu par un membre, par le fondateur sur sa propre road
    // map ou par un coach) et SANS formulaire : rien ne doit pouvoir être
    // enregistré par-dessus une road map qu'on n'a pas réussi à lire.
    return (
      <div role="alert" className="ep-card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <AlertCircle size={18} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
        <p style={{ fontSize: 12.5, color: "rgba(var(--ep-ink-rgb),0.55)", lineHeight: 1.6, margin: 0, flex: "1 1 220px" }}>
          {tr("Impossible de charger la road map pour l'instant. Ne modifie rien avant de recharger : si une road map existe déjà, l'enregistrer maintenant l'écraserait.")}
        </p>
        <button
          type="button"
          onClick={retryLoad}
          className="ep-btn-secondary"
          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
        >
          <RotateCw size={13} />{" "}{tr("Réessayer")}
        </button>
      </div>
    );
  }

  const calendarRoadmap: Roadmap = existingRoadmap ?? {
    id: "preview",
    client_id: clientId,
    created_by: null,
    start_date: startDate,
    end_date: endDate,
    created_at: "",
    updated_at: "",
  };

  // Retour direct 2026-09-02 : "si je vais sur roadmap je veux pas le truc
  // de creation mais juste la roadmap" — dès qu'une roadmap existe déjà, la
  // vue d'ensemble (calendrier) passe en premier et devient ce qu'on voit en
  // ouvrant l'onglet ; le formulaire dates/phases/objectifs passe dans un
  // bloc repliable en dessous (même schéma que "Changer de programme").
  // Rien à cacher tant qu'il n'y a encore aucune roadmap : le formulaire de
  // création doit alors rester visible directement, il n'y a rien d'autre à
  // montrer.
  const hasRoadmap = !!existingRoadmap;

  const editForm = (
    <>
      <QuickRoadmapForm
        startDate={startDate}
        phases={phases}
        objectives={objectives}
        today={todayInParis()}
        onChange={(next) => {
          setStartDate(next.startDate);
          setEndDate(next.endDate);
          setPhases(next.phases);
          setObjectives(next.objectives);
        }}
      />

      {/* Points de validation : erreurs (bloquantes) puis avertissements */}
      {showIssues && (issues.errors.length > 0 || issues.warnings.length > 0) && (
        <div
          role={saveAttempted && issues.errors.length > 0 ? "alert" : undefined}
          style={{
            marginTop: 24,
            background: issues.errors.length > 0 ? "rgba(var(--ep-accent-rgb),0.07)" : "rgba(var(--ep-warn-rgb),0.06)",
            border: `1px solid ${issues.errors.length > 0 ? "rgba(var(--ep-accent-rgb),0.25)" : "rgba(var(--ep-warn-rgb),0.25)"}`,
            borderRadius: 10,
            padding: "12px 14px",
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: issues.errors.length > 0 ? "var(--ep-accent)" : "var(--ep-warn)", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={12} />
            {issues.errors.length > 0 ? tr("À corriger avant d'enregistrer") : tr("À vérifier (n'empêche pas d'enregistrer)")}
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {issues.errors.map((m, i) => (
              <li key={`e-${i}`} style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--ep-pink)", overflowWrap: "anywhere" }}>{m}</li>
            ))}
            {issues.warnings.map((m, i) => (
              <li key={`w-${i}`} style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(var(--ep-warn-rgb),0.85)", overflowWrap: "anywhere" }}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Save footer */}
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {saveError && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(var(--ep-accent-rgb),0.08)", border: "1px solid rgba(var(--ep-accent-rgb),0.25)",
              borderRadius: 8, padding: "10px 14px",
            }}
          >
            <AlertCircle size={13} style={{ color: "var(--ep-accent)", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: "var(--ep-pink)" }}>{tr(saveError)}</p>
          </div>
        )}
        <button onClick={handleSave} disabled={saving} className="ep-btn-primary" style={{ fontSize: 14, padding: "14px 32px" }}>
          <Save size={16} />
          {saved ? tr("Sauvegardé !") : saving ? tr("Sauvegarde en cours…") : tr("Sauvegarder la road map")}
        </button>
      </div>
    </>
  );

  return (
    <div>
      {hasRoadmap && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 20 }}>
            <button
              onClick={() => setShowCalendar((v) => !v)}
              className="ep-btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}
            >
              {showCalendar ? <EyeOff size={14} /> : <Eye size={14} />}
              {showCalendar ? tr("Masquer la vue d'ensemble") : tr("Vue d'ensemble")}
            </button>
          </div>

          {showCalendar && startDate && endDate && (
            <section style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(var(--ep-accent-rgb),0.6)", marginBottom: 12 }}>
                {tr("Ma roadmap : les phases sur les mois et les semaines")}
              </p>
              <div className="ep-card" style={{ padding: 20 }}>
                <RoadmapCalendar
                  roadmap={calendarRoadmap}
                  phases={phases.map((p, i) => ({ ...p, id: p.localId, roadmap_id: "", position: i }))}
                  objectives={objectives.map((o) => ({ ...o, id: o.localId, roadmap_id: "" }))}
                  clientId={clientId}
                />
              </div>
            </section>
          )}

          <CollapsibleSection title={tr("Modifier ma roadmap")} defaultOpen={false}>
            {editForm}
          </CollapsibleSection>
        </>
      )}

      {!hasRoadmap && editForm}
    </div>
  );
}
