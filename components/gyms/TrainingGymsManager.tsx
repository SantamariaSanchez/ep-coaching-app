"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useT } from "@/components/i18n/I18nProvider";
import {
  EQUIPMENT_GROUPS,
  GYM_KIND_LABELS,
  GYM_TEMPLATES,
  equipmentLabel,
  templateFor,
  type GymKind,
} from "@/lib/gym-equipment";
import type { TrainingGym } from "@/utils/training-gyms";
import { addGymPhoto, createTrainingGym, deleteGymPhoto, deleteTrainingGym, updateTrainingGym } from "@/app/actions/training-gyms";

// Mes salles : le matériel de chaque salle (tags cochables, pré-remplis par un
// type de salle ou suggérés d'après une photo) décide des exercices proposés
// dans la programmation. Le client gère les siennes, le coach celles de son
// client. Cochage manuel toujours possible, la suggestion par photo n'est
// qu'un coup de pouce.

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-9 inline-flex items-center gap-1 rounded-lg border px-2.5 text-[11.5px] font-bold transition-colors ${
        on ? "border-(--ep-accent)/55 bg-(--ep-accent)/15 text-(--ep-strong)" : "border-(--ep-line)/30 text-(--ep-ink)/60"
      }`}
    >
      {on && <Check size={12} aria-hidden />}
      {children}
    </button>
  );
}

function PhotoAdder({ gymId, onDone }: { gymId: string; onDone: () => void }) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function pick(f: File | null) {
    setFile(f);
    setTags([]);
    setNote(null);
    setPreview(f ? URL.createObjectURL(f) : null);
    if (!f) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", f);
      const res = await fetch("/api/ai/analyze-gym-photo", { method: "POST", body: fd });
      const json = (await res.json()) as { equipment?: string[]; error?: string };
      if (res.ok && json.equipment) {
        setTags(json.equipment);
        setNote(json.equipment.length ? t("Matériel suggéré d'après la photo : vérifie et corrige.") : t("Rien de sûr sur la photo : coche ce que tu vois."));
      } else {
        setNote(t("Coche le matériel qu'on voit sur la photo."));
      }
    } catch {
      setNote(t("Coche le matériel qu'on voit sur la photo."));
    }
    setBusy(false);
  }

  async function save() {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("photo", file);
    fd.append("equipment", JSON.stringify(tags));
    const res = await addGymPhoto(gymId, fd);
    setBusy(false);
    if (res.error) {
      setNote(res.error);
      return;
    }
    setFile(null);
    setPreview(null);
    setTags([]);
    onDone();
  }

  return (
    <div className="mt-2 rounded-xl border border-dashed border-(--ep-line)/35 p-3">
      {!file ? (
        <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 text-[12.5px] font-bold text-(--ep-accent)">
          <Camera size={15} aria-hidden /> {t("Ajouter une photo de machine")}
          <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && <img src={preview} alt="" className="max-h-48 w-full rounded-lg object-cover" />}
          {note && <p className="text-[11.5px] text-(--ep-ink)/60">{note}</p>}
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT_GROUPS.flatMap((g) => g.items).map((i) => (
              <Chip key={i.key} on={tags.includes(i.key)} onClick={() => setTags((c) => (c.includes(i.key) ? c.filter((k) => k !== i.key) : [...c, i.key]))}>
                {i.label}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="min-h-11 flex-1 rounded-xl bg-(--ep-accent) text-[12.5px] font-black uppercase tracking-wider text-(--ep-strong) disabled:opacity-50">
              {busy ? t("Envoi…") : t("Enregistrer la photo")}
            </button>
            <button type="button" onClick={() => pick(null)} className="min-h-11 rounded-xl border border-(--ep-line)/35 px-3 text-(--ep-ink)/60" aria-label={t("Annuler")}>
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function GymCard({ gym, onChanged }: { gym: TrainingGym; onChanged: () => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(gym.name);
  const [city, setCity] = useState(gym.city ?? "");
  const [equipment, setEquipment] = useState<string[]>(gym.equipment);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: { equipment?: string[] }) {
    setError(null);
    start(async () => {
      const res = await updateTrainingGym(gym.id, { name, city, ...next });
      if (res.error) setError(res.error);
      else onChanged();
    });
  }

  function toggle(key: string) {
    const next = equipment.includes(key) ? equipment.filter((k) => k !== key) : [...equipment, key];
    setEquipment(next);
    save({ equipment: next });
  }

  return (
    <section className="rounded-2xl border border-(--ep-line)/30 bg-(--ep-s1)">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-14 w-full items-center gap-2 px-3.5 py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-black text-(--ep-strong)">{gym.name}</span>
          <span className="block truncate text-[11.5px] text-(--ep-ink)/55">
            {[gym.city, t(GYM_KIND_LABELS[gym.kind]), `${equipment.length} ${t("équipements")}`, `${gym.photos.length} ${t("photos")}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-(--ep-ink)/40" style={{ transform: open ? "rotate(180deg)" : undefined }} aria-hidden />
      </button>
      {open && (
        <div className="space-y-3 border-t border-(--ep-line)/15 px-3.5 py-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => save({})} aria-label={t("Nom de la salle")} className="min-h-11 rounded-lg border border-(--ep-line)/30 bg-(--ep-s2) px-3 text-[13px] text-(--ep-strong)" />
            <input value={city} onChange={(e) => setCity(e.target.value)} onBlur={() => save({})} placeholder={t("Ville")} aria-label={t("Ville")} className="min-h-11 rounded-lg border border-(--ep-line)/30 bg-(--ep-s2) px-3 text-[13px] text-(--ep-strong)" />
          </div>

          <div>
            <p className="mb-1 text-[9.5px] font-black uppercase tracking-widest text-(--ep-ink)/45">{t("Partir d'un type de salle")}</p>
            <div className="flex flex-wrap gap-1.5">
              {GYM_TEMPLATES.map((tpl) => (
                <Chip
                  key={tpl.kind}
                  on={false}
                  onClick={() => {
                    setEquipment(tpl.equipment);
                    start(async () => {
                      const res = await updateTrainingGym(gym.id, { kind: tpl.kind, equipment: tpl.equipment });
                      if (res.error) setError(res.error);
                      else onChanged();
                    });
                  }}
                >
                  {t(tpl.label)}
                </Chip>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[9.5px] font-black uppercase tracking-widest text-(--ep-ink)/45">{t("Matériel disponible")}</p>
            <div className="space-y-1">
              {EQUIPMENT_GROUPS.map((g) => {
                const count = g.items.filter((i) => equipment.includes(i.key)).length;
                const isOpen = openGroup === g.key;
                return (
                  <div key={g.key} className="rounded-xl border border-(--ep-line)/20">
                    <button type="button" onClick={() => setOpenGroup(isOpen ? null : g.key)} aria-expanded={isOpen} className="flex min-h-11 w-full items-center justify-between px-3 text-[12.5px] font-bold text-(--ep-ink)/85">
                      <span>{t(g.label)}</span>
                      <span className="text-[11px] tabular-nums text-(--ep-ink)/50">{count}/{g.items.length}</span>
                    </button>
                    {isOpen && (
                      <div className="flex flex-wrap gap-1.5 px-3 pb-3">
                        {g.items.map((i) => (
                          <Chip key={i.key} on={equipment.includes(i.key)} onClick={() => toggle(i.key)}>
                            {t(i.label)}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {equipment.length === 0 && gym.kind !== "poids_du_corps" && (
              <p className="mt-1 text-[11.5px] text-(--ep-ink)/55">{t("Tant qu'aucun matériel n'est coché, cette salle ne filtre aucun exercice.")}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-[9.5px] font-black uppercase tracking-widest text-(--ep-ink)/45">{t("Photos des machines")}</p>
            {gym.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5">
                {gym.photos.map((p) => (
                  <div key={p.id} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.equipment.map(equipmentLabel).join(", ")} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      aria-label={t("Supprimer la photo")}
                      onClick={() => start(async () => { await deleteGymPhoto(p.id); onChanged(); })}
                      className="absolute right-1 top-1 rounded-md bg-(--ep-bg)/80 p-1.5 text-(--ep-ink)"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <PhotoAdder gymId={gym.id} onDone={onChanged} />
          </div>

          {error && <p className="text-[12px] text-(--ep-bad)">{error}</p>}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(t("Supprimer cette salle ?"))) start(async () => { await deleteTrainingGym(gym.id); onChanged(); });
            }}
            className="inline-flex min-h-11 items-center gap-1.5 text-[12px] font-bold text-(--ep-bad)"
          >
            <Trash2 size={13} /> {t("Supprimer la salle")}
          </button>
        </div>
      )}
    </section>
  );
}

export default function TrainingGymsManager({ ownerId, gyms }: { ownerId: string; gyms: TrainingGym[] }) {
  const t = useT();
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GymKind>("commerciale");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const refresh = () => router.refresh();

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] leading-snug text-(--ep-ink)/60">
        {t("Une salle, son matériel et ses photos. Chaque séance du programme peut être rattachée à une salle : seuls les exercices faisables avec son matériel sont proposés.")}
      </p>
      {gyms.map((g) => (
        <GymCard key={g.id + g.equipment.join(",") + g.photos.length} gym={g} onChanged={refresh} />
      ))}
      <section className="rounded-2xl border border-dashed border-(--ep-line)/35 p-3.5">
        <p className="mb-2 text-[9.5px] font-black uppercase tracking-widest text-(--ep-ink)/45">{t("Nouvelle salle")}</p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Nom (ex. On Air Annecy)")} aria-label={t("Nom de la salle")} className="mb-2 min-h-11 w-full rounded-lg border border-(--ep-line)/30 bg-(--ep-s2) px-3 text-[13px] text-(--ep-strong)" />
        <div className="mb-2 flex flex-wrap gap-1.5">
          {GYM_TEMPLATES.map((tpl) => (
            <Chip key={tpl.kind} on={kind === tpl.kind} onClick={() => setKind(tpl.kind)}>
              {t(tpl.label)}
            </Chip>
          ))}
        </div>
        <p className="mb-2 text-[11.5px] text-(--ep-ink)/50">{t(templateFor(kind)?.hint ?? "")}</p>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createTrainingGym({ ownerId, name, kind });
              if (res.error) setError(res.error);
              else {
                setName("");
                setError(null);
                refresh();
              }
            })
          }
          className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-(--ep-accent) text-[12.5px] font-black uppercase tracking-wider text-(--ep-strong) disabled:opacity-50"
        >
          <Plus size={14} /> {t("Créer la salle")}
        </button>
        {error && <p className="mt-1.5 text-[12px] text-(--ep-bad)">{error}</p>}
      </section>
    </div>
  );
}
