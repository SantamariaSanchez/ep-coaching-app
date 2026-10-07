"use client";

import { useT } from "@/components/i18n/I18nProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, UserPlus, X, LogOut, Pencil } from "lucide-react";
import { updateCareerModeAction } from "@/app/actions/app-setup";
import {
  inviteCoachAction,
  updateCoachLinkAction,
  endCoachLinkAction,
  respondCoachInviteAction,
  leaveCoachTeamAction,
  inviteStaffAction,
  revokeStaffInviteAction,
  setStaffStatusAction,
  updatePayConfigAction,
} from "@/app/dashboard/coach/mon-equipe/actions";

// Briques client de la page Mon équipe : mode de travail, invitations,
// gestion des coachs et du staff.

const input: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(137,4,4,0.35)",
  borderRadius: 10,
  padding: "9px 10px",
  fontSize: 14,
  color: "#F5EDED",
  outline: "none",
};
const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(245,237,237,0.45)", marginBottom: 4 };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 14px", borderRadius: 12, border: "none", background: "#E01E1E", color: "#fff", fontSize: 12, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" };
const ghost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 10, border: "1px solid rgba(137,4,4,0.45)", background: "transparent", color: "rgba(245,237,237,0.75)", fontSize: 11.5, fontWeight: 800, cursor: "pointer" };

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const run = (fn: () => Promise<{ error?: string }>, okText?: string, after?: () => void) => {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.error) return setMsg({ ok: false, text: res.error });
      if (okText) setMsg({ ok: true, text: okText });
      after?.();
      router.refresh();
    });
  };
  const note = msg ? <p style={{ fontSize: 12, color: msg.ok ? "#4ade80" : "#fca5a5", margin: "8px 0 0", wordBreak: "break-word" }}>{msg.text}</p> : null;
  return { pending, run, note };
}

// ── Mode de travail ─────────────────────────────────────────────────────

export interface CareerOption {
  value: string;
  label: string;
  hint?: string;
  unlocks: string;
}

export function CareerPicker({ current, options }: { current: string | null; options: CareerOption[] }) {
  const tr = useT();
  const { pending, run, note } = useAction();
  const active = options.find((o) => o.value === current) ?? null;
  return (
    <div className="ep-card" style={{ padding: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
        {options.map((o) => {
          const on = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending || on}
              onClick={() => run(() => updateCareerModeAction(o.value), "Mode mis à jour.")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                textAlign: "left",
                padding: "10px 11px",
                minHeight: 48,
                borderRadius: 12,
                cursor: on ? "default" : "pointer",
                border: `1px solid ${on ? "rgba(224,30,30,0.7)" : "rgba(137,4,4,0.3)"}`,
                background: on ? "rgba(224,30,30,0.14)" : "rgba(0,0,0,0.25)",
                color: "#F5EDED",
                fontSize: 12.5,
                fontWeight: 800,
                lineHeight: 1.25,
              }}
            >
              {on && <Check size={13} color="#E01E1E" style={{ flexShrink: 0 }} />} {o.label}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: "rgba(245,237,237,0.6)", margin: "10px 2px 0", lineHeight: 1.5 }}>
        {active ? active.unlocks : tr("Choisis comment tu travailles : l'appli s'adapte, et tu peux changer à tout moment.")}
      </p>
      {note}
    </div>
  );
}

// ── Invitations reçues / équipes rejointes ─────────────────────────────

export function InviteResponse({ id, ownerName, title, share }: { id: string; ownerName: string; title: string | null; share: number | null }) {
  const tr = useT();
  const { pending, run, note } = useAction();
  return (
    <div className="ep-card-hero" style={{ padding: "14px 16px" }}>
      <p style={{ fontSize: 14, fontWeight: 800, color: "#F5EDED", margin: 0 }}>{ownerName}{" "}{tr("t'invite dans son équipe")}</p>
      <p style={{ fontSize: 12.5, color: "rgba(245,237,237,0.6)", margin: "2px 0 10px" }}>
        {tr("Poste :")}{" "}{title || tr("Coach")}
        {share !== null ? `, ${share} % du chiffre d'affaires reversé` : ""}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={pending} style={primary} onClick={() => run(() => respondCoachInviteAction(id, true), "Bienvenue dans l'équipe.")}>
          <Check size={14} />{" "}{tr("Accepter")}
        </button>
        <button type="button" disabled={pending} style={ghost} onClick={() => run(() => respondCoachInviteAction(id, false))}>
          {tr("Refuser")}
        </button>
      </div>
      {note}
    </div>
  );
}

export function LeaveTeam({ id, ownerName }: { id: string; ownerName: string }) {
  const tr = useT();
  const { pending, run, note } = useAction();
  return (
    <span>
      <button
        type="button"
        disabled={pending}
        style={ghost}
        onClick={() => {
          if (confirm(`Quitter l'équipe de ${ownerName} ? Tes clients restent les tiens.`)) run(() => leaveCoachTeamAction(id));
        }}
      >
        <LogOut size={12} />{" "}{tr("Quitter")}
      </button>
      {note}
    </span>
  );
}

// ── Coachs de mon équipe ────────────────────────────────────────────────

export function InviteCoachForm() {
  const tr = useT();
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("Coach");
  const [share, setShare] = useState("");
  const { pending, run, note } = useAction();
  return (
    <div className="ep-card" style={{ padding: "14px 16px" }}>
      <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <UserPlus size={12} />{" "}{tr("Inviter un coach")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
        <div>
          <label style={lbl}>{tr("Email")}</label>
          <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr("coach@email.com")} aria-label={tr("Email du coach")} />
        </div>
        <div>
          <label style={lbl}>{tr("Poste")}</label>
          <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tr("Coach, Head coach...")} aria-label={tr("Poste")} />
        </div>
        <div>
          <label style={lbl}>{tr("Part reversée (%)")}</label>
          <input style={input} inputMode="decimal" value={share} onChange={(e) => setShare(e.target.value)} placeholder={tr("Optionnel")} aria-label={tr("Part reversée")} />
        </div>
      </div>
      <button
        type="button"
        disabled={pending || !email.trim()}
        style={{ ...primary, marginTop: 12, width: "100%", opacity: pending || !email.trim() ? 0.6 : 1 }}
        onClick={() => run(() => inviteCoachAction({ email, title, sharePct: share }), "Invitation envoyée par email.", () => setEmail(""))}
      >
        {pending ? "..." : tr("Envoyer l'invitation")}
      </button>
      {note}
    </div>
  );
}

export function CoachLinkActions({ id, title, share, note: initialNote, pendingInvite }: { id: string; title: string | null; share: number | null; note: string | null; pendingInvite: boolean }) {
  const tr = useT();
  const [edit, setEdit] = useState(false);
  const [t, setT] = useState(title ?? "Coach");
  const [s, setS] = useState(share === null ? "" : String(share));
  const [n, setN] = useState(initialNote ?? "");
  const { pending, run, note } = useAction();
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {!pendingInvite && (
          <button type="button" style={ghost} onClick={() => setEdit((v) => !v)}>
            <Pencil size={11} />{" "}{tr("Modifier")}
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          style={ghost}
          onClick={() => {
            if (confirm(pendingInvite ? "Annuler cette invitation ?" : "Retirer ce coach de ton équipe ? Ses clients restent les siens.")) run(() => endCoachLinkAction(id));
          }}
        >
          <X size={12} /> {pendingInvite ? tr("Annuler") : tr("Retirer")}
        </button>
      </div>
      {edit && (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          <input style={input} value={t} onChange={(e) => setT(e.target.value)} aria-label={tr("Poste")} />
          <input style={input} value={s} inputMode="decimal" onChange={(e) => setS(e.target.value)} placeholder={tr("Part (%)")} aria-label={tr("Part reversée")} />
          <input style={{ ...input, gridColumn: "1 / -1" }} value={n} onChange={(e) => setN(e.target.value)} placeholder={tr("Note privée (objectifs, conditions...)")} aria-label={tr("Note")} />
          <button type="button" disabled={pending} style={{ ...primary, gridColumn: "1 / -1" }} onClick={() => run(() => updateCoachLinkAction(id, { title: t, sharePct: s, note: n }), "Enregistré.", () => setEdit(false))}>
            {tr("Enregistrer")}
          </button>
        </div>
      )}
      {note}
    </div>
  );
}

// ── Staff ───────────────────────────────────────────────────────────────

export function InviteStaffForm({ roles }: { roles: { pole: string; items: { key: string; title: string }[] }[] }) {
  const tr = useT();
  const [roleKey, setRoleKey] = useState(roles[0]?.items[0]?.key ?? "");
  const [email, setEmail] = useState("");
  const { pending, run, note } = useAction();
  return (
    <div className="ep-card" style={{ padding: "14px 16px" }}>
      <p className="ep-label" style={{ margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
        <UserPlus size={12} />{" "}{tr("Recruter sur un poste")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        <div>
          <label style={lbl}>{tr("Poste")}</label>
          <select style={input} value={roleKey} onChange={(e) => setRoleKey(e.target.value)} aria-label={tr("Poste")}>
            {roles.map((g) => (
              <optgroup key={g.pole} label={g.pole}>
                {g.items.map((r) => (
                  <option key={r.key} value={r.key}>{r.title}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>{tr("Email de la recrue")}</label>
          <input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr("recrue@email.com")} aria-label={tr("Email de la recrue")} />
        </div>
      </div>
      <button
        type="button"
        disabled={pending || !email.trim()}
        style={{ ...primary, marginTop: 12, width: "100%", opacity: pending || !email.trim() ? 0.6 : 1 }}
        onClick={() => run(() => inviteStaffAction(roleKey, email), "Accès créé et lien envoyé par email.", () => setEmail(""))}
      >
        {pending ? "..." : tr("Donner l'accès")}
      </button>
      <p style={{ fontSize: 11, color: "rgba(245,237,237,0.4)", margin: "8px 0 0" }}>{tr("La recrue reçoit son lien de connexion et retrouve un espace adapté à son métier.")}</p>
      {note}
    </div>
  );
}

export function RevokeStaffInvite({ id }: { id: string }) {
  const tr = useT();
  const { pending, run, note } = useAction();
  return (
    <span>
      <button type="button" disabled={pending} style={ghost} onClick={() => run(() => revokeStaffInviteAction(id))}>
        <X size={12} />{" "}{tr("Retirer")}
      </button>
      {note}
    </span>
  );
}

export function StaffStatus({ userId, status }: { userId: string; status: string }) {
  const tr = useT();
  const { pending, run, note } = useAction();
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {status === "actif" ? (
        <button type="button" disabled={pending} style={ghost} onClick={() => run(() => setStaffStatusAction(userId, "suspendu"))}>
          {tr("Suspendre")}
        </button>
      ) : (
        <button type="button" disabled={pending} style={ghost} onClick={() => run(() => setStaffStatusAction(userId, "actif"))}>
          {tr("Réactiver")}
        </button>
      )}
      {status !== "termine" && (
        <button
          type="button"
          disabled={pending}
          style={ghost}
          onClick={() => {
            if (confirm("Mettre fin à cet accès ?")) run(() => setStaffStatusAction(userId, "termine"));
          }}
        >
          {tr("Fin de mission")}
        </button>
      )}
      {note}
    </span>
  );
}

// ── Paie ────────────────────────────────────────────────────────────────

const BASES: { value: string; label: string }[] = [
  { value: "aucun", label: "Fixe uniquement" },
  { value: "ventes_perso", label: "% de ses ventes" },
  { value: "ventes_equipe", label: "% des ventes de l'équipe sales" },
  { value: "setter", label: "Setter (4 % / 7 %)" },
  { value: "piece", label: "Forfait par livrable" },
];

export function PayConfigEditor({ userId, config }: { userId: string; config: { fixed_eur?: number | null; rate_pct?: number | null; base?: string; piece_eur?: number | null } }) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [base, setBase] = useState(config.base ?? "aucun");
  const [fixed, setFixed] = useState(config.fixed_eur == null ? "" : String(config.fixed_eur));
  const [rate, setRate] = useState(config.rate_pct == null ? "" : String(config.rate_pct));
  const [piece, setPiece] = useState(config.piece_eur == null ? "" : String(config.piece_eur));
  const { pending, run, note } = useAction();
  if (!open) {
    return (
      <button type="button" style={ghost} onClick={() => setOpen(true)}>
        <Pencil size={11} />{" "}{tr("Rémunération")}
      </button>
    );
  }
  return (
    <div style={{ width: "100%", marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
      <select style={{ ...input, gridColumn: "1 / -1" }} value={base} onChange={(e) => setBase(e.target.value)} aria-label={tr("Type de rémunération")}>
        {BASES.map((b) => (
          <option key={b.value} value={b.value}>{b.label}</option>
        ))}
      </select>
      <input style={input} inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value)} placeholder={tr("Fixe (€/mois)")} aria-label={tr("Fixe mensuel")} />
      {(base === "ventes_perso" || base === "ventes_equipe") && <input style={input} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder={tr("Taux (%)")} aria-label={tr("Taux")} />}
      {base === "piece" && <input style={input} inputMode="decimal" value={piece} onChange={(e) => setPiece(e.target.value)} placeholder={tr("€ par livrable")} aria-label={tr("Forfait par livrable")} />}
      <button type="button" disabled={pending} style={{ ...primary, gridColumn: "1 / -1" }} onClick={() => run(() => updatePayConfigAction(userId, { base, fixed_eur: fixed, rate_pct: rate, piece_eur: piece }), "Enregistré.", () => setOpen(false))}>
        {tr("Enregistrer")}
      </button>
      <div style={{ gridColumn: "1 / -1" }}>{note}</div>
    </div>
  );
}
