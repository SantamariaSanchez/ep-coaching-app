"use client";

import { useState, useMemo } from "react";
import { Search, Plus, X, Star, MapPin, Pencil, Trash2, Globe, Dumbbell } from "lucide-react";
import type { GymWithReviews } from "@/utils/gyms";
import type { CreateGymInput } from "@/app/dashboard/client/gyms/actions";

const inputCls =
  "w-full bg-[#150000] border border-[#890404]/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/60 transition-colors";
const labelCls = "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/40 mb-1.5";

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
  onSave: (input: CreateGymInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [equipmentNotes, setEquipmentNotes] = useState(initial?.equipment_notes ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!name.trim()) { setError("Le nom est requis."); return; }
    setSaving(true);
    setError(null);
    await onSave({ name, city: city || null, address: address || null, equipment_notes: equipmentNotes || null, website: website || null });
    setSaving(false);
  }

  return (
    <div className="bg-[#150000] border border-[#890404]/30 rounded-xl p-4 space-y-3">
      <div>
        <label className={labelCls}>Nom de la salle</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Basic-Fit Lille Centre" className={inputCls} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Ville</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Lille" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Adresse (optionnel)</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue…" className={inputCls} />
        </div>
      </div>
      <div>
        <label className={labelCls}>Équipement disponible (optionnel)</label>
        <textarea
          value={equipmentNotes}
          onChange={(e) => setEquipmentNotes(e.target.value)}
          rows={2}
          placeholder="Ex. Plateau powerlifting, beaucoup de machines, peu de fonte libre…"
          className={`${inputCls} resize-none`}
        />
      </div>
      <div>
        <label className={labelCls}>Site web (optionnel)</label>
        <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className={inputCls} />
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
        <button onClick={onCancel} className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest border border-[#890404]/40 text-[#F5EDED]/50 hover:text-[#F5EDED]/80 rounded-lg transition-colors">
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
        placeholder="Ton avis (optionnel)…"
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
  onUpdate,
  onDelete,
  onReview,
  onDeleteReview,
}: {
  gym: GymWithReviews;
  isCoach: boolean;
  currentUserId: string;
  onUpdate: (input: CreateGymInput) => Promise<void>;
  onDelete: () => Promise<void>;
  onReview: (rating: number, comment: string) => Promise<void>;
  onDeleteReview: (reviewId: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const myReview = gym.reviews.find((r) => r.author_id === currentUserId);

  if (editing) {
    return <GymForm initial={gym} onSave={async (input) => { await onUpdate(input); setEditing(false); }} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        <div className="w-9 h-9 rounded-lg bg-[#150000] border border-[#890404]/25 flex items-center justify-center flex-shrink-0">
          <Dumbbell size={15} className="text-[#E01E1E]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{gym.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {gym.city && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#F5EDED]/35">
                <MapPin size={10} /> {gym.city}
              </span>
            )}
            {gym.avgRating != null && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[#F5EDED]/35">
                <StarDisplay value={gym.avgRating} /> {gym.avgRating} ({gym.reviews.length})
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#890404]/15 pt-3 space-y-3">
          {gym.address && <p className="text-xs text-[#F5EDED]/50">{gym.address}</p>}
          {gym.equipment_notes && (
            <p className="text-xs text-[#F5EDED]/45 leading-relaxed italic">&ldquo;{gym.equipment_notes}&rdquo;</p>
          )}
          {gym.website && (
            <a href={gym.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#E01E1E] hover:text-[#ff4444] transition-colors">
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
}: Props) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return gyms;
    return gyms.filter((g) => g.name.toLowerCase().includes(q) || (g.city ?? "").toLowerCase().includes(q));
  }, [gyms, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#F5EDED]/25" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher une salle ou une ville…" className={`${inputCls} pl-9`} />
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest bg-[#E01E1E] hover:bg-[#B00202] text-white rounded-lg transition-colors flex-shrink-0"
        >
          <Plus size={13} /> {showCreate ? "Fermer" : "Ajouter une salle"}
        </button>
      </div>

      <p className="text-[10px] text-[#F5EDED]/25">
        {gyms.length} salle{gyms.length !== 1 ? "s" : ""} référencée{gyms.length !== 1 ? "s" : ""} — partage la tienne et note celles que tu connais.
      </p>

      {showCreate && (
        <GymForm
          onSave={async (input) => {
            await createGym(input);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="space-y-2">
        {filtered.map((gym) => (
          <GymCard
            key={gym.id}
            gym={gym}
            isCoach={isCoach}
            currentUserId={currentUserId}
            onUpdate={async (input) => { await updateGym(gym.id, input); }}
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
