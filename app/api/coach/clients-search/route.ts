import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth-guards";
import { getClients } from "@/utils/auth";

// Liste allégée (id + nom) pour la palette de commande (Cmd/Ctrl+K, voir
// components/ui/CommandPalette.tsx) — pas de champ sensible, juste de quoi
// chercher un client par nom. getClients() filtre déjà par coach_id, donc
// un coach ne voit jamais que SES propres clients ici.
export async function GET() {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const clients = await getClients(guard.userId);
  return NextResponse.json({
    clients: clients.map((c) => ({ id: c.id, full_name: c.full_name })),
  });
}
