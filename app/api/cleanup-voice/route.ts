import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch expired voice messages
    const { data: expiredMessages } = await supabase
      .from("messages")
      .select("id, voice_url")
      .eq("type", "voice")
      .lt("expires_at", new Date().toISOString())
      .not("voice_url", "is", null);

    // Delete files from storage
    for (const msg of expiredMessages ?? []) {
      if (msg.voice_url) {
        const parts = msg.voice_url.split("/voice-messages/");
        const path = parts[1];
        if (path) {
          await supabase.storage.from("voice-messages").remove([decodeURIComponent(path)]);
        }
      }
    }

    // Mark expired voice messages (wipe URL + change type)
    if ((expiredMessages ?? []).length > 0) {
      await supabase
        .from("messages")
        .update({ voice_url: null, content: "[Vocal expiré]", type: "text" })
        .eq("type", "voice")
        .lt("expires_at", new Date().toISOString())
        .not("voice_url", "is", null);
    }

    return Response.json({
      ok: true,
      cleaned: (expiredMessages ?? []).length,
    });
  } catch (e) {
    console.error("cleanup-voice error:", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
