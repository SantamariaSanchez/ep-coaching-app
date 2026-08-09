"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut, ChevronRight, Trash2, AlertTriangle } from "lucide-react";
import { createClientSupabase } from "@/lib/supabase-client";
import { deleteOwnAccount } from "@/app/actions/account";

// Les autorisations (notifications, mouvement, installation) vivent
// désormais dans components/settings/PermissionsCard, un vrai hub dédié —
// ce composant ne garde que les actions "compte" (mot de passe,
// déconnexion, suppression), voir l'historique git pour l'ancienne version
// qui mélangeait les deux.
export default function AccountActions({
  email,
  signOutRedirect,
}: {
  email: string | null;
  signOutRedirect: string;
}) {
  const router = useRouter();
  const sb = createClientSupabase();
  const [resetSent, setResetSent] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function signOut() {
    await sb.auth.signOut();
    router.push(signOutRedirect);
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteOwnAccount();
    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    await sb.auth.signOut();
    router.push("/");
    router.refresh();
  }

  async function resetPwd() {
    if (!email) return;
    // Passe par /auth/callback (échange le code contre une session) puis
    // atterrit sur la page qui permet réellement de saisir un nouveau mot de
    // passe — avant ça le lien reconnectait l'utilisateur sans rien lui
    // proposer pour changer son mot de passe.
    await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setResetSent(true);
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/25 rounded-xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5EDED]/35 mb-4">Compte</p>

      <button
        onClick={resetPwd}
        className="flex items-center justify-between w-full py-3 border-b border-[#890404]/10"
      >
        <div className="flex items-center gap-2.5">
          <Lock size={14} className="text-[#F5EDED]/40" />
          <span className="text-sm text-white font-medium">
            {resetSent ? "Email envoyé !" : "Changer mon mot de passe"}
          </span>
        </div>
        <ChevronRight size={13} className="text-[#F5EDED]/20" />
      </button>

      <button
        onClick={signOut}
        className="flex items-center justify-center gap-2 w-full mt-4 bg-[#E01E1E]/10 border border-[#E01E1E]/25 hover:bg-[#E01E1E]/20 rounded-lg py-3 text-[#E01E1E] font-bold text-xs uppercase tracking-widest transition-colors"
      >
        <LogOut size={13} /> Se déconnecter
      </button>

      {confirmingDelete ? (
        <div className="mt-3 bg-red-500/5 border border-red-500/25 rounded-lg p-3.5">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300/90 leading-relaxed">
              Cette action est définitive : ton compte et ton accès seront supprimés, sans retour en arrière possible.
            </p>
          </div>
          {deleteError && <p className="text-xs text-red-400 mb-3">{deleteError}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 disabled:opacity-50 rounded-lg py-2.5 text-red-300 font-bold text-xs uppercase tracking-widest transition-colors"
            >
              {deleting ? "Suppression…" : "Confirmer la suppression"}
            </button>
            <button
              onClick={() => {
                setConfirmingDelete(false);
                setDeleteError(null);
              }}
              disabled={deleting}
              className="px-4 text-xs text-[#F5EDED]/40 hover:text-[#F5EDED]/70 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirmingDelete(true)}
          className="flex items-center justify-center gap-2 w-full mt-2 py-2.5 text-[#F5EDED]/25 hover:text-red-400 font-bold text-[11px] uppercase tracking-widest transition-colors"
        >
          <Trash2 size={12} /> Supprimer mon compte
        </button>
      )}
    </div>
  );
}
