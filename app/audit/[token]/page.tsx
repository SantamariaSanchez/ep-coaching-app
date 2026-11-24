import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { AUDIT_STEPS_TEXT, isPrepToken } from "@/lib/audit-prep";
import { parisWhen } from "@/lib/sequences";
import PrepForm from "./PrepForm";

export const metadata: Metadata = { title: "Ton audit stratégique", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Page « Ton audit » : envoyée dans les rappels dès la réservation. Lien privé
// par rendez-vous, aucune connexion demandée.
export default async function AuditPrepPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isPrepToken(token)) notFound();
  const { data } = await createAdminClient()
    .from("prospect_bookings")
    .select("starts_at, name, status, join_url, prep_answers")
    .eq("prep_token", token)
    .maybeSingle();
  if (!data) notFound();
  const b = data as { starts_at: string; name: string | null; status: string; join_url: string | null; prep_answers: Record<string, string> | null };
  const first = (b.name ?? "").trim().split(/\s+/)[0];
  const canceled = b.status !== "active";

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "var(--ep-bg, #0D0000)", color: "var(--ep-ink)" }}>
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <p className="text-[11px] font-black uppercase tracking-widest opacity-50">EP Coaching</p>
          <h1 className="text-2xl font-black">{first ? `${first}, ton audit stratégique` : "Ton audit stratégique"}</h1>
          {canceled ? (
            <p className="text-[14px]">Ce rendez-vous a été annulé. Tu peux en reprendre un depuis le lien de ma bio.</p>
          ) : (
            <p className="text-[14px] opacity-85">On se parle {parisWhen(b.starts_at)}, pendant 30 minutes, en visio.</p>
          )}
        </header>

        {!canceled && (
          <>
            <section className="ep-card flex flex-col gap-2" style={{ padding: 16 }}>
              <h2 className="text-[13px] font-black uppercase tracking-wide">Comment ça se passe</h2>
              <ol className="flex flex-col gap-2 text-[14px] list-decimal pl-5">
                {AUDIT_STEPS_TEXT.map((s) => <li key={s}>{s}</li>)}
              </ol>
              <p className="text-[13px] opacity-75">Si tu as moins de 18 ans, un de tes parents est le bienvenu pendant l&apos;appel.</p>
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-[13px] font-black uppercase tracking-wide">Prépare-le en 2 minutes</h2>
              <p className="text-[14px] opacity-85">Tes réponses m&apos;arrivent avant l&apos;appel : on gagne du temps et on va direct à ce qui compte pour toi. Pas besoin que ce soit parfait.</p>
              <PrepForm token={token} initial={b.prep_answers ?? {}} />
            </section>

            {b.join_url && (
              <a href={b.join_url} className="text-[14px] font-bold underline" style={{ color: "var(--ep-accent)" }}>
                Le lien de l&apos;appel
              </a>
            )}
          </>
        )}
      </div>
    </main>
  );
}
