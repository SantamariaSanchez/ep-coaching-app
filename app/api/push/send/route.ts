import { NextResponse } from "next/server";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json();
    const result = await sendPushToUser(userId, title, body, url);
    return NextResponse.json({ ok: result.ok, reason: result.reason });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
