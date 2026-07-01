import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Resources are public lead-magnet content (see /ressources), so this route
// intentionally has no auth check — same exposure as the direct Supabase
// public storage URL it replaces for HTML/SVG files.

const EXT_TO_MIME: Record<string, string> = {
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    svg: "image/svg+xml",
};

// CSS injected into HTML resources to fix cover section display
const HTML_FIX_CSS = `<style>
  .cover { min-height: auto !important; padding: 80px 40px !important; }
  </style>`;

export async function GET(
    _request: Request,
  { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const admin = createAdminClient();

        const { data: resource } = await admin
      .from("resources")
      .select("file_path, title")
      .eq("id", id)
      .single();

  if (!resource) {
        return NextResponse.json({ error: "Ressource introuvable." }, { status: 404 });
  }

  const { data: blob, error } = await admin.storage
      .from("resources")
      .download(resource.file_path);

  if (error || !blob) {
        return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }

  const ext = resource.file_path.split(".").pop()?.toLowerCase() ?? "";
    const contentType = EXT_TO_MIME[ext] ?? blob.type ?? "application/octet-stream";

  // For HTML files, inject a CSS fix so the cover section doesn't take 100vh
  if (ext === "html" || ext === "htm") {
        let htmlContent = await blob.text();
        htmlContent = htmlContent.replace("</head>", `${HTML_FIX_CSS}</head>`);
        return new NextResponse(htmlContent, {
                headers: {
                          "Content-Type": contentType,
                          "Content-Disposition": "inline",
                          "Cache-Control": "public, max-age=3600",
},
        });
}

  return new NextResponse(blob, {
    headers: {
        "Content-Type": contentType,
            "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600",
          },
  });
          }
