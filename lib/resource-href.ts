// Pure helper, deliberately free of any supabase/server imports so it can be
// imported from client components too (utils/resources.ts pulls in the
// service-role admin client, which must never end up in a client bundle).
//
// Supabase's storage CDN forces Content-Type: text/plain (+ a sandboxed CSP)
// on "renderable" types like HTML/SVG when served from its public object
// URL — a deliberate guardrail so public buckets can't be used to host
// active content under the supabase.co domain. That's exactly why an
// uploaded HTML guide shows up as raw code instead of rendering. Routing
// those types through our own /api/resources/[id] proxy sidesteps it: the
// browser hits our domain, which sets the real Content-Type itself.
const RENDER_VIA_PROXY = [".html", ".htm", ".svg"];

export function getResourceHref(resource: { id: string; file_url: string }): string {
  const lower = resource.file_url.toLowerCase();
  if (RENDER_VIA_PROXY.some((ext) => lower.endsWith(ext))) {
    return `/api/resources/${resource.id}`;
  }
  return resource.file_url;
}

export type ResourceKind = "pdf" | "video" | "audio" | "image" | "archive" | "doc";

const KIND_EXTENSIONS: Record<ResourceKind, string[]> = {
  pdf: [".pdf"],
  video: [".mp4", ".webm", ".mov"],
  audio: [".mp3", ".wav"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
  archive: [".zip"],
  doc: [".html", ".htm"],
};

export function getResourceKind(fileUrl: string): ResourceKind {
  const lower = fileUrl.toLowerCase();
  for (const [kind, exts] of Object.entries(KIND_EXTENSIONS) as [ResourceKind, string[]][]) {
    if (exts.some((ext) => lower.includes(ext))) return kind;
  }
  return "doc";
}
