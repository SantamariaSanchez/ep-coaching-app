"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { addClient } from "@/app/dashboard/coach/clients/actions";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputClass =
  "w-full bg-[#2a0101] border border-[#890404]/60 rounded-lg px-4 py-2.5 text-white placeholder-[#F5EDED]/25 text-sm focus:outline-none focus:border-[#E01E1E] transition-colors";

const labelClass =
  "block text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/50 mb-1.5";

export default function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const [state, formAction, isPending] = useActionState(addClient, null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && "success" in state && state.success) {
      onClose();
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#1a0000] border border-[#890404]/40 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black uppercase tracking-widest">
            Nouveau client
          </h2>
          <button
            onClick={onClose}
            className="text-[#F5EDED]/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="space-y-4">
          <div>
            <label className={labelClass}>Prénom + Nom *</label>
            <input
              name="full_name"
              type="text"
              required
              placeholder="Jean Dupont"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="jean@email.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Mot de passe temporaire *</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="min. 6 caractères"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Téléphone</label>
            <input
              name="phone"
              type="tel"
              placeholder="06 00 00 00 00"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Poids départ (kg)</label>
              <input
                name="weight_start"
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder="80"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date de début</label>
              <input
                name="start_date"
                type="date"
                className={`${inputClass} [color-scheme:dark]`}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Objectif</label>
            <textarea
              name="goal"
              rows={3}
              placeholder="Prise de masse, perdre 10 kg..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {state && "error" in state && (
            <p className="text-[#FDC4C4] text-xs text-center">{state.error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-[#890404]/50 text-[#F5EDED]/60 hover:text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-lg transition-colors"
            >
              {isPending ? "Création..." : "Créer le client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
