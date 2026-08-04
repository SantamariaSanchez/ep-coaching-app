-- ═══════════════════════════════════════════════════════════════════════
-- EP Coaching — Index manquants sur clés étrangères (advisors performance)
-- Exécute dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════
-- Contexte : les advisors de performance Supabase remontent 52 clés
-- étrangères sans index de couverture ("unindexed_foreign_keys"), sur des
-- tables très filtrées par client_id/coach_id/author_id côté dashboard
-- (messages, workout_logs, programs, diet_plans, exercise_corrections,
-- notifications, reminders, client_tasks, community, formations...).
-- Sans index, chaque jointure ou ON DELETE CASCADE sur ces colonnes force
-- un scan complet de la table cible. Liste extraite directement des
-- advisors live (mcp Supabase get_advisors, catégorie performance), pas
-- devinée depuis les migrations. CREATE INDEX IF NOT EXISTS : rejouable
-- sans risque, aucun impact sur les données ni les policies RLS.
-- ═══════════════════════════════════════════════════════════════════════

-- Programmation (programmes, séances, exercices, diètes)
create index if not exists idx_programs_client_id on public.programs(client_id);
create index if not exists idx_program_days_program_id on public.program_days(program_id);
create index if not exists idx_exercises_day_id on public.exercises(day_id);
create index if not exists idx_sessions_program_id on public.sessions(program_id);
create index if not exists idx_session_sets_exercise_id on public.session_sets(exercise_id);
create index if not exists idx_session_sets_session_id on public.session_sets(session_id);
create index if not exists idx_diet_plans_client_id on public.diet_plans(client_id);
create index if not exists idx_diet_plans_created_by on public.diet_plans(created_by);
create index if not exists idx_diet_plan_meals_food_id on public.diet_plan_meals(food_id);
create index if not exists idx_diet_plan_meals_plan_id on public.diet_plan_meals(plan_id);
create index if not exists idx_diet_plan_template_meals_food_id on public.diet_plan_template_meals(food_id);
create index if not exists idx_saved_meal_items_food_id on public.saved_meal_items(food_id);

-- Suivi client (mesures, corrections, logs, photos, PR, tâches, suppléments)
create index if not exists idx_measurements_client_id on public.measurements(client_id);
create index if not exists idx_exercise_corrections_client_id on public.exercise_corrections(client_id);
create index if not exists idx_workout_logs_client_id on public.workout_logs(client_id);
create index if not exists idx_workout_logs_exercise_id on public.workout_logs(exercise_id);
create index if not exists idx_photo_updates_client_id on public.photo_updates(client_id);
create index if not exists idx_personal_records_client_id on public.personal_records(client_id);
create index if not exists idx_personal_records_session_id on public.personal_records(session_id);
create index if not exists idx_client_tasks_client_id on public.client_tasks(client_id);
create index if not exists idx_client_tasks_created_by on public.client_tasks(created_by);
create index if not exists idx_client_supplements_suggested_by on public.client_supplements(suggested_by);
create index if not exists idx_client_coaching_phases_changed_by on public.client_coaching_phases(changed_by);
create index if not exists idx_reminders_client_id on public.reminders(client_id);
create index if not exists idx_coach_notes_client_id on public.coach_notes(client_id);
create index if not exists idx_key_decisions_client_id on public.key_decisions(client_id);
create index if not exists idx_subscription_events_changed_by on public.subscription_events(changed_by);

-- Messagerie et notifications
create index if not exists idx_messages_sender_id on public.messages(sender_id);
create index if not exists idx_notifications_sender_id on public.notifications(sender_id);

-- Roadmap coach
create index if not exists idx_roadmaps_created_by on public.roadmaps(created_by);
create index if not exists idx_roadmap_phases_roadmap_id on public.roadmap_phases(roadmap_id);
create index if not exists idx_roadmap_objectives_roadmap_id on public.roadmap_objectives(roadmap_id);

-- Formations
create index if not exists idx_formation_sections_module_id on public.formation_sections(module_id);
create index if not exists idx_formation_lessons_section_id on public.formation_lessons(section_id);
create index if not exists idx_formation_progress_lesson_id on public.formation_progress(lesson_id);

-- Communauté et ressources
create index if not exists idx_community_posts_author_id on public.community_posts(author_id);
create index if not exists idx_community_comments_author_id on public.community_comments(author_id);
create index if not exists idx_community_recipes_author_id on public.community_recipes(author_id);
create index if not exists idx_coach_posts_author_id on public.coach_posts(author_id);
create index if not exists idx_resources_created_by on public.resources(created_by);
create index if not exists idx_resource_requests_author_id on public.resource_requests(author_id);
create index if not exists idx_resource_requests_resource_id on public.resource_requests(resource_id);
create index if not exists idx_science_articles_created_by on public.science_articles(created_by);
create index if not exists idx_science_studies_created_by on public.science_studies(created_by);
create index if not exists idx_exercise_library_created_by on public.exercise_library(created_by);
create index if not exists idx_gyms_created_by on public.gyms(created_by);
create index if not exists idx_gym_reviews_author_id on public.gym_reviews(author_id);

-- Lives
create index if not exists idx_live_events_host_id on public.live_events(host_id);
create index if not exists idx_live_events_invited_client_id on public.live_events(invited_client_id);
create index if not exists idx_live_event_rsvps_client_id on public.live_event_rsvps(client_id);
create index if not exists idx_live_flash_requests_client_id on public.live_flash_requests(client_id);
create index if not exists idx_live_flash_requests_live_event_id on public.live_flash_requests(live_event_id);
