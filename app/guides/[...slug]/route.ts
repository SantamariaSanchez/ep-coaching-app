import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// This route handles /guides/[filename].html URLs used in email CTAs.
// It looks up the file in Supabase Storage by filename and serves it inline,
// injecting a CSS fix so the cover section doesn't occupy 100vh.
// Always returns the most recently uploaded file if there are duplicates.

const HTML_FIX_CSS = `<style>
  .cover { min-height: auto !important; padding: 80px 40px !important; }
  </style>`;

export async function GET(
    _request: Request,
  { params }: { params: Promise<{ slug: string[] }> }
  ) {
    const { slug } = await params;
    const filename = slug.join("/");
    const admin = createAdminClient();

  // Find the most recently uploaded resource matching this filename
  const { data: resources } = await admin
      .from("resources")
      .select("file_path, title, created_at")
      .ilike("file_path", `%${filename}`)
      .order("created_at", { ascending: false })
      .limit(1);

  const resource = resources?.[0];

  if (!resource) {
        return new NextResponse(`<html><body><h1>Ressource introuvable : ${filename}</h1></body></html>`, {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" },
        });
  }

  const { data: blob, error } = await admin.storage
      .from("resources")
      .download(resource.file_path);

  if (error || !blob) {
        return new NextResponse(`<html><body><h1>Fichier introuvable.</h1></body></html>`, {
                status: 404,
                headers: { "Content-Type": "text/html; charset=utf-8" },
        });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "html" || ext === "htm") {
        let htmlContent = await blob.text();
        htmlContent = htmlContent.replace("</head>", `${HTML_FIX_CSS}</head>`);
        return new NextResponse(htmlContent, {
                headers: {
                          "Content-Type": "text/html; charset=utf-8",
                          "Content-Disposition": "inline",
                          "Cache-Control": "no-cache",
                },
        });
  }

  return new NextResponse(blob, {
        headers: {
                "Content-Type": blob.type || "application/octet-stream",
                "Content-Disposition": "inline",
                "Cache-Control": "public, max-age=3600",
        },
  });
}
