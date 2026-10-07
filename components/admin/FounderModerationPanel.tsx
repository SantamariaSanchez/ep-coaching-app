"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, LogOut, Trash2, ShieldAlert } from "lucide-react";
import { disconnectUser, deleteUserAccountAdmin } from "@/app/dashboard/coach/profile/[id]/actions";

export default function FounderModerationPanel({
  targetUserId,
  targetName,
}: {
  targetUserId: string;
  targetName: string;
}) {
  const t = useT();
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "disconnected" | "deleted">("idle");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDisconnect() {
    setError("");
    setConfirmingDisconnect(false);
    startTransition(async () => {
      const result = await disconnectUser(targetUserId);
      if (result.error) setError(result.error);
      else setStatus("disconnected");
    });
  }

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteUserAccountAdmin(targetUserId);
      if (result.error) setError(result.error);
      else {
        setStatus("deleted");
        router.push("/dashboard/coach/communaute/membres");
      }
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5 mt-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-3 flex items-center gap-1.5">
        <ShieldAlert size={12} style={{ color: "#E01E1E" }} />
        {t("Modération (fondateur)")}
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/dashboard/coach/messages/${targetUserId}`}
          className="ep-btn-secondary"
          style={{ textDecoration: "none", fontSize: 11 }}
        >
          <MessageCircle size={13} />
          {t("Message direct")}
        </Link>

        {!confirmingDisconnect ? (
          <button
            onClick={() => setConfirmingDisconnect(true)}
            disabled={isPending}
            className="ep-btn-secondary"
            style={{ fontSize: 11 }}
          >
            <LogOut size={13} />
            {t("Déconnecter")}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#F5EDED]/60">{t("Forcer la déconnexion de")}{" "}{targetName} ?</span>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="text-[11px] font-bold text-red-400 hover:text-red-300"
            >
              {t("Confirmer")}
            </button>
            <button
              onClick={() => setConfirmingDisconnect(false)}
              disabled={isPending}
              className="text-[11px] font-bold text-[#F5EDED]/40 hover:text-[#F5EDED]/60"
            >
              {t("Annuler")}
            </button>
          </div>
        )}

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            className="ep-btn-secondary"
            style={{ fontSize: 11, color: "#ff6b6b" }}
          >
            <Trash2 size={13} />
            {t("Supprimer le compte")}
          </button>
        ) : (
          <div className="flex items-center gap-2 w-full mt-1">
            <span className="text-[11px] text-[#F5EDED]/60">
              {t("Supprimer définitivement le compte de")}{" "}{targetName} ?
            </span>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-[11px] font-bold text-red-400 hover:text-red-300"
            >
              {t("Confirmer")}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={isPending}
              className="text-[11px] font-bold text-[#F5EDED]/40 hover:text-[#F5EDED]/60"
            >
              {t("Annuler")}
            </button>
          </div>
        )}
      </div>

      {status === "disconnected" && (
        <p className="text-[11px] text-green-400 font-semibold mt-3">
          {t("Session invalidée,")}{" "}{targetName}{" "}{t("devra se reconnecter.")}
        </p>
      )}
      {error && <p className="text-red-400 text-[11px] font-semibold mt-3">{error}</p>}
    </div>
  );
}
