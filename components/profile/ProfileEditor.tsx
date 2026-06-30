"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, AlertCircle } from "lucide-react";
import { updateMyProfile, uploadAvatar } from "@/utils/profile-actions";

export default function ProfileEditor({
  fullName,
  phone,
  bio,
}: {
  fullName: string;
  phone: string | null;
  bio: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(fullName);
  const [phoneVal, setPhoneVal] = useState(phone ?? "");
  const [bioVal, setBioVal] = useState(bio ?? "");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setStatus("idle");
    startTransition(async () => {
      const result = await updateMyProfile({
        full_name: name,
        phone: phoneVal.trim() || null,
        bio: bioVal,
      });
      if (result.error) {
        setStatus("error");
        setErrorMsg(result.error);
      } else {
        setStatus("success");
        router.refresh();
        setTimeout(() => setStatus("idle"), 2500);
      }
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus("idle");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadAvatar(formData);
      if (result.error) {
        setStatus("error");
        setErrorMsg(result.error);
      } else {
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="bg-[var(--color-ep-card)] border border-[var(--color-ep-dark-red)]/25 rounded-xl p-5 mb-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/35 mb-4">
        Modifier mon profil
      </p>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[var(--color-ep-light)]/45 hover:text-[var(--color-ep-light)]/75 mb-4 disabled:opacity-40"
      >
        <Camera size={13} strokeWidth={1.8} />
        {uploading ? "Envoi..." : "Changer ma photo"}
      </button>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 block mb-1.5">
            Prénom et nom
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-black/30 border border-[var(--color-ep-dark-red)]/30 focus:border-[var(--color-ep-red)]/50 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 block mb-1.5">
            Bio
          </label>
          <textarea
            value={bioVal}
            onChange={(e) => setBioVal(e.target.value)}
            placeholder="Parle un peu de toi, tes objectifs, ton parcours..."
            rows={3}
            maxLength={280}
            className="w-full bg-black/30 border border-[var(--color-ep-dark-red)]/30 focus:border-[var(--color-ep-red)]/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-[var(--color-ep-light)]/20 focus:outline-none transition-colors resize-none"
          />
          <p className="text-[10px] text-[var(--color-ep-light)]/20 mt-1 text-right">{bioVal.length}/280</p>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-ep-light)]/35 block mb-1.5">
            Téléphone
          </label>
          <input
            type="tel"
            value={phoneVal}
            onChange={(e) => setPhoneVal(e.target.value)}
            placeholder="06 12 34 56 78"
            className="w-full bg-black/30 border border-[var(--color-ep-dark-red)]/30 focus:border-[var(--color-ep-red)]/50 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-[var(--color-ep-light)]/20 focus:outline-none transition-colors"
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-[var(--color-ep-red)] hover:bg-[var(--color-ep-med-red)] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg transition-colors mt-4"
      >
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </button>

      {status === "success" && (
        <div className="flex items-center gap-2 text-green-400 text-xs font-semibold mt-3">
          <Check size={12} /> Profil mis à jour
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 text-red-400 text-xs font-semibold mt-3">
          <AlertCircle size={12} /> {errorMsg}
        </div>
      )}
    </div>
  );
}
