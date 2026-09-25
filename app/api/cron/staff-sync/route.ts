import { NextResponse } from "next/server";
import { syncCalendly, syncPrequalifications } from "@/lib/staff-automation";

// Déclenché toutes les 5 minutes par pg_cron (migration
// 20260925b_staff_automation.sql). Fait entrer dans l'espace équipe ce qui
// arrive d'ailleurs : préqualifications (écrites par ep-coaching-formulaires)
// vers le CRM d'un setter, RDV Calendly vers l'agenda d'un closer.
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const prequalifications = await syncPrequalifications().catch(() => 0);
  const calendly = await syncCalendly().catch((e) => ({ ok: false, reason: String(e), created: 0, canceled: 0 }));
  return NextResponse.json({ ok: true, prequalifications, calendly });
}
