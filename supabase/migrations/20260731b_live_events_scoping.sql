-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Cloisonnement des Lives par coach
-- Exécute APRÈS 20260731_coach_posts_scoping.sql (dépend de my_coach_scope())
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : la policy de lecture sur live_events autorisait N'IMPORTE QUEL
-- utilisateur authentifié à lire N'IMPORTE QUEL live, y compris ceux d'un
-- autre coach. Combiné au fait que la page /dashboard/coach/live/[id]
-- forçait isHost=true sans vérifier host_id, un coach pouvait rejoindre le
-- live d'un autre coach en devinant son UUID et y apparaître comme hôte.
-- ═══════════════════════════════════════════════════════════════════════

drop policy if exists "Authenticated users can read live events" on public.live_events;
create policy "Members read their own coach's live events" on public.live_events
  for select using (
    auth.uid() = host_id
    or auth.uid() = invited_client_id
    or (type <> '1to1' and host_id = public.my_coach_scope())
  );
