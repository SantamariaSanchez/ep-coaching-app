import { createAdminClient } from "@/lib/supabase-admin";
import { getPrioritizedCoachView } from "@/lib/coach-analytics";
import { notifyUser } from "@/lib/notify";

// Relance auto des clients "silencieux" (Axe 3, VISION.md). Ce point avait
// été volontairement laissé manuel le 2026-08-14 : "mériterait d'abord un
// retour d'usage sur cette page avant d'automatiser — sinon risque réel de
// sur-solliciter des clients qui vont très bien mais n'ont simplement pas
// eu de call récent." Repris directement sur décision de l'utilisatrice le
// 2026-08-20.
//
// Différent de coach-assistant-sweep (Axe AT), qui relance sur un signal de
// DONNÉES stagnantes (bilan pas rempli) : ici le signal est l'ABSENCE DE
// CONTACT HUMAIN (aucun call, passé ou déjà programmé, depuis 30+ jours) —
// un client peut être irréprochable côté logging et pourtant n'avoir jamais
// eu de vrai échange avec son coach. Les deux dimensions sont orthogonales,
// réutilise getPrioritizedCoachView (déjà la source de vérité de
// /dashboard/coach/prioritaires) plutôt que de redupliquer sa logique.
//
// Cooldown volontairement plus long (14j) que la stagnation multi-signal
// (7j, app/api/cron/stagnation-escalation) : signal plus doux, moins
// urgent, exactement le risque de sur-sollicitation identifié à l'époque.
const QUIET_RELANCE_COOLDOWN_DAYS = 14;

export interface QuietRelanceResult {
  relanced: number;
}

export async function relanceQuietClients(coachId: string): Promise<QuietRelanceResult> {
  const admin = createAdminClient();
  const { quiet } = await getPrioritizedCoachView(coachId);
  let relanced = 0;

  for (const c of quiet) {
    const { data: profile } = await admin
      .from("profiles")
      .select("last_quiet_relance_at")
      .eq("id", c.clientId)
      .maybeSingle();

    if (profile?.last_quiet_relance_at) {
      const daysSince = Math.floor(
        (Date.now() - new Date(profile.last_quiet_relance_at as string).getTime()) / 86400000
      );
      if (daysSince < QUIET_RELANCE_COOLDOWN_DAYS) continue;
    }

    await notifyUser(c.clientId, {
      type: "quiet_client_relance",
      title: "Ça fait un moment !",
      body: "Aucun signal qui cloche de ton côté, mais ça fait un moment qu'on n'a pas fait un vrai point ensemble. Réserve un call quand tu veux.",
      url: "/dashboard/client/live/reserver",
    });

    await notifyUser(coachId, {
      type: "quiet_client_relance_coach",
      title: `${c.clientName ?? "Un client"} n'a pas eu de call depuis ${c.lastContactDays ?? "longtemps"}${c.lastContactDays != null ? " jours" : ""}`,
      body: "Aucun signal négatif chez lui, juste une relance auto pour proposer un point. Un vrai message de ta part reste toujours mieux qu'une notif de plus.",
      url: `/dashboard/coach/clients/${c.clientId}`,
    });

    await admin
      .from("profiles")
      .update({ last_quiet_relance_at: new Date().toISOString() })
      .eq("id", c.clientId);
    relanced++;
  }

  return { relanced };
}
