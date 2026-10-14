-- Retour de check-in en message vocal : chemin du fichier audio (bucket
-- coach-videos, même règles d'accès que la vidéo du coach) et types audio
-- autorisés dans le bucket. Ré-exécutable sans erreur.
alter table public.check_ins add column if not exists coach_audio_path text;
update storage.buckets
set allowed_mime_types = array['video/webm','video/mp4','video/quicktime','audio/webm','audio/mp4','audio/mpeg','audio/ogg','audio/aac','audio/x-m4a']
where id = 'coach-videos';
