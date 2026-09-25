import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { nowInParis } from "@/lib/dates";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { escapeHtml } from "@/lib/sanitize";
import { notifyUser } from "@/lib/notify";
import { notifyAdmin } from "@/lib/admin-notify";
import { getRoleCard } from "@/lib/staff-roles";
import { getPlaybook } from "@/lib/staff-playbooks";
import { computeNextActions } from "@/lib/staff-next-actions";
import { computeKpis, parisDate, todayAgenda, type StaffRecord } from "@/lib/staff-kpis";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";
const RECORD_FIELDS = "id, staff_id, kind, title, status, amount, occurred_on, due_at, data, created_at, updated_at";

interface Member {
  user_id: string;
  role_key: string;
  full_name: string;
  email: string;
}

async function loadTeam(): Promise<{ members: Member[]; records: Map<string, StaffRecord[]> }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff_members")
    .select("user_id, role_key, full_name, email")
    .eq("status", "actif")
    .not("contract_signed_at", "is", null);
  const members = (data as Member[]) ?? [];
  const records = new Map<string, StaffRecord[]>();
  if (members.length === 0) return { members, records };
  const { data: rows } = await admin
    .from("staff_records")
    .select(RECORD_FIELDS)
    .in("staff_id", members.map((m) => m.user_id))
    .order("created_at", { ascending: false })
    .limit(10_000);
  for (const r of (rows as StaffRecord[]) ?? []) {
    const row = { ...r, amount: r.amount === null ? null : Number(r.amount), data: r.data ?? {} };
    const list = records.get(r.staff_id) ?? [];
    list.push(row);
    records.set(r.staff_id, list);
  }
  return { members, records };
}

// Briefing du matin : la journée de la personne, déjà triée pour elle.
function briefingHtml(m: Member, records: StaffRecord[], isoDow: number): string {
  const role = getRoleCard(m.role_key)?.role.title ?? m.role_key;
  const pb = getPlaybook(m.role_key);
  const actions = computeNextActions(m.role_key, records).slice(0, 6);
  const agenda = todayAgenda(records);
  const rituals = pb?.rituals.filter((r) => r.day === isoDow) ?? [];
  const firstName = m.full_name.split(" ")[0];
  const li = (items: string[]) =>
    `<ul style="margin:0 0 14px;padding-left:18px;color:rgba(245,237,237,0.85);font-size:13px;">${items.map((i) => `<li style="margin:0 0 5px;">${i}</li>`).join("")}</ul>`;

  const blocks: string[] = [
    `<p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#E01E1E;">${escapeHtml(role)}</p>`,
    `<h1 style="margin:0 0 14px;font-size:20px;font-weight:800;color:#ffffff;line-height:1.3;">Bonjour ${escapeHtml(firstName)}, voici ta journée</h1>`,
  ];
  if (agenda.length) {
    blocks.push(`<h3 style="margin:14px 0 6px;font-size:13px;color:#ffffff;">Rendez-vous</h3>`);
    blocks.push(li(agenda.map((a) => `<strong>${new Date(a.due_at!).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" })}</strong> ${escapeHtml(a.title)}`)));
  }
  blocks.push(`<h3 style="margin:14px 0 6px;font-size:13px;color:#ffffff;">À faire en priorité</h3>`);
  blocks.push(actions.length ? li(actions.map((a) => `${escapeHtml(a.title)}${a.detail ? `<br/><span style="color:rgba(245,237,237,0.55);font-size:12px;">${escapeHtml(a.detail)}</span>` : ""}`)) : `<p style="margin:0 0 14px;color:#4ade80;">Rien en retard, tu pars propre.</p>`);
  if (pb) {
    blocks.push(`<h3 style="margin:14px 0 6px;font-size:13px;color:#ffffff;">Ta routine</h3>`);
    blocks.push(li(pb.routine.map((b) => `<strong>${b.start}</strong> ${escapeHtml(b.title)}`)));
  }
  if (rituals.length) {
    blocks.push(`<h3 style="margin:14px 0 6px;font-size:13px;color:#ffffff;">Rituel du jour</h3>`);
    blocks.push(li(rituals.map((r) => `<strong>${escapeHtml(r.title)}</strong> : ${escapeHtml(r.detail)}`)));
  }
  blocks.push(
    `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:10px auto 0;"><tr><td style="border-radius:10px;background:#E01E1E;"><a href="${APP_URL}/equipe" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:10px;">Ouvrir ma journée</a></td></tr></table>`
  );
  return wrapBrandedEmail(blocks.join(""));
}

// Déclenché toutes les heures par pg_cron ; l'heure de Paris décide de ce
// qui part (insensible aux changements d'heure) : 8h briefing, 18h rappel du
// rapport, 19h récapitulatif d'équipe au fondateur. Jours ouvrés seulement.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { isoDow, hhmm } = nowInParis();
  const hour = Number(hhmm.slice(0, 2));
  if (isoDow > 5 || ![8, 18, 19].includes(hour)) return NextResponse.json({ ok: true, skipped: hhmm });

  const { members, records } = await loadTeam();
  if (members.length === 0) return NextResponse.json({ ok: true, members: 0 });
  const today = parisDate(new Date());
  const reportedToday = (id: string) => (records.get(id) ?? []).some((r) => r.kind === "report" && r.occurred_on === today);

  if (hour === 8) {
    let sent = 0;
    for (const m of members) {
      const ok = await sendBrevoEmail({
        to: m.email,
        subject: `Ta journée du ${new Date().toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" })}`,
        htmlContent: briefingHtml(m, records.get(m.user_id) ?? [], isoDow),
      });
      if (ok) sent++;
    }
    return NextResponse.json({ ok: true, briefings: sent });
  }

  if (hour === 18) {
    const missing = members.filter((m) => !reportedToday(m.user_id));
    await Promise.allSettled(
      missing.map((m) =>
        notifyUser(m.user_id, { type: "staff", title: "Rapport du jour", body: "Deux minutes pour tes chiffres, ta victoire et ton blocage.", url: "/equipe/rapports" })
      )
    );
    return NextResponse.json({ ok: true, reminders: missing.length });
  }

  // 19h : ce que l'équipe a fait aujourd'hui, en une lecture.
  const lines = members.map((m) => {
    const role = getRoleCard(m.role_key)?.role.title ?? m.role_key;
    const top = computeKpis(m.role_key, records.get(m.user_id) ?? []).slice(0, 2).map((k) => `${k.label} : ${k.value}`).join(" · ");
    return `<strong>${escapeHtml(m.full_name)}</strong> (${escapeHtml(role)}) ${reportedToday(m.user_id) ? "rapport envoyé" : "<span style=\"color:#facc15\">pas de rapport</span>"}<br/><span style="opacity:0.7">${escapeHtml(top)}</span>`;
  });
  await notifyAdmin("Récap de l'équipe du jour", [...lines, `<a href="${APP_URL}/dashboard/coach/admin/equipe" style="color:#E01E1E">Ouvrir le pilotage de l'équipe</a>`]);
  return NextResponse.json({ ok: true, recap: members.length });
}
