"use client";

import { useState, useTransition } from "react";
import { Check, AlertCircle, Edit2 } from "lucide-react";
import { updateClientProfile } from "@/app/dashboard/client/profile/actions";

export default function ClientProfileEditForm({
  currentPhone,
}: {
  currentPhone: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState(currentPhone ?? "");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");
    startTransition(async () => {
      const result = await updateClientProfile({ phone: phone.trim() || null });
      if (result.error) {
        setStatus("error");
        setErrorMsg(result.error);
      } else {
        setStatus("success");
        setTimeout(() => {
          setOpen(false);
          setStatus("idle");
        }, 1500);
      }
    });
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/40 hover:text-[#F5EDED]/70 border border-[#890404]/30 hover:border-[#890404]/60 px-3 py-2 rounded-lg transition-colors"
      >
        <Edit2 size={11} />
        Modifier mes infos
      </button>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 bg-[#1f0101] border border-[#890404]/25 rounded-xl p-4 space-y-4"
        >
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[#F5EDED]/35 block mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full bg-black/30 border border-[#890404]/30 focus:border-[#E01E1E]/50 rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#F5EDED]/20 focus:outline-none transition-colors"
            />
          </div>

          <p className="text-[10px] text-[#F5EDED]/25">
            Pour modifier ton email, contacte ton coach.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#E01E1E] hover:bg-[#B00202] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setStatus("idle");
              }}
              className="text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
            >
              Annuler
            </button>
          </div>

          {status === "success" && (
            <div className="flex items-center gap-2 text-green-400 text-xs font-semibold">
              <Check size={12} />
              Modifié avec succès
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-2 text-red-400 text-xs font-semibold">
              <AlertCircle size={12} />
              {errorMsg}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
