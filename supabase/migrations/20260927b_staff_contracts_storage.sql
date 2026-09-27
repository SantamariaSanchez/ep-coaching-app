-- Contrats d'équipe en PDF (un modèle par poste + les PDF signés), bucket
-- privé "staff-contracts". Voir lib/staff-contract-files.ts.
--
-- L'appli n'accède à ces fichiers que par la service role (liens signés
-- générés côté serveur après vérification). Les policies ci-dessous sont un
-- second rempart si un client authentifié lisait un jour le bucket
-- directement : une recrue ne voit que le modèle de SON poste et SES
-- contrats signés, le fondateur voit tout, personne n'écrit.
-- Idempotent.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('staff-contracts', 'staff-contracts', false, 20971520, array['application/pdf'])
on conflict (id) do update set public = false, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff_contracts_read" on storage.objects;
create policy "staff_contracts_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'staff-contracts'
    and (
      -- Le fondateur (propriétaire de la plateforme) lit tout.
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_platform_owner = true)
      -- Une recrue active : le modèle de son poste...
      or (
        (storage.foldername(name))[1] = 'templates'
        and (storage.foldername(name))[2] = (
          select sm.role_key from public.staff_members sm where sm.user_id = auth.uid() and sm.status = 'actif'
        )
      )
      -- ...et ses propres contrats signés.
      or (
        (storage.foldername(name))[1] = 'signed'
        and (storage.foldername(name))[2] = auth.uid()::text
        and exists (select 1 from public.staff_members sm where sm.user_id = auth.uid())
      )
    )
  );

-- Chemin du dernier contrat signé, à côté de la signature. L'appli retrouve
-- aussi le fichier sans cette colonne (liste de signed/{staffId}/).
alter table public.staff_members add column if not exists signed_pdf_path text;

notify pgrst, 'reload schema';
