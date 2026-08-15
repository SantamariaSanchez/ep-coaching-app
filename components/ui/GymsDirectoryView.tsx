"use client";

import { useState, useMemo } from "react";
import { Search, Plus, X, Star, MapPin, Pencil, Trash2, Globe, Dumbbell, Pin } from "lucide-react";
import type { GymWithReviews } from "@/utils/gyms";
import type { CreateGymInput } from "@/app/dashboard/client/gyms/actions";
import type { GymType } from "@/lib/gyms-seed";
import { EQUIPMENT_TYPES, EQUIPMENT_TYPE_LABELS, type EquipmentType } from "@/lib/exercise-library-content";
import { safeExternalUrl } from "@/lib/sanitize";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

const GYM_TYPE_LABELS: Record<GymType, string> = {
  commerciale: "Commerciale",
  independante: "Indépendante",
  associative: "Associative",
};
const GYM_TYPE_OPTIONS: GymType[] = ["commerciale", "independante", "associative"];

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateStr));
}

// ── Star rating input ────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)} type="button">
          <Star size={18} className={n <= value ? "text-amber-400 fill-amber-400" : "text-[#F5EDED]/15"} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} className={n <= Math.round(value) ? "text-amber-400 fill-amber-400" : "text-[#F5EDED]/15"} />
      ))}
    </div>
  );
}

// ── Gym form (create / edit) ─────────────────────────────────────────────────

function GymForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: GymWithReviews;
  // MASTERCLASS.md Axe B : Promise<void> empêchait d'afficher une erreur
  // serveur ici malgré l'état `error` déjà présent dans ce formulaire.
  onSave: (input: CreateGymInput) => Promise<{ error?: string }>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [type, setType] = useState<GymType>(initial?.type ?? "independante");
  const [equipmentNotes, setEquipmentNotes] = useState(initial?.equipment_notes ?? "");
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>(initial?.equipment_types ?? []);
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleType(t: EquipmentType) {
    setEquipmentTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  async function handleSubmit() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError(null);
    const result = await onSave({
      name,
      city: city || null,
      address: address || null,
      equipment_notes: equipmentNotes || null,
      website: website || null,
      type,
      equipment_types: equipmentTypes,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <div>
        <label className={labelCls}>Nom de la salle</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Basic-Fit Lille Centre" aria-label="Nom de la salle" className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ville</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lille" aria-label="Lille" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Adresse (optionnel)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue…" aria-label="12 rue…" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Type de salle</label>
        <div className="flex gap-2">
          {GYM_TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                type === t ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
              }`}
            >
              {GYM_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={labelCls}>Type de matériel disponible (optionnel)</label>
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                equipmentTypes.includes(t)
                  ? "bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]"
                  : "border-[#890404]/25 text-[#F5EDED]/40"
              }`}
            >
              {EQUIPMENT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[9px] text-[#F5EDED]/25">
          Sert au filtre et au croisement avec la bibliothèque d&apos;exercices.
        </p>
      </div>
      <div>
        <label className={labelCls}>Équipement disponible (optionnel)</label>
        <textarea
          value={equipmentNotes}
          onChange={(e) => setEquipmentNotes(e.target.value)}
          rows={2}
          placeholder="Ex. Plateau powerlifting, beaucoup de machines, peu de fonte libre…" aria-label="Notes sur l'équipement"
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className={labelCls}>Site web (optionnel)</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" aria-label="https://…" className={inputCls} />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "Enregistrement…" : initial ? "Mettre à jour" : "Ajouter à l'annuaire"}
        </button>
        <button onClick={onCancel} aria-label="Annuler" className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Review form ───────────────────────────────────────────────────────────────

function ReviewForm({
  onSave,
  onCancel,
}: {
  onSave: (rating: number, comment: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  return (
    <div className="bg-[#150000] border border-[#890404]/25 rounded-lg p-3 space-y-2.5">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Ton avis (optionnel)…" aria-label="Ton avis (optionnel)…"
        className={`${inputCls} resize-none`}
      />
      <div className="flex gap-2">
        <button
          onClick={async () => { setSaving(true); await onSave(rating, comment); setSaving(false); }}
          disabled={saving}
          className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {saving ? "…" : "Publier l'avis"}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 rounded-lg">
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Gym card ──────────────────────────────────────────────────────────────────

function GymCard({
  gym,
  isCoach,
  currentUserId,
  matchingExerciseCount,
  isMyGym,
  onSetAsMyGym,
  onUpdate,
  onDelete,
  onReview,
  onDeleteReview,
}: {
  gym: GymWithReviews;
  isCoach: boolean;
  currentUserId: string;
  matchingExerciseCount: number | null;
  isMyGym: boolean;
  onSetAsMyGym?: () => Promise<void>;
  onUpdate: (input: CreateGymInput) => Promise<{ error?: string }>;
  onDelete: () => Promise<void>;
  onReview: (rating: number, comment: string) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [settingMyGym, setSettingMyGym] = useState(false);

  const myReview = gym.reviews.find((r) => r.author_id === currentUserId);

  if (editing) {
    return (
      <GymForm
        initial={gym}
        onSave={async (input) => {
          const result = await onUpdate(input);
          if (!result.error) setEditing(false);
          return result;
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const typeAccent =
    gym.type === "independante"
      ? { bg: "rgba(245,158,11,0.10)", border: "rgba(245,158,11,0.25)", text: "#fcd34d" }
      : gym.type === "associative"
      ? { bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.25)", text: "#86efac" }
      : { bg: "rgba(224,30,30,0.10)", border: "rgba(224,30,30,0.25)", text: "#E01E1E" };

  return (
    <div
      className={`bg-[#1f0101] border rounded-xl overflow-hidden flex flex-col h-full ${isMyGym ? "border-[#E01E1E]/50" : "border-[#890404]/20"}`}
    >
      {/* Bandeau coloré selon le type — donne à chaque carte une identité
          visuelle immédiate dans la grille, sans dépendre d'une photo de
          salle (donnée qu'on n'a pas). */}
      <div style={{ height: 4, background: typeAccent.text, opacity: 0.6 }} />
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-start gap-3 px-4 pt-4 pb-3 text-left flex-1">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border"
          style={{ background: typeAccent.bg, borderColor: typeAccent.border }}
        >
          <Dumbbell size={18} style={{ color: typeAccent.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-white leading-snug">{gym.name}</p>
          {gym.city && (
            <p className="inline-flex items-center gap-1 text-[10px] text-[#F5EDED]/40 mt-0.5">
              <MapPin size={10} /> {gym.city}
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            {isMyGym && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border bg-[#E01E1E]/15 border-[#E01E1E]/40 text-[#E01E1E]">
                <Pin size={9} /> Ta salle
              </span>
            )}
            {gym.type && (
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border"
                style={{ background: typeAccent.bg, borderColor: typeAccent.border, color: typeAccent.text }}
              >
                {GYM_TYPE_LABELS[gym.type]}
              </span>
            )}
            {gym.avgRating != null && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#F5EDED]/45">
                <StarDisplay value={gym.avgRating} /> {gym.avgRating} ({gym.reviews.length})
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-3">
          {gym.address && <p className="text-xs text-[#F5EDED]/50">{gym.address}</p>}
          {gym.equipment_types.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {gym.equipment_types.map((t) => (
                <span key={t} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border border-[#890404]/25 text-[#F5EDED]/45">
                  {EQUIPMENT_TYPE_LABELS[t]}
                </span>
              ))}
            </div>
          )}
          {matchingExerciseCount != null && (
            <p className="text-xs text-[#F5EDED]/40">
              <strong className="text-[#F5EDED]/70">{matchingExerciseCount}</strong> exercice{matchingExerciseCount !== 1 ? "s" : ""} de la
              bibliothèque réalisable{matchingExerciseCount !== 1 ? "s" : ""} avec ce matériel.
            </p>
          )}
          {!isCoach && onSetAsMyGym && !isMyGym && (
            <button
              onClick={async () => { setSettingMyGym(true); await onSetAsMyGym(); setSettingMyGym(false); }}
              disabled={settingMyGym}
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#E01E1E] disabled:opacity-50 transition-colors"
            >
              <Pin size={11} /> {settingMyGym ? "…" : "Marquer comme ma salle"}
            </button>
          )}
          {gym.equipment_notes && (
            <p className="text-xs text-[#F5EDED]/45 leading-relaxed italic">&ldquo;{gym.equipment_notes}&rdquo;</p>
          )}
          {gym.website && (
            <a href={safeExternalUrl(gym.website) ?? "#"} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E] hover:text-[#ff4444] transition-colors">
              <Globe size={11} /> Site web
            </a>
          )}

          <div className="border-t border-[#890404]/10 pt-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30">
              Avis ({gym.reviews.length})
            </p>
            {gym.reviews.map((r) => (
              <div key={r.id} className="bg-[#150000] border border-[#890404]/15 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StarDisplay value={r.rating} />
                    <span className="text-[10px] text-[#F5EDED]/30">{r.profiles?.full_name ?? "Membre"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[#F5EDED]/20">{formatDate(r.created_at)}</span>
                    {r.author_id === currentUserId && (
                      <button onClick={() => onDeleteReview(r.id)} className="text-[#F5EDED]/20 hover:text-red-400 transition-colors">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
                {r.comment && <p className="text-xs text-[#F5EDED]/55">{r.comment}</p>}
              </div>
            ))}

            {reviewing ? (
              <ReviewForm
                onSave={async (rating, comment) => { await onReview(rating, comment); setReviewing(false); }}
                onCancel={() => setReviewing(false)}
              />
            ) : (
              <button
                onClick={() => setReviewing(true)}
                className="text-[10px] font-bold uppercase tracking-widest text-[#E01E1E] hover:text-[#ff4444] transition-colors"
              >
                {myReview ? "Modifier mon avis" : "Laisser un avis"}
              </button>
            )}
          </div>

          {isCoach && (
            <div className="flex gap-2 pt-2 border-t border-[#890404]/10">
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors">
                <Pencil size={11} /> Modifier
              </button>
              {confirmDelete ? (
                <button onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest text-red-400">Confirmer</button>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/30 hover:text-red-400 transition-colors ml-auto">
                  <Trash2 size={11} /> Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

interface Props {
  gyms: GymWithReviews[];
  isCoach: boolean;
  currentUserId: string;
  createGym: (input: CreateGymInput) => Promise<{ error?: string; id?: string }>;
  updateGym: (id: string, input: CreateGymInput) => Promise<{ error?: string }>;
  deleteGym: (id: string) => Promise<{ error?: string }>;
  upsertGymReview: (gymId: string, rating: number, comment: string) => Promise<{ error?: string }>;
  deleteGymReview: (reviewId: string) => Promise<{ error?: string }>;
  // Nombre d'exercices de la bibliothèque par type de matériel — permet
  // d'afficher, par salle, combien d'exercices y sont réalisables sans
  // recharger toute la bibliothèque ici (calculé côté page, voir
  // utils/exercise-library.ts).
  exerciseTypeCounts?: Record<EquipmentType, number>;
  // "Ma salle" — coach uniquement en lecture (jamais affiché), côté client
  // ces deux props activent le bouton "Marquer comme ma salle" sur chaque
  // fiche (relié à client_intake.gym_name, voir app/dashboard/client/gyms/actions.ts).
  myGymName?: string | null;
  onSetMyGym?: (gymName: string, gymWebsite: string | null) => Promise<void>;
}

export default function GymsDirectoryView({
  gyms,
  isCoach,
  currentUserId,
  createGym,
  updateGym,
  deleteGym,
  upsertGymReview,
  deleteGymReview,
  exerciseTypeCounts,
  myGymName,
  onSetMyGym,
}: Props) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [activeType, setActiveType] = useState<GymType | null>(null);
  const [activeEquipment, setActiveEquipment] = useState<EquipmentType | null>(null);

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of gyms) if (g.type) map[g.type] = (map[g.type] ?? 0) + 1;
    return map;
  }, [gyms]);

  const equipmentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const g of gyms) for (const t of g.equipment_types) map[t] = (map[t] ?? 0) + 1;
    return map;
  }, [gyms]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return gyms.filter((g) => {
      if (activeType && g.type !== activeType) return false;
      if (activeEquipment && !g.equipment_types.includes(activeEquipment)) return false;
      if (!q) return true;
      return g.name.toLowerCase().includes(q) || (g.city ?? "").toLowerCase().includes(q);
    });
  }, [gyms, search, activeType, activeEquipment]);

  function matchingExerciseCount(gym: GymWithReviews): number | null {
    if (!exerciseTypeCounts || gym.equipment_types.length === 0) return null;
    return gym.equipment_types.reduce((sum, t) => sum + (exerciseTypeCounts[t] ?? 0), 0);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une salle ou une ville…" aria-label="Rechercher une salle ou une ville…" className={`${inputCls} pl-9`} />
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={13} /> {showCreate ? "Fermer" : "Ajouter une salle"}
        </button>
      </div>

      <p className="text-[10px] text-[#F5EDED]/25">
        {gyms.length} salle{gyms.length !== 1 ? "s" : ""} référencée{gyms.length !== 1 ? "s" : ""}, partage la tienne et note celles que tu connais.
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveType(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
            activeType === null ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
          }`}
        >
          Toutes ({gyms.length})
        </button>
        {GYM_TYPE_OPTIONS.filter((t) => typeCounts[t]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeType === t ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            {GYM_TYPE_LABELS[t]} ({typeCounts[t]})
          </button>
        ))}
      </div>

      {Object.keys(equipmentCounts).length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveEquipment(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
              activeEquipment === null ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
            }`}
          >
            Tout matériel
          </button>
          {EQUIPMENT_TYPES.filter((t) => equipmentCounts[t]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveEquipment(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-colors ${
                activeEquipment === t ? "bg-[#E01E1E]/20 border-[#E01E1E]/50 text-[#E01E1E]" : "border-[#890404]/25 text-[#F5EDED]/40"
              }`}
            >
              {EQUIPMENT_TYPE_LABELS[t]} ({equipmentCounts[t]})
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <GymForm
          onSave={async (input) => {
            const result = await createGym(input);
            if (!result.error) setShowCreate(false);
            return result;
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ alignItems: "start" }}>
        {filtered.map((gym) => (
          <GymCard
            key={gym.id}
            gym={gym}
            isCoach={isCoach}
            currentUserId={currentUserId}
            matchingExerciseCount={matchingExerciseCount(gym)}
            isMyGym={!!myGymName && gym.name.trim().toLowerCase() === myGymName.trim().toLowerCase()}
            onSetAsMyGym={onSetMyGym ? async () => { await onSetMyGym(gym.name, gym.website); } : undefined}
            onUpdate={async (input) => updateGym(gym.id, input)}
            onDelete={async () => { await deleteGym(gym.id); }}
            onReview={async (rating, comment) => { await upsertGymReview(gym.id, rating, comment); }}
            onDeleteReview={async (reviewId) => { await deleteGymReview(reviewId); }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-[#F5EDED]/25 italic text-center py-10">Aucune salle ne correspond à ta recherche.</p>
        )}
      </div>
    </div>
  );
}
