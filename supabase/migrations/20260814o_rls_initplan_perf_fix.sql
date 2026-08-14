-- MASTERCLASS.md Axe I : durcissement/performance des policies RLS.
--
-- 1) "Clients manage their food logs" est un sous-ensemble strict de
--    "Users manage own food logs" (meme condition client_id = auth.uid(),
--    sans le OR is_own_coach en plus) -- policy redondante laissee par une
--    iteration anterieure, jamais nettoyee. Supprimee : la seconde policy
--    couvre deja tout ce que la premiere autorisait.
--
-- 2) Toutes les policies qui appellent auth.uid()/auth.jwt()/auth.role()
--    directement sont reecrites pour les envelopper dans un subselect
--    scalaire "(select auth.uid())" -- fix officiel documente par
--    Supabase (advisor auth_rls_initplan) : sans ca, Postgres reevalue la
--    fonction PAR LIGNE au lieu d'une seule fois par requete. Pure
--    reecriture syntaxique, aucun changement de comportement -- verifie
--    avant application (124 policies generees automatiquement depuis
--    pg_policies, revues une par une, zero double-wrap), et apres
--    application par un test avant/apres en simulant une session
--    utilisateur reelle sur food_logs (meme nombre de lignes visibles :
--    20 pour le proprietaire, 0 pour un autre client).
--
-- Resultat verifie via l'advisor Supabase : auth_rls_initplan passe de
-- 124 a 0.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-14.

drop policy if exists "Clients manage their food logs" on public.food_logs;

alter policy "Owner can manage their biometric insights" on public.biometric_insights
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Owner or coach can read biometric insights" on public.biometric_insights
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Owner can manage their biometric logs" on public.biometric_logs
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Owner or coach can read biometric logs" on public.biometric_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own check-ins" on public.check_ins
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own intake" on public.client_intake
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Client manages own supplements" on public.client_supplements
  using ((client_id = (select auth.uid())))
  with check ((client_id = (select auth.uid())));

alter policy "Client completes own tasks" on public.client_tasks
  using ((client_id = (select auth.uid())))
  with check ((client_id = (select auth.uid())));

alter policy "Client reads own tasks" on public.client_tasks
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Coach manages own availability" on public.coach_availability
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Own clients read availability" on public.coach_availability
  using (((coach_id = (select auth.uid())) OR is_own_coach_of_viewer(coach_id)));

alter policy "Coach manages own finance entries" on public.coach_finance_entries
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Coach manages own mailings" on public.coach_mailings
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Client reads own coach notes" on public.coach_notes
  using ((client_id = (select auth.uid())));

alter policy "Users manage their own post views" on public.coach_post_views
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "Coach creates their own posts" on public.coach_posts
  with check ((((select auth.uid()) = author_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text))))));

alter policy "Coach deletes their own posts" on public.coach_posts
  using (((select auth.uid()) = author_id));

alter policy "Coach manages their own posts" on public.coach_posts
  using (((select auth.uid()) = author_id));

alter policy "Coach manages own waitlist" on public.coaching_waitlist
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Member manages own waitlist entry" on public.coaching_waitlist
  using ((member_id = (select auth.uid())))
  with check ((member_id = (select auth.uid())));

alter policy "Authenticated users can create their own comments" on public.community_comments
  with check (((select auth.uid()) = author_id));

alter policy "Authenticated users can read comments" on public.community_comments
  using (((select auth.role()) = 'authenticated'::text));

alter policy "Author or coach can delete a comment" on public.community_comments
  using ((((select auth.uid()) = author_id) OR is_platform_owner()));

alter policy "Authenticated users can create their own posts" on public.community_posts
  with check (((select auth.uid()) = author_id));

alter policy "Authenticated users can read posts" on public.community_posts
  using (((select auth.role()) = 'authenticated'::text));

alter policy "Author or coach can delete a post" on public.community_posts
  using ((((select auth.uid()) = author_id) OR is_platform_owner()));

alter policy "Author or coach can update a post" on public.community_posts
  using ((((select auth.uid()) = author_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text))))));

alter policy "Authenticated users can create their own recipes" on public.community_recipes
  with check (((select auth.uid()) = author_id));

alter policy "Authenticated users can read recipes" on public.community_recipes
  using (((select auth.role()) = 'authenticated'::text));

alter policy "Author or coach can delete a recipe" on public.community_recipes
  using ((((select auth.uid()) = author_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text))))));

alter policy "Coach manages own content ideas" on public.content_ideas
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Users manage own daily logs" on public.daily_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own diet plan meals" on public.diet_plan_meals
  using ((EXISTS ( SELECT 1
   FROM diet_plans dp
  WHERE ((dp.id = diet_plan_meals.plan_id) AND ((dp.client_id = (select auth.uid())) OR is_own_coach(dp.client_id))))))
  with check ((EXISTS ( SELECT 1
   FROM diet_plans dp
  WHERE ((dp.id = diet_plan_meals.plan_id) AND ((dp.client_id = (select auth.uid())) OR is_own_coach(dp.client_id))))));

alter policy "Coach manages own diet plan template meals" on public.diet_plan_template_meals
  using ((EXISTS ( SELECT 1
   FROM diet_plan_templates t
  WHERE ((t.id = diet_plan_template_meals.template_id) AND (t.coach_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM diet_plan_templates t
  WHERE ((t.id = diet_plan_template_meals.template_id) AND (t.coach_id = (select auth.uid()))))));

alter policy "Coach manages own diet plan templates" on public.diet_plan_templates
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Users manage own diet plans" on public.diet_plans
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Client and own coach manage corrections" on public.exercise_corrections
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Exercises via program owner" on public.exercises
  using ((EXISTS ( SELECT 1
   FROM (program_days pd
     JOIN programs p ON ((p.id = pd.program_id)))
  WHERE ((pd.id = exercises.day_id) AND ((p.client_id = (select auth.uid())) OR is_own_coach(p.client_id))))));

alter policy "Users manage own food logs" on public.food_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users can create custom foods" on public.foods
  with check (((select auth.uid()) = created_by));

alter policy "Users manage their own lesson views" on public.formation_lesson_views
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "coach_manage_lessons" on public.formation_lessons
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text)))));

alter policy "coach_manage_modules" on public.formation_modules
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text)))));

alter policy "my_progress_delete" on public.formation_progress
  using (((select auth.uid()) = user_id));

alter policy "my_progress_read" on public.formation_progress
  using (((select auth.uid()) = user_id));

alter policy "my_progress_write" on public.formation_progress
  with check (((select auth.uid()) = user_id));

alter policy "coach_manage_sections" on public.formation_sections
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text)))));

alter policy "coach_manage_formations" on public.formations
  using ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text)))));

alter policy "Owner or coach reads gamification points" on public.gamification_points
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Client manages own rsvp" on public.live_event_rsvps
  using (((client_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM live_events e
  WHERE ((e.id = live_event_rsvps.event_id) AND (e.host_id = (select auth.uid())))))))
  with check ((client_id = (select auth.uid())));

alter policy "Coach can create live events" on public.live_events
  with check ((((select auth.uid()) = host_id) AND (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text))))));

alter policy "Coach can delete their live events" on public.live_events
  using (((select auth.uid()) = host_id));

alter policy "Coach can update their live events" on public.live_events
  using (((select auth.uid()) = host_id));

alter policy "Members read their own coach's live events" on public.live_events
  using ((((select auth.uid()) = host_id) OR ((select auth.uid()) = invited_client_id) OR ((type <> '1to1'::text) AND (host_id = my_coach_scope()))));

alter policy "Participants manage flash requests" on public.live_flash_requests
  using (((client_id = (select auth.uid())) OR (coach_id = (select auth.uid()))))
  with check (((client_id = (select auth.uid())) OR (coach_id = (select auth.uid()))));

alter policy "Users manage own measurements" on public.measurements
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own preferences" on public.member_preferences
  using (((id = (select auth.uid())) OR is_own_coach(id)))
  with check ((id = (select auth.uid())));

alter policy "Active clients and coach can send messages" on public.messages
  with check (((sender_id = (select auth.uid())) AND (((conversation_id = receiver_id) AND (is_own_coach(receiver_id) OR is_platform_owner())) OR ((conversation_id = (select auth.uid())) AND can_message_recipient(receiver_id) AND (can_open_conversation() OR conversation_opened_by((select auth.uid()), receiver_id))))));

alter policy "Message participants can read" on public.messages
  using (((sender_id = (select auth.uid())) OR (receiver_id = (select auth.uid()))));

alter policy "Users can update read status" on public.messages
  using (((select auth.uid()) = receiver_id));

alter policy "Users manage own habit logs" on public.mindset_habit_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check ((client_id = (select auth.uid())));

alter policy "Users manage own journal entries" on public.mindset_journal_entries
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check ((client_id = (select auth.uid())));

alter policy "Users manage own mindset profile" on public.mindset_profiles
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check ((client_id = (select auth.uid())));

alter policy "Users read own notifications" on public.notifications
  using (((user_id = (select auth.uid())) OR (recipient_id = (select auth.uid()))));

alter policy "Users update own notifications" on public.notifications
  using (((user_id = (select auth.uid())) OR (recipient_id = (select auth.uid()))));

alter policy "Client reads own nutrition profile" on public.nutrition_profiles
  using (((select auth.uid()) = client_id));

alter policy "Users manage own nutrition profile" on public.nutrition_profiles
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own period logs" on public.period_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "personal_photos owner delete" on public.personal_photos
  using ((client_id = (select auth.uid())));

alter policy "personal_photos owner insert" on public.personal_photos
  with check ((client_id = (select auth.uid())));

alter policy "personal_photos owner select" on public.personal_photos
  using ((client_id = (select auth.uid())));

alter policy "Clients manage their PRs" on public.personal_records
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Users insert own photos" on public.photo_updates
  with check ((client_id = (select auth.uid())));

alter policy "Users see own photos" on public.photo_updates
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Coach reads all profiles" on public.profiles
  using ((((select auth.uid()) = id) OR is_own_coach(id) OR is_platform_owner()));

alter policy "Users can read own profile" on public.profiles
  using (((select auth.uid()) = id));

alter policy "Users can update own profile" on public.profiles
  using (((select auth.uid()) = id));

alter policy "Program days via program owner" on public.program_days
  using ((EXISTS ( SELECT 1
   FROM programs p
  WHERE ((p.id = program_days.program_id) AND ((p.client_id = (select auth.uid())) OR is_own_coach(p.client_id))))));

alter policy "Coach manages own program template days" on public.program_template_days
  using ((EXISTS ( SELECT 1
   FROM program_templates t
  WHERE ((t.id = program_template_days.template_id) AND (t.coach_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM program_templates t
  WHERE ((t.id = program_template_days.template_id) AND (t.coach_id = (select auth.uid()))))));

alter policy "Coach manages own program template exercises" on public.program_template_exercises
  using ((EXISTS ( SELECT 1
   FROM (program_template_days d
     JOIN program_templates t ON ((t.id = d.template_id)))
  WHERE ((d.id = program_template_exercises.day_id) AND (t.coach_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM (program_template_days d
     JOIN program_templates t ON ((t.id = d.template_id)))
  WHERE ((d.id = program_template_exercises.day_id) AND (t.coach_id = (select auth.uid()))))));

alter policy "Coach manages own program templates" on public.program_templates
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Users delete own programs" on public.programs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own programs" on public.programs
  with check (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users see own programs" on public.programs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users update own programs" on public.programs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage their push sub" on public.push_subscriptions
  using (((select auth.uid()) = user_id))
  with check (((select auth.uid()) = user_id));

alter policy "Clients manage their reminders" on public.reminders
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Authenticated users can create their own requests" on public.resource_requests
  with check (((select auth.uid()) = author_id));

alter policy "Authenticated users can read requests" on public.resource_requests
  using (((select auth.role()) = 'authenticated'::text));

alter policy "Author or coach can delete a request" on public.resource_requests
  using ((((select auth.uid()) = author_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text))))));

alter policy "Author or coach can update a request" on public.resource_requests
  using ((((select auth.uid()) = author_id) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = (select auth.uid())) AND (profiles.role = 'coach'::text))))));

alter policy "Authenticated users can read resources" on public.resources
  using (((select auth.role()) = 'authenticated'::text));

alter policy "Roadmap objectives access" on public.roadmap_objectives
  using ((EXISTS ( SELECT 1
   FROM roadmaps
  WHERE ((roadmaps.id = roadmap_objectives.roadmap_id) AND ((roadmaps.client_id = (select auth.uid())) OR (roadmaps.created_by = (select auth.uid())))))));

alter policy "Roadmap objectives via roadmap owner" on public.roadmap_objectives
  using ((EXISTS ( SELECT 1
   FROM roadmaps r
  WHERE ((r.id = roadmap_objectives.roadmap_id) AND ((r.client_id = (select auth.uid())) OR is_own_coach(r.client_id))))));

alter policy "Roadmap phases access" on public.roadmap_phases
  using ((EXISTS ( SELECT 1
   FROM roadmaps
  WHERE ((roadmaps.id = roadmap_phases.roadmap_id) AND ((roadmaps.client_id = (select auth.uid())) OR (roadmaps.created_by = (select auth.uid())))))));

alter policy "Roadmap phases via roadmap owner" on public.roadmap_phases
  using ((EXISTS ( SELECT 1
   FROM roadmaps r
  WHERE ((r.id = roadmap_phases.roadmap_id) AND ((r.client_id = (select auth.uid())) OR is_own_coach(r.client_id))))));

alter policy "Coach manages own roadmap template milestones" on public.roadmap_template_milestones
  using ((EXISTS ( SELECT 1
   FROM roadmap_templates t
  WHERE ((t.id = roadmap_template_milestones.template_id) AND (t.coach_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM roadmap_templates t
  WHERE ((t.id = roadmap_template_milestones.template_id) AND (t.coach_id = (select auth.uid()))))));

alter policy "Coach manages own roadmap template phases" on public.roadmap_template_phases
  using ((EXISTS ( SELECT 1
   FROM roadmap_templates t
  WHERE ((t.id = roadmap_template_phases.template_id) AND (t.coach_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM roadmap_templates t
  WHERE ((t.id = roadmap_template_phases.template_id) AND (t.coach_id = (select auth.uid()))))));

alter policy "Coach manages own roadmap templates" on public.roadmap_templates
  using ((coach_id = (select auth.uid())))
  with check ((coach_id = (select auth.uid())));

alter policy "Active clients and coach manage roadmaps" on public.roadmaps
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Roadmap access" on public.roadmaps
  using ((((select auth.uid()) = client_id) OR ((select auth.uid()) = created_by)));

alter policy "Users manage own saved meal items" on public.saved_meal_items
  using ((EXISTS ( SELECT 1
   FROM saved_meals sm
  WHERE ((sm.id = saved_meal_items.saved_meal_id) AND (sm.owner_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM saved_meals sm
  WHERE ((sm.id = saved_meal_items.saved_meal_id) AND (sm.owner_id = (select auth.uid()))))));

alter policy "Users manage own saved meals" on public.saved_meals
  using ((owner_id = (select auth.uid())))
  with check ((owner_id = (select auth.uid())));

alter policy "Users manage own schedule blocks" on public.schedule_blocks
  using (((owner_id = (select auth.uid())) OR is_own_coach(owner_id)))
  with check (((owner_id = (select auth.uid())) OR is_own_coach(owner_id)));

alter policy "Own coach studies readable" on public.science_studies
  using (((created_by = (select auth.uid())) OR (created_by = ( SELECT profiles.coach_id
   FROM profiles
  WHERE (profiles.id = (select auth.uid()))))));

alter policy "Participant or coach reads study participants" on public.science_study_participants
  using (((participant_id = (select auth.uid())) OR is_own_coach(participant_id)));

alter policy "Clients manage their session sets" on public.session_sets
  using ((EXISTS ( SELECT 1
   FROM sessions
  WHERE ((sessions.id = session_sets.session_id) AND (sessions.client_id = (select auth.uid()))))));

alter policy "Users delete own session sets" on public.session_sets
  using ((EXISTS ( SELECT 1
   FROM sessions s
  WHERE ((s.id = session_sets.session_id) AND (s.client_id = (select auth.uid()))))));

alter policy "Users insert own session sets" on public.session_sets
  with check ((EXISTS ( SELECT 1
   FROM sessions s
  WHERE ((s.id = session_sets.session_id) AND (s.client_id = (select auth.uid()))))));

alter policy "Users see own session sets" on public.session_sets
  using ((EXISTS ( SELECT 1
   FROM sessions s
  WHERE ((s.id = session_sets.session_id) AND ((s.client_id = (select auth.uid())) OR is_own_coach(s.client_id))))));

alter policy "Users update own session sets" on public.session_sets
  using ((EXISTS ( SELECT 1
   FROM sessions s
  WHERE ((s.id = session_sets.session_id) AND ((s.client_id = (select auth.uid())) OR is_own_coach(s.client_id))))));

alter policy "Clients manage their sessions" on public.sessions
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Users insert own sessions" on public.sessions
  with check ((client_id = (select auth.uid())));

alter policy "Users see own sessions" on public.sessions
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users update own sessions" on public.sessions
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Owner can manage their step logs" on public.step_logs
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Owner or coach can read step logs" on public.step_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Owner can manage their routine items" on public.step_routine_items
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Owner or coach can read routine items" on public.step_routine_items
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Owner can manage their step settings" on public.step_settings
  using (((select auth.uid()) = client_id))
  with check (((select auth.uid()) = client_id));

alter policy "Owner or coach can read step settings" on public.step_settings
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Client and coach see subscription history" on public.subscription_events
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)));

alter policy "Users manage own workout logs" on public.workout_logs
  using (((client_id = (select auth.uid())) OR is_own_coach(client_id)))
  with check ((client_id = (select auth.uid())));
