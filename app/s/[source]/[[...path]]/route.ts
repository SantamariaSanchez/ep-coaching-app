import { NextResponse } from "next/server";
import { sourceRedirect } from "@/lib/source-links";

// Liens de bio et de mail suivis : voir lib/source-links.ts.
export async function GET(req: Request, { params }: { params: Promise<{ source: string; path?: string[] }> }) {
  const { source, path } = await params;
  const origin = new URL(req.url).origin;
  return NextResponse.redirect(`${origin}${sourceRedirect(source, path ?? []) ?? "/"}`, 307);
}
