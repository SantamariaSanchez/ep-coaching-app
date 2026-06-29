// Converts a Google Drive "share" link (file/d/ID/view, ?id=ID, etc.) into a
// directly embeddable image URL. Returns null if no file ID can be found —
// callers should fall back to an "open in Drive" link in that case.
export function driveImageUrl(link: string): string | null {
  if (!link) return null;
  const match = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/) ?? link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  const id = match?.[1];
  if (!id) return null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w2000`;
}
