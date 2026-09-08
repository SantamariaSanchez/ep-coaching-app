import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/admin-notify";
import { sendBrevoEmail } from "@/utils/brevo";
import { wrapBrandedEmail } from "@/lib/mailing-audience";
import { INACTIVITY_DELETE_DAYS, INACTIVITY_WARN_DAYS } from "@/lib/free-tier";

// Suppression des comptes gratuits abandonnés (voir lib/free-tier.ts et CGU
// article 5). Distinct du verrou à 60 jours calculé dans le layout (celui-là
// se lève tout seul dès qu'un coach est pris) : ici, c'est une vraie
// suppression, mais réservée aux comptes qui n'ont JAMAIS remis les pieds sur
// l'appli, verrouillés ou non — le signal est la dernière connexion réelle
// (auth.users.last_sign_in_at), pas l'ancienneté du compte.
//
// Ne touche jamais un compte accompagné (subscription_status = "active") ni
// un coach : la clause CGU est explicite là-dessus.
//
// Deux avertissements avant suppression, portés par la même colonne
// deletion_warned_at (voir migration free_tier_limits_and_cgu) : le premier
// fixe la date, le second ne repart que si plus de 10 jours se sont écoulés
// depuis — avec le calendrier 40/55/60 jours ça ne se déclenche qu'une fois
// à chaque palier.
const WARN_REPEAT_GUARD_DAYS = 10;
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ep-coaching.vercel.app";

function daysSince(iso: string | null | undefined, now: number): number {
  if (!iso) return 0;
  return Math.floor((now - new Date(iso).getTime()) / 86_400_000);
}

interface CandidateRow {
  id: string;
  full_name: string | null;
  email: string | null;
  deletion_warned_at: string | null;
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();

  const { data: candidates } = await admin
    .from("profiles")
    .select("id, full_name, email, deletion_warned_at")
    .eq("role", "client")
    .neq("subscription_status", "active");

  const rows = (candidates as CandidateRow[] | null) ?? [];
  let deleted = 0;
  let warnedFirst = 0;
  let warnedFinal = 0;

  for (const row of rows) {
    // getUserById plutôt qu'un listUsers paginé : les candidats sont déjà
    // filtrés côté profiles (comptes gratuits uniquement), donc un lookup par
    // id reste bon marché même si la base grossit. auth.users n'est pas
    // exposé via PostgREST, seule l'API admin GoTrue l'est (voir
    // findOrphanAuthUserByEmail dans app/auth/client/actions.ts).
    const { data: userData } = await admin.auth.admin.getUserById(row.id);
    const lastActivity = userData?.user?.last_sign_in_at ?? userData?.user?.created_at ?? null;
    const inactiveDays = daysSince(lastActivity, now);

    if (inactiveDays >= INACTIVITY_DELETE_DAYS) {
      const { error } = await admin.auth.admin.deleteUser(row.id);
      if (!error) {
        deleted++;
        notifyAdmin("Compte gratuit supprimé pour inactivité", [
          `<strong>${row.full_name ?? "Utilisateur"}</strong> (${row.email ?? row.id})`,
          `${inactiveDays} jours sans connexion, 2 avertissements envoyés au préalable.`,
        ]).catch(() => {});
      }
      continue;
    }

    const warnedRecently =
      !!row.deletion_warned_at && daysSince(row.deletion_warned_at, now) < WARN_REPEAT_GUARD_DAYS;
    if (warnedRecently) continue;

    if (inactiveDays >= INACTIVITY_WARN_DAYS[1] && row.email) {
      // Dernier avertissement, ton volontairement plus pressant : demande
      // explicite du 2026-09-08, "au bout d'un moment dire oui c'est bientôt
      // la fin et c'est bientôt fini l'opportunité de ta vie".
      const daysLeft = Math.max(1, INACTIVITY_DELETE_DAYS - inactiveDays);
      const subject = "Dernier jour avant la suppression de ton compte";
      const sent = await sendBrevoEmail({
        to: row.email,
        subject,
        htmlContent: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 12px;font-size:18px;">${subject}</h2>
          <p style="margin:0 0 12px;">Salut ${row.full_name?.split(" ")[0] ?? ""},</p>
          <p style="margin:0 0 12px;">
            Ça fait ${inactiveDays} jours que tu ne t'es pas connecté. Dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""},
            ton compte et tout ton historique seront définitivement supprimés.
          </p>
          <p style="margin:0 0 16px;">
            Ce n'est pas une relance de plus : c'est la dernière. Si tu veux garder ce que tu as commencé,
            connecte-toi maintenant, ou passe directement en accompagnement pour ne plus jamais y penser.
          </p>
          <a href="${appUrl}/dashboard/client/abonnement"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">
            Me connecter maintenant
          </a>
        `),
      });
      if (sent) {
        warnedFinal++;
        await admin.from("profiles").update({ deletion_warned_at: new Date().toISOString() }).eq("id", row.id);
      }
    } else if (inactiveDays >= INACTIVITY_WARN_DAYS[0] && row.email) {
      const subject = "Ton compte EP Coaching va être supprimé si tu ne reviens pas";
      const sent = await sendBrevoEmail({
        to: row.email,
        subject,
        htmlContent: wrapBrandedEmail(`
          <h2 style="color:#E01E1E;margin:0 0 12px;font-size:18px;">${subject}</h2>
          <p style="margin:0 0 12px;">Salut ${row.full_name?.split(" ")[0] ?? ""},</p>
          <p style="margin:0 0 16px;">
            Ça fait ${inactiveDays} jours que tu n'as pas ouvert l'appli. Un compte laissé sans
            connexion pendant ${INACTIVITY_DELETE_DAYS} jours est supprimé automatiquement, avec
            tout ce qu'il contient. Il te reste encore un peu de temps pour revenir.
          </p>
          <a href="${appUrl}/dashboard/client"
             style="background:#E01E1E;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:700;">
            Ouvrir l'appli
          </a>
        `),
      });
      if (sent) {
        warnedFirst++;
        await admin.from("profiles").update({ deletion_warned_at: new Date().toISOString() }).eq("id", row.id);
      }
    }
  }

  return NextResponse.json({ ok: true, candidates: rows.length, deleted, warnedFirst, warnedFinal });
}
