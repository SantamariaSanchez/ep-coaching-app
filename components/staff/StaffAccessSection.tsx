"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, ChevronDown, Link2, UserPlus, X, KeyRound } from "lucide-react";
import { addStaffInvite, revokeStaffInvite, setStaffMemberStatus } from "@/app/dashboard/coach/admin/organisation/actions";

export interface StaffAccessRole {
  key: string;
  title: string;
  poleName: string;
  poleColor: string;
  url: string;
}

export interface StaffAccessInvite {
  id: string;
  role_key: string;
  email: string;
  used_at: string | null;
  application_id: string | null;
}

export interface StaffAccessMember {
  user_id: string;
  role_key: string;
  full_name: string;
  email: string;
  status: "actif" | "suspendu" | "termine";
  contract_signed_at: string | null;
  contract_version: string | null;
}

const STATUS_LABEL = { actif: "Actif", suspendu: "Suspendu", termine: "Terminé" } as const;

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copie ce lien :", url);
        }
      }}
      className="flex-shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-lg border border-[#E01E1E]/35 text-[#F5EDED] hover:bg-[#E01E1E]/10"
    >
      {copied ? <Check size={12} className="text-[#4ade80]" /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier le lien"}
    </button>
  );
}

function RoleRow({
  role,
  invites,
  members,
  contractVersion,
}: {
  role: StaffAccessRole;
  invites: StaffAccessInvite[];
  members: StaffAccessMember[];
  contractVersion: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pendingInvites = invites.filter((i) => !i.used_at);
  const active = members.filter((m) => m.status === "actif").length;

  function run(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.error) setError(r.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  return (
    <div className="bg-[#1f0101] border border-[#890404]/20 rounded-xl p-3.5">
      <div className="flex items-center gap-2.5 flex-wrap">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex-1 min-w-[180px] text-left flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: role.poleColor }} />
          <span className="text-[13px] font-bold text-white">{role.title}</span>
          <span className="text-[10.5px] text-[#F5EDED]/40">
            {active} actif{active > 1 ? "s" : ""}
            {pendingInvites.length > 0 && ` · ${pendingInvites.length} en attente`}
          </span>
          <ChevronDown size={13} className={`text-[#F5EDED]/30 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <CopyLink url={role.url} />
      </div>
      <p className="text-[10.5px] text-[#F5EDED]/30 mt-1.5 break-all flex items-center gap-1">
        <Link2 size={10} /> {role.url}
      </p>

      {open && (
        <div className="mt-3 pt-3 border-t border-dashed border-[#890404]/20 space-y-3">
          {members.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">Accès créés</p>
              {members.map((m) => {
                const signed = !!m.contract_signed_at && m.contract_version === contractVersion;
                return (
                  <div key={m.user_id} className="flex items-center gap-2 flex-wrap text-[11.5px]">
                    <span className="font-bold text-white">{m.full_name}</span>
                    <span className="text-[#F5EDED]/45">{m.email}</span>
                    <span className={signed ? "text-[#4ade80]" : "text-[#facc15]"}>
                      {signed
                        ? `Contrat signé le ${new Date(m.contract_signed_at!).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                        : m.contract_signed_at
                          ? "Nouvelle version à signer"
                          : "Contrat pas encore signé"}
                    </span>
                    <select
                      aria-label={`Statut de l'accès de ${m.full_name}`}
                      value={m.status}
                      disabled={pending}
                      onChange={(e) => run(() => setStaffMemberStatus(m.user_id, e.target.value as StaffAccessMember["status"]))}
                      className="ml-auto bg-black/30 border border-[#890404]/30 rounded-lg px-2 py-1 text-[11px] text-white"
                    >
                      {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#F5EDED]/30">Emails autorisés, accès pas encore créé</p>
            {pendingInvites.length === 0 ? (
              <p className="text-[11.5px] text-[#F5EDED]/35">
                Aucun. Une candidature passée en &quot;Acceptée&quot; ajoute son email ici automatiquement.
              </p>
            ) : (
              pendingInvites.map((i) => (
                <div key={i.id} className="flex items-center gap-2 text-[11.5px]">
                  <span className="text-white">{i.email}</span>
                  {i.application_id && <span className="text-[10px] text-[#F5EDED]/35">(candidature acceptée)</span>}
                  <button
                    type="button"
                    onClick={() => run(() => revokeStaffInvite(i.id))}
                    disabled={pending}
                    aria-label={`Retirer l'autorisation de ${i.email}`}
                    className="ml-auto text-[#F5EDED]/35 hover:text-[#f87171]"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addStaffInvite(role.key, email), () => setEmail(""));
            }}
            className="flex gap-2"
          >
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="email@de-la-recrue.com"
              aria-label={`Autoriser un email pour ${role.title}`}
              className="flex-1 bg-black/30 border border-[#890404]/30 rounded-lg px-3 py-2 text-xs text-white placeholder-[#F5EDED]/25 focus:outline-none focus:border-[#E01E1E]/50"
            />
            <button type="submit" disabled={pending || !email.trim()} className="inline-flex items-center gap-1.5 bg-[#E01E1E] hover:bg-[#B00202] text-white text-[10.5px] font-bold uppercase tracking-widest px-3 rounded-lg disabled:opacity-50">
              <UserPlus size={12} /> Autoriser
            </button>
          </form>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function StaffAccessSection({
  roles,
  invites,
  members,
  contractVersion,
  unavailable,
}: {
  roles: StaffAccessRole[];
  invites: StaffAccessInvite[];
  members: StaffAccessMember[];
  contractVersion: string;
  unavailable: boolean;
}) {
  const totalActive = members.filter((m) => m.status === "actif").length;
  return (
    <section className="ep-card" style={{ padding: "18px 18px", marginBottom: 24 }}>
      <div className="flex items-center gap-2 mb-1">
        <KeyRound size={14} className="text-[#E01E1E]" />
        <p className="ep-label" style={{ margin: 0 }}>Accès équipe · liens de connexion par métier</p>
      </div>
      <p className="text-[12px] text-[#F5EDED]/50 leading-relaxed mb-3">
        1. Passe la candidature en &quot;Acceptée&quot; (ou autorise l&apos;email à la main). 2. Envoie le lien du poste.
        3. La recrue crée son accès, confirme son email et signe son contrat : elle reçoit alors par email son
        contrat signé, sa fiche de poste et son parcours d&apos;intégration. {totalActive} accès actif{totalActive > 1 ? "s" : ""} aujourd&apos;hui.
      </p>
      {unavailable && (
        <p className="text-[11.5px] text-[#facc15] mb-3">
          Les tables de l&apos;équipe ne sont pas encore créées : exécute la migration 20260925_staff_roles.sql dans
          le SQL Editor de Supabase. Les liens ci-dessous fonctionneront dès que ce sera fait.
        </p>
      )}
      <div className="space-y-2">
        {roles.map((r) => (
          <RoleRow
            key={r.key}
            role={r}
            invites={invites.filter((i) => i.role_key === r.key)}
            members={members.filter((m) => m.role_key === r.key)}
            contractVersion={contractVersion}
          />
        ))}
      </div>
      <p className="text-[10.5px] text-[#F5EDED]/30 mt-3 leading-relaxed">
        Le contrat généré pour chaque poste est une base solide, à faire valider une fois par un avocat avant la
        première signature réelle.
      </p>
    </section>
  );
}
