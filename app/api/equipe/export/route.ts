import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { requireStaff } from "@/lib/staff";
import { allowedKinds, RECORD_KINDS, type RecordKind } from "@/lib/staff-roles";
import type { StaffRecord } from "@/lib/staff-kpis";
import { csvFilename, isMonthKey, recordMonth, recordsToCsv } from "@/lib/staff-csv";
import { enforceRateLimit, PRESETS } from "@/lib/rate-limit";

const RECORD_FIELDS = "id, staff_id, kind, title, status, amount, occurred_on, due_at, data, created_at, updated_at";

// Export CSV d'un tableau métier (trésorerie, CRM, tickets…).
// - une recrue exporte SES fiches, et seulement un type que son métier a ;
// - le fondateur exporte celles de n'importe quel membre de SON équipe
//   (?membre=<user_id>).
// ?mois=AAAA-MM limite au mois, sinon tout l'historique.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const month = url.searchParams.get("mois");
  const memberParam = url.searchParams.get("membre");

  if (!kindParam || !(RECORD_KINDS as readonly string[]).includes(kindParam) || kindParam === "report") {
    return NextResponse.json({ error: "Type de données inconnu." }, { status: 400 });
  }
  const kind = kindParam as Exclude<RecordKind, "report">;
  if (month && !isMonthKey(month)) return NextResponse.json({ error: "Mois invalide." }, { status: 400 });

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const limited = await enforceRateLimit(`staff-export:${user.id}`, PRESETS.expensiveRead.limit, PRESETS.expensiveRead.windowSeconds);
  if (limited) return limited;

  const admin = createAdminClient();
  let targetId = user.id;
  let who = "";

  if (memberParam && memberParam !== user.id) {
    const { data: profile } = await admin.from("profiles").select("is_platform_owner").eq("id", user.id).maybeSingle();
    if (profile?.is_platform_owner !== true) return NextResponse.json({ error: "Accès non autorisé." }, { status: 403 });
    const { data: row } = await admin
      .from("staff_members")
      .select("user_id, full_name")
      .eq("owner_id", user.id)
      .eq("user_id", memberParam)
      .maybeSingle();
    if (!row) return NextResponse.json({ error: "Membre introuvable." }, { status: 404 });
    targetId = row.user_id as string;
    who = row.full_name as string;
  } else {
    // Même garde que les actions de l'espace (double authentification comprise).
    const guard = await requireStaff();
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });
    const { member } = guard;
    if (!allowedKinds(member.role_key).includes(kind)) return NextResponse.json({ error: "Ce tableau n'existe pas pour ton métier." }, { status: 403 });
    who = member.full_name;
  }

  const { data } = await admin
    .from("staff_records")
    .select(RECORD_FIELDS)
    .eq("staff_id", targetId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(5000);
  let records = ((data as StaffRecord[]) ?? []).map((r) => ({
    ...r,
    amount: r.amount === null || r.amount === undefined ? null : Number(r.amount),
    data: (r.data as Record<string, unknown>) ?? {},
  }));
  if (month) records = records.filter((r) => recordMonth(r) === month);
  records.sort((a, b) => (a.occurred_on ?? a.created_at).localeCompare(b.occurred_on ?? b.created_at));

  return new NextResponse(recordsToCsv(kind, records), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(kind, who, month)}"`,
      "Cache-Control": "no-store",
    },
  });
}
