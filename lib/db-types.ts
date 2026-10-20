import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase passé explicitement à une lecture (paramètre `db`
 * optionnel des utilitaires). Absent : la session de la personne connectée
 * (RLS). Fourni : uniquement par l'aperçu « Voir comme mon client », après un
 * contrôle d'accès strict (lib/client-preview.ts), pour lire les données du
 * client avec le client admin sans dépendre des politiques RLS du lecteur.
 */
export type Db = SupabaseClient;
