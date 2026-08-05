import { NextResponse } from "next/server";
import { getClientById } from "@/utils/auth";
import { requireCoach } from "@/lib/auth-guards";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const guard = await requireCoach();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 });

  const { clientId } = await params;
  const client = await getClientById(clientId, guard.userId);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ full_name: client.full_name });
}
