-- Bornes des saisies utilisateur, appliquees en base.
--
-- Pourquoi en base et pas seulement dans le code : dans cette app, une grande
-- partie des ecritures part directement du navigateur vers PostgREST (client
-- Supabase anon + RLS), sans passer par une route API ni une server action.
-- Une validation ecrite cote serveur ne couvre donc que les chemins qui
-- passent par le serveur ; une requete forgee avec le jeton de la personne
-- connectee contourne tout. La contrainte CHECK, elle, s applique a tout le
-- monde, quel que soit le chemin d ecriture.
--
-- Trois familles de contraintes :
--   * _len_chk    : longueur maximale des champs texte libres. Volontairement
--                   large (une note de seance a 5000 caracteres, une bio a
--                   2000) : un usage normal ne les atteint jamais, mais on ne
--                   peut plus ecrire des mega octets dans une colonne text.
--   * _range_chk  : bornes des champs numeriques (poids, calories, macros,
--                   quantites, series, pas). Empeche les valeurs absurdes ou
--                   negatives qui faussent tous les calculs et les moyennes.
--   * _scheme_chk : les colonnes de lien rendues dans un href ne peuvent
--                   contenir qu une URL http/https. Sans ca, un lien en
--                   javascript: enregistre par un client s executait dans la
--                   session de celui qui clique, en general le coach.
--
-- Toutes les contraintes sont posees en NOT VALID : elles s appliquent
-- immediatement a toute nouvelle ecriture et a toute mise a jour, sans
-- reecrire ni bloquer les tables existantes. La validation des lignes
-- historiques est faite ensuite, separement.
--
-- Deja appliquee en production via le MCP Supabase le 2026-08-05.

alter table public.check_ins add constraint check_ins_additional_notes_len_chk check (additional_notes is null or length(additional_notes) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_attitude_explanation_len_chk check (attitude_explanation is null or length(attitude_explanation) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_biggest_win_len_chk check (biggest_win is null or length(biggest_win) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_biggest_win_2_len_chk check (biggest_win_2 is null or length(biggest_win_2) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_biggest_win_3_len_chk check (biggest_win_3 is null or length(biggest_win_3) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_bilan_text_len_chk check (bilan_text is null or length(bilan_text) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_client_notes_len_chk check (client_notes is null or length(client_notes) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_coach_notes_len_chk check (coach_notes is null or length(coach_notes) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_coach_questions_len_chk check (coach_questions is null or length(coach_questions) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_coach_video_path_len_chk check (coach_video_path is null or length(coach_video_path) <= 500) not valid;
alter table public.check_ins add constraint check_ins_digestion_review_len_chk check (digestion_review is null or length(digestion_review) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_energy_mood_len_chk check (energy_mood is null or length(energy_mood) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_entourage_support_len_chk check (entourage_support is null or length(entourage_support) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_improvement_reflection_len_chk check (improvement_reflection is null or length(improvement_reflection) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_nutrition_review_len_chk check (nutrition_review is null or length(nutrition_review) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_photo_drive_link_len_chk check (photo_drive_link is null or length(photo_drive_link) <= 2000) not valid;
alter table public.check_ins add constraint check_ins_physique_feeling_len_chk check (physique_feeling is null or length(physique_feeling) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_plan_adherence_feedback_len_chk check (plan_adherence_feedback is null or length(plan_adherence_feedback) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_sleep_review_len_chk check (sleep_review is null or length(sleep_review) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_training_review_len_chk check (training_review is null or length(training_review) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_upcoming_obstacles_len_chk check (upcoming_obstacles is null or length(upcoming_obstacles) <= 5000) not valid;
alter table public.check_ins add constraint check_ins_video_drive_link_len_chk check (video_drive_link is null or length(video_drive_link) <= 2000) not valid;
alter table public.check_ins add constraint check_ins_video_path_len_chk check (video_path is null or length(video_path) <= 500) not valid;
alter table public.check_ins add constraint check_ins_work_impact_len_chk check (work_impact is null or length(work_impact) <= 5000) not valid;
alter table public.client_coaching_phases add constraint client_coaching_phases_note_len_chk check (note is null or length(note) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_additional_notes_len_chk check (additional_notes is null or length(additional_notes) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_availability_len_chk check (availability is null or length(availability) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_cardio_preference_len_chk check (cardio_preference is null or length(cardio_preference) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_cheat_meal_impact_len_chk check (cheat_meal_impact is null or length(cheat_meal_impact) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_current_routine_len_chk check (current_routine is null or length(current_routine) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_dietary_restrictions_len_chk check (dietary_restrictions is null or length(dietary_restrictions) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_disliked_equipment_len_chk check (disliked_equipment is null or length(disliked_equipment) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_disliked_foods_len_chk check (disliked_foods is null or length(disliked_foods) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_exercises_problematic_len_chk check (exercises_problematic is null or length(exercises_problematic) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_exercises_that_work_len_chk check (exercises_that_work is null or length(exercises_that_work) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_goal_12_months_len_chk check (goal_12_months is null or length(goal_12_months) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_goal_3_months_len_chk check (goal_3_months is null or length(goal_3_months) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_gym_link_len_chk check (gym_link is null or length(gym_link) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_gym_name_len_chk check (gym_name is null or length(gym_name) <= 200) not valid;
alter table public.client_intake add constraint client_intake_health_issues_len_chk check (health_issues is null or length(health_issues) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_hormonal_contraceptive_len_chk check (hormonal_contraceptive is null or length(hormonal_contraceptive) <= 200) not valid;
alter table public.client_intake add constraint client_intake_how_coach_can_help_len_chk check (how_coach_can_help is null or length(how_coach_can_help) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_injuries_len_chk check (injuries is null or length(injuries) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_known_nutrition_text_len_chk check (known_nutrition_text is null or length(known_nutrition_text) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_liked_foods_len_chk check (liked_foods is null or length(liked_foods) <= 2000) not valid;
alter table public.client_intake add constraint client_intake_occupation_len_chk check (occupation is null or length(occupation) <= 200) not valid;
alter table public.client_intake add constraint client_intake_preferred_split_len_chk check (preferred_split is null or length(preferred_split) <= 200) not valid;
alter table public.client_intake add constraint client_intake_session_duration_len_chk check (session_duration is null or length(session_duration) <= 100) not valid;
alter table public.client_intake add constraint client_intake_typical_day_len_chk check (typical_day is null or length(typical_day) <= 5000) not valid;
alter table public.client_intake add constraint client_intake_wearable_device_len_chk check (wearable_device is null or length(wearable_device) <= 100) not valid;
alter table public.client_intake add constraint client_intake_work_hours_len_chk check (work_hours is null or length(work_hours) <= 200) not valid;
alter table public.client_supplements add constraint client_supplements_dosage_len_chk check (dosage is null or length(dosage) <= 120) not valid;
alter table public.client_supplements add constraint client_supplements_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.client_supplements add constraint client_supplements_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.client_supplements add constraint client_supplements_timing_len_chk check (timing is null or length(timing) <= 120) not valid;
alter table public.client_tasks add constraint client_tasks_icon_len_chk check (icon is null or length(icon) <= 60) not valid;
alter table public.client_tasks add constraint client_tasks_label_len_chk check (label is null or length(label) <= 300) not valid;
alter table public.coach_notes add constraint coach_notes_next_actions_len_chk check (next_actions is null or length(next_actions) <= 10000) not valid;
alter table public.coach_notes add constraint coach_notes_nutrition_adjustments_len_chk check (nutrition_adjustments is null or length(nutrition_adjustments) <= 10000) not valid;
alter table public.coach_notes add constraint coach_notes_observations_len_chk check (observations is null or length(observations) <= 10000) not valid;
alter table public.coach_notes add constraint coach_notes_phase_len_chk check (phase is null or length(phase) <= 100) not valid;
alter table public.coach_notes add constraint coach_notes_program_adjustments_len_chk check (program_adjustments is null or length(program_adjustments) <= 10000) not valid;
alter table public.coach_posts add constraint coach_posts_content_len_chk check (content is null or length(content) <= 20000) not valid;
alter table public.coach_posts add constraint coach_posts_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.community_comments add constraint community_comments_content_len_chk check (content is null or length(content) <= 3000) not valid;
alter table public.community_posts add constraint community_posts_content_len_chk check (content is null or length(content) <= 5000) not valid;
alter table public.community_posts add constraint community_posts_image_url_len_chk check (image_url is null or length(image_url) <= 2000) not valid;
alter table public.community_recipes add constraint community_recipes_meal_len_chk check (meal is null or length(meal) <= 60) not valid;
alter table public.community_recipes add constraint community_recipes_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.community_recipes add constraint community_recipes_region_len_chk check (region is null or length(region) <= 100) not valid;
alter table public.community_recipes add constraint community_recipes_temp_len_chk check (temp is null or length(temp) <= 40) not valid;
alter table public.community_recipes add constraint community_recipes_tip_len_chk check (tip is null or length(tip) <= 2000) not valid;
alter table public.daily_logs add constraint daily_logs_cardio_len_chk check (cardio is null or length(cardio) <= 200) not valid;
alter table public.daily_logs add constraint daily_logs_digestion_len_chk check (digestion is null or length(digestion) <= 60) not valid;
alter table public.daily_logs add constraint daily_logs_hunger_len_chk check (hunger is null or length(hunger) <= 60) not valid;
alter table public.daily_logs add constraint daily_logs_stress_len_chk check (stress is null or length(stress) <= 60) not valid;
alter table public.daily_logs add constraint daily_logs_training_name_len_chk check (training_name is null or length(training_name) <= 200) not valid;
alter table public.daily_logs add constraint daily_logs_weight_time_len_chk check (weight_time is null or length(weight_time) <= 40) not valid;
alter table public.diet_plan_templates add constraint diet_plan_templates_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.diet_plan_templates add constraint diet_plan_templates_notes_len_chk check (notes is null or length(notes) <= 5000) not valid;
alter table public.diet_plan_templates add constraint diet_plan_templates_objective_len_chk check (objective is null or length(objective) <= 500) not valid;
alter table public.diet_plans add constraint diet_plans_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_client_question_len_chk check (client_question is null or length(client_question) <= 3000) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_coach_feedback_len_chk check (coach_feedback is null or length(coach_feedback) <= 5000) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_coach_video_link_len_chk check (coach_video_link is null or length(coach_video_link) <= 2000) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_coach_video_path_len_chk check (coach_video_path is null or length(coach_video_path) <= 500) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_exercise_name_len_chk check (exercise_name is null or length(exercise_name) <= 200) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_objective_len_chk check (objective is null or length(objective) <= 500) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_video_link_len_chk check (video_link is null or length(video_link) <= 2000) not valid;
alter table public.exercise_corrections add constraint exercise_corrections_video_path_len_chk check (video_path is null or length(video_path) <= 500) not valid;
alter table public.exercise_library add constraint exercise_library_accessibility_len_chk check (accessibility is null or length(accessibility) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_brand_len_chk check (brand is null or length(brand) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_easy_to_replicate_len_chk check (easy_to_replicate is null or length(easy_to_replicate) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_equipment_len_chk check (equipment is null or length(equipment) <= 200) not valid;
alter table public.exercise_library add constraint exercise_library_freedom_of_movement_len_chk check (freedom_of_movement is null or length(freedom_of_movement) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_instructions_len_chk check (instructions is null or length(instructions) <= 5000) not valid;
alter table public.exercise_library add constraint exercise_library_learning_difficulty_len_chk check (learning_difficulty is null or length(learning_difficulty) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_muscle_group_len_chk check (muscle_group is null or length(muscle_group) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_muscle_subgroup_len_chk check (muscle_subgroup is null or length(muscle_subgroup) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.exercise_library add constraint exercise_library_position_len_chk check (position is null or length(position) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_stability_demand_len_chk check (stability_demand is null or length(stability_demand) <= 100) not valid;
alter table public.exercise_library add constraint exercise_library_video_url_len_chk check (video_url is null or length(video_url) <= 2000) not valid;
alter table public.exercises add constraint exercises_muscle_group_len_chk check (muscle_group is null or length(muscle_group) <= 100) not valid;
alter table public.exercises add constraint exercises_muscle_subgroup_len_chk check (muscle_subgroup is null or length(muscle_subgroup) <= 100) not valid;
alter table public.exercises add constraint exercises_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.exercises add constraint exercises_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.exercises add constraint exercises_reps_len_chk check (reps is null or length(reps) <= 60) not valid;
alter table public.foods add constraint foods_category_len_chk check (category is null or length(category) <= 100) not valid;
alter table public.foods add constraint foods_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.formation_lessons add constraint formation_lessons_description_len_chk check (description is null or length(description) <= 5000) not valid;
alter table public.formation_lessons add constraint formation_lessons_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.formation_lessons add constraint formation_lessons_youtube_id_len_chk check (youtube_id is null or length(youtube_id) <= 100) not valid;
alter table public.formation_modules add constraint formation_modules_description_len_chk check (description is null or length(description) <= 5000) not valid;
alter table public.formation_modules add constraint formation_modules_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.formation_sections add constraint formation_sections_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.formations add constraint formations_color_len_chk check (color is null or length(color) <= 40) not valid;
alter table public.formations add constraint formations_description_len_chk check (description is null or length(description) <= 5000) not valid;
alter table public.formations add constraint formations_emoji_len_chk check (emoji is null or length(emoji) <= 20) not valid;
alter table public.formations add constraint formations_slug_len_chk check (slug is null or length(slug) <= 200) not valid;
alter table public.formations add constraint formations_subtitle_len_chk check (subtitle is null or length(subtitle) <= 300) not valid;
alter table public.formations add constraint formations_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.gym_reviews add constraint gym_reviews_comment_len_chk check (comment is null or length(comment) <= 3000) not valid;
alter table public.gyms add constraint gyms_address_len_chk check (address is null or length(address) <= 300) not valid;
alter table public.gyms add constraint gyms_city_len_chk check (city is null or length(city) <= 120) not valid;
alter table public.gyms add constraint gyms_equipment_notes_len_chk check (equipment_notes is null or length(equipment_notes) <= 2000) not valid;
alter table public.gyms add constraint gyms_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.gyms add constraint gyms_website_len_chk check (website is null or length(website) <= 2000) not valid;
alter table public.key_decisions add constraint key_decisions_decision_len_chk check (decision is null or length(decision) <= 2000) not valid;
alter table public.key_decisions add constraint key_decisions_reason_len_chk check (reason is null or length(reason) <= 2000) not valid;
alter table public.key_decisions add constraint key_decisions_result_len_chk check (result is null or length(result) <= 2000) not valid;
alter table public.key_decisions add constraint key_decisions_type_len_chk check (type is null or length(type) <= 100) not valid;
alter table public.live_events add constraint live_events_description_len_chk check (description is null or length(description) <= 5000) not valid;
alter table public.live_events add constraint live_events_guest_name_len_chk check (guest_name is null or length(guest_name) <= 200) not valid;
alter table public.live_events add constraint live_events_recap_len_chk check (recap is null or length(recap) <= 10000) not valid;
alter table public.live_events add constraint live_events_room_slug_len_chk check (room_slug is null or length(room_slug) <= 200) not valid;
alter table public.live_events add constraint live_events_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.live_flash_requests add constraint live_flash_requests_reason_len_chk check (reason is null or length(reason) <= 1000) not valid;
alter table public.measurements add constraint measurements_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.messages add constraint messages_content_len_chk check (content is null or length(content) <= 5000) not valid;
alter table public.messages add constraint messages_image_url_len_chk check (image_url is null or length(image_url) <= 2000) not valid;
alter table public.messages add constraint messages_video_url_len_chk check (video_url is null or length(video_url) <= 2000) not valid;
alter table public.messages add constraint messages_voice_url_len_chk check (voice_url is null or length(voice_url) <= 2000) not valid;
alter table public.mindset_journal_entries add constraint mindset_journal_entries_content_len_chk check (content is null or length(content) <= 10000) not valid;
alter table public.mindset_journal_entries add constraint mindset_journal_entries_prompt_key_len_chk check (prompt_key is null or length(prompt_key) <= 100) not valid;
alter table public.mindset_profiles add constraint mindset_profiles_environment_len_chk check (environment is null or length(environment) <= 2000) not valid;
alter table public.mindset_profiles add constraint mindset_profiles_main_obstacle_len_chk check (main_obstacle is null or length(main_obstacle) <= 2000) not valid;
alter table public.notifications add constraint notifications_body_len_chk check (body is null or length(body) <= 2000) not valid;
alter table public.notifications add constraint notifications_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.notifications add constraint notifications_type_len_chk check (type is null or length(type) <= 100) not valid;
alter table public.notifications add constraint notifications_url_len_chk check (url is null or length(url) <= 2000) not valid;
alter table public.period_logs add constraint period_logs_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.personal_photos add constraint personal_photos_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.personal_photos add constraint personal_photos_storage_path_len_chk check (storage_path is null or length(storage_path) <= 500) not valid;
alter table public.personal_records add constraint personal_records_exercise_name_len_chk check (exercise_name is null or length(exercise_name) <= 200) not valid;
alter table public.photo_updates add constraint photo_updates_category_len_chk check (category is null or length(category) <= 100) not valid;
alter table public.photo_updates add constraint photo_updates_coach_feedback_len_chk check (coach_feedback is null or length(coach_feedback) <= 5000) not valid;
alter table public.photo_updates add constraint photo_updates_drive_link_len_chk check (drive_link is null or length(drive_link) <= 2000) not valid;
alter table public.photo_updates add constraint photo_updates_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.photo_updates add constraint photo_updates_video_path_len_chk check (video_path is null or length(video_path) <= 500) not valid;
alter table public.profiles add constraint profiles_avatar_url_len_chk check (avatar_url is null or length(avatar_url) <= 500) not valid;
alter table public.profiles add constraint profiles_bio_len_chk check (bio is null or length(bio) <= 2000) not valid;
alter table public.profiles add constraint profiles_competition_category_len_chk check (competition_category is null or length(competition_category) <= 120) not valid;
alter table public.profiles add constraint profiles_email_len_chk check (email is null or length(email) <= 320) not valid;
alter table public.profiles add constraint profiles_external_payment_link_len_chk check (external_payment_link is null or length(external_payment_link) <= 500) not valid;
alter table public.profiles add constraint profiles_full_name_len_chk check (full_name is null or length(full_name) <= 120) not valid;
alter table public.profiles add constraint profiles_goal_len_chk check (goal is null or length(goal) <= 500) not valid;
alter table public.profiles add constraint profiles_instagram_len_chk check (instagram is null or length(instagram) <= 200) not valid;
alter table public.profiles add constraint profiles_instagram_handle_len_chk check (instagram_handle is null or length(instagram_handle) <= 60) not valid;
alter table public.profiles add constraint profiles_invite_code_len_chk check (invite_code is null or length(invite_code) <= 40) not valid;
alter table public.profiles add constraint profiles_level_len_chk check (level is null or length(level) <= 60) not valid;
alter table public.profiles add constraint profiles_phone_len_chk check (phone is null or length(phone) <= 40) not valid;
alter table public.profiles add constraint profiles_source_len_chk check (source is null or length(source) <= 200) not valid;
alter table public.program_days add constraint program_days_day_label_len_chk check (day_label is null or length(day_label) <= 200) not valid;
alter table public.program_template_days add constraint program_template_days_day_label_len_chk check (day_label is null or length(day_label) <= 200) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_muscle_group_len_chk check (muscle_group is null or length(muscle_group) <= 100) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_muscle_subgroup_len_chk check (muscle_subgroup is null or length(muscle_subgroup) <= 100) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_reps_len_chk check (reps is null or length(reps) <= 60) not valid;
alter table public.program_templates add constraint program_templates_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.program_templates add constraint program_templates_notes_len_chk check (notes is null or length(notes) <= 5000) not valid;
alter table public.program_templates add constraint program_templates_objective_len_chk check (objective is null or length(objective) <= 500) not valid;
alter table public.program_templates add constraint program_templates_type_len_chk check (type is null or length(type) <= 60) not valid;
alter table public.programs add constraint programs_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.reminders add constraint reminders_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.reminders add constraint reminders_time_len_chk check (time is null or length(time) <= 20) not valid;
alter table public.resource_requests add constraint resource_requests_coach_response_len_chk check (coach_response is null or length(coach_response) <= 5000) not valid;
alter table public.resource_requests add constraint resource_requests_content_len_chk check (content is null or length(content) <= 5000) not valid;
alter table public.resource_requests add constraint resource_requests_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.resources add constraint resources_category_len_chk check (category is null or length(category) <= 100) not valid;
alter table public.resources add constraint resources_description_len_chk check (description is null or length(description) <= 2000) not valid;
alter table public.resources add constraint resources_file_path_len_chk check (file_path is null or length(file_path) <= 500) not valid;
alter table public.resources add constraint resources_file_url_len_chk check (file_url is null or length(file_url) <= 2000) not valid;
alter table public.resources add constraint resources_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.roadmap_objectives add constraint roadmap_objectives_description_len_chk check (description is null or length(description) <= 2000) not valid;
alter table public.roadmap_objectives add constraint roadmap_objectives_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.roadmap_objectives add constraint roadmap_objectives_target_unit_len_chk check (target_unit is null or length(target_unit) <= 40) not valid;
alter table public.roadmap_phases add constraint roadmap_phases_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.roadmap_phases add constraint roadmap_phases_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.roadmap_template_milestones add constraint roadmap_template_milestones_description_len_chk check (description is null or length(description) <= 2000) not valid;
alter table public.roadmap_template_milestones add constraint roadmap_template_milestones_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.roadmap_template_milestones add constraint roadmap_template_milestones_target_unit_len_chk check (target_unit is null or length(target_unit) <= 40) not valid;
alter table public.roadmap_template_phases add constraint roadmap_template_phases_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.roadmap_template_phases add constraint roadmap_template_phases_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.roadmap_templates add constraint roadmap_templates_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.roadmap_templates add constraint roadmap_templates_notes_len_chk check (notes is null or length(notes) <= 5000) not valid;
alter table public.roadmap_templates add constraint roadmap_templates_objective_len_chk check (objective is null or length(objective) <= 500) not valid;
alter table public.saved_meals add constraint saved_meals_name_len_chk check (name is null or length(name) <= 200) not valid;
alter table public.schedule_blocks add constraint schedule_blocks_color_len_chk check (color is null or length(color) <= 40) not valid;
alter table public.schedule_blocks add constraint schedule_blocks_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.schedule_blocks add constraint schedule_blocks_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.science_studies add constraint science_studies_hypothesis_len_chk check (hypothesis is null or length(hypothesis) <= 5000) not valid;
alter table public.science_studies add constraint science_studies_protocol_len_chk check (protocol is null or length(protocol) <= 10000) not valid;
alter table public.science_studies add constraint science_studies_results_len_chk check (results is null or length(results) <= 10000) not valid;
alter table public.science_studies add constraint science_studies_title_len_chk check (title is null or length(title) <= 300) not valid;
alter table public.session_sets add constraint session_sets_exercise_name_len_chk check (exercise_name is null or length(exercise_name) <= 200) not valid;
alter table public.session_sets add constraint session_sets_muscle_group_len_chk check (muscle_group is null or length(muscle_group) <= 100) not valid;
alter table public.session_sets add constraint session_sets_notes_len_chk check (notes is null or length(notes) <= 2000) not valid;
alter table public.session_sets add constraint session_sets_reps_target_len_chk check (reps_target is null or length(reps_target) <= 60) not valid;
alter table public.session_sets add constraint session_sets_video_url_len_chk check (video_url is null or length(video_url) <= 2000) not valid;
alter table public.sessions add constraint sessions_day_label_len_chk check (day_label is null or length(day_label) <= 200) not valid;
alter table public.sessions add constraint sessions_notes_len_chk check (notes is null or length(notes) <= 5000) not valid;
alter table public.step_routine_items add constraint step_routine_items_label_len_chk check (label is null or length(label) <= 200) not valid;
alter table public.step_routine_items add constraint step_routine_items_time_label_len_chk check (time_label is null or length(time_label) <= 40) not valid;
alter table public.workout_logs add constraint workout_logs_exercise_name_len_chk check (exercise_name is null or length(exercise_name) <= 200) not valid;
alter table public.workout_logs add constraint workout_logs_muscle_group_len_chk check (muscle_group is null or length(muscle_group) <= 100) not valid;
alter table public.workout_logs add constraint workout_logs_reps_len_chk check (reps is null or length(reps) <= 60) not valid;
alter table public.biometric_logs add constraint biometric_logs_activity_calories_range_chk check (activity_calories is null or (activity_calories >= 0 and activity_calories <= 20000)) not valid;
alter table public.biometric_logs add constraint biometric_logs_body_temp_deviation_range_chk check (body_temp_deviation is null or (body_temp_deviation >= -20 and body_temp_deviation <= 20)) not valid;
alter table public.biometric_logs add constraint biometric_logs_hrv_ms_range_chk check (hrv_ms is null or (hrv_ms >= 0 and hrv_ms <= 500)) not valid;
alter table public.biometric_logs add constraint biometric_logs_readiness_score_range_chk check (readiness_score is null or (readiness_score >= 0 and readiness_score <= 100)) not valid;
alter table public.biometric_logs add constraint biometric_logs_resting_hr_range_chk check (resting_hr is null or (resting_hr >= 0 and resting_hr <= 300)) not valid;
alter table public.biometric_logs add constraint biometric_logs_sleep_hours_range_chk check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)) not valid;
alter table public.check_ins add constraint check_ins_calories_per_day_range_chk check (calories_per_day is null or (calories_per_day >= 0 and calories_per_day <= 20000)) not valid;
alter table public.check_ins add constraint check_ins_hrv_range_chk check (hrv is null or (hrv >= 0 and hrv <= 500)) not valid;
alter table public.check_ins add constraint check_ins_resting_hr_range_chk check (resting_hr is null or (resting_hr >= 0 and resting_hr <= 300)) not valid;
alter table public.check_ins add constraint check_ins_sleep_hours_range_chk check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)) not valid;
alter table public.check_ins add constraint check_ins_steps_per_day_range_chk check (steps_per_day is null or (steps_per_day >= 0 and steps_per_day <= 200000)) not valid;
alter table public.check_ins add constraint check_ins_week_number_range_chk check (week_number is null or (week_number >= 0 and week_number <= 1000)) not valid;
alter table public.check_ins add constraint check_ins_weight_range_chk check (weight is null or (weight >= 0 and weight <= 500)) not valid;
alter table public.check_ins add constraint check_ins_weight_avg_range_chk check (weight_avg is null or (weight_avg >= 0 and weight_avg <= 500)) not valid;
alter table public.client_intake add constraint client_intake_avg_daily_steps_range_chk check (avg_daily_steps is null or (avg_daily_steps >= 0 and avg_daily_steps <= 200000)) not valid;
alter table public.client_intake add constraint client_intake_cheat_meals_per_week_range_chk check (cheat_meals_per_week is null or (cheat_meals_per_week >= 0 and cheat_meals_per_week <= 50)) not valid;
alter table public.client_intake add constraint client_intake_cycle_length_days_range_chk check (cycle_length_days is null or (cycle_length_days >= 0 and cycle_length_days <= 200)) not valid;
alter table public.client_intake add constraint client_intake_height_cm_range_chk check (height_cm is null or (height_cm >= 50 and height_cm <= 300)) not valid;
alter table public.client_intake add constraint client_intake_known_calories_range_chk check (known_calories is null or (known_calories >= 0 and known_calories <= 20000)) not valid;
alter table public.client_intake add constraint client_intake_known_carbs_range_chk check (known_carbs is null or (known_carbs >= 0 and known_carbs <= 2000)) not valid;
alter table public.client_intake add constraint client_intake_known_fat_range_chk check (known_fat is null or (known_fat >= 0 and known_fat <= 2000)) not valid;
alter table public.client_intake add constraint client_intake_known_protein_range_chk check (known_protein is null or (known_protein >= 0 and known_protein <= 2000)) not valid;
alter table public.client_intake add constraint client_intake_meals_current_range_chk check (meals_current is null or (meals_current >= 0 and meals_current <= 20)) not valid;
alter table public.client_intake add constraint client_intake_meals_ideal_range_chk check (meals_ideal is null or (meals_ideal >= 0 and meals_ideal <= 20)) not valid;
alter table public.client_intake add constraint client_intake_resting_heart_rate_range_chk check (resting_heart_rate is null or (resting_heart_rate >= 0 and resting_heart_rate <= 300)) not valid;
alter table public.client_intake add constraint client_intake_sessions_current_range_chk check (sessions_current is null or (sessions_current >= 0 and sessions_current <= 30)) not valid;
alter table public.client_intake add constraint client_intake_sessions_desired_range_chk check (sessions_desired is null or (sessions_desired >= 0 and sessions_desired <= 30)) not valid;
alter table public.client_intake add constraint client_intake_sleep_hours_range_chk check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)) not valid;
alter table public.client_intake add constraint client_intake_supplement_budget_range_chk check (supplement_budget is null or (supplement_budget >= 0 and supplement_budget <= 100000)) not valid;
alter table public.community_recipes add constraint community_recipes_carbs_range_chk check (carbs is null or (carbs >= 0 and carbs <= 2000)) not valid;
alter table public.community_recipes add constraint community_recipes_fat_range_chk check (fat is null or (fat >= 0 and fat <= 2000)) not valid;
alter table public.community_recipes add constraint community_recipes_kcal_range_chk check (kcal is null or (kcal >= 0 and kcal <= 10000)) not valid;
alter table public.community_recipes add constraint community_recipes_prep_minutes_range_chk check (prep_minutes is null or (prep_minutes >= 0 and prep_minutes <= 1440)) not valid;
alter table public.community_recipes add constraint community_recipes_price_range_chk check (price is null or (price >= 0 and price <= 10)) not valid;
alter table public.community_recipes add constraint community_recipes_protein_range_chk check (protein is null or (protein >= 0 and protein <= 2000)) not valid;
alter table public.daily_logs add constraint daily_logs_calories_kcal_range_chk check (calories_kcal is null or (calories_kcal >= 0 and calories_kcal <= 20000)) not valid;
alter table public.daily_logs add constraint daily_logs_carbs_g_range_chk check (carbs_g is null or (carbs_g >= 0 and carbs_g <= 2000)) not valid;
alter table public.daily_logs add constraint daily_logs_fats_g_range_chk check (fats_g is null or (fats_g >= 0 and fats_g <= 2000)) not valid;
alter table public.daily_logs add constraint daily_logs_proteins_g_range_chk check (proteins_g is null or (proteins_g >= 0 and proteins_g <= 2000)) not valid;
alter table public.daily_logs add constraint daily_logs_sleep_hours_range_chk check (sleep_hours is null or (sleep_hours >= 0 and sleep_hours <= 24)) not valid;
alter table public.daily_logs add constraint daily_logs_sleep_rating_range_chk check (sleep_rating is null or (sleep_rating >= 0 and sleep_rating <= 100)) not valid;
alter table public.daily_logs add constraint daily_logs_steps_range_chk check (steps is null or (steps >= 0 and steps <= 200000)) not valid;
alter table public.daily_logs add constraint daily_logs_training_rating_range_chk check (training_rating is null or (training_rating >= 1 and training_rating <= 10)) not valid;
alter table public.daily_logs add constraint daily_logs_weight_morning_range_chk check (weight_morning is null or (weight_morning >= 0 and weight_morning <= 500)) not valid;
alter table public.diet_plan_meals add constraint diet_plan_meals_position_range_chk check (position is null or (position >= 0 and position <= 1000)) not valid;
alter table public.diet_plan_meals add constraint diet_plan_meals_quantity_g_range_chk check (quantity_g is null or (quantity_g >= 0 and quantity_g <= 100000)) not valid;
alter table public.exercises add constraint exercises_position_range_chk check (position is null or (position >= 0 and position <= 1000)) not valid;
alter table public.exercises add constraint exercises_rest_seconds_range_chk check (rest_seconds is null or (rest_seconds >= 0 and rest_seconds <= 7200)) not valid;
alter table public.exercises add constraint exercises_rir_range_chk check (rir is null or (rir >= 0 and rir <= 50)) not valid;
alter table public.exercises add constraint exercises_sets_range_chk check (sets is null or (sets >= 0 and sets <= 100)) not valid;
alter table public.food_logs add constraint food_logs_calories_range_chk check (calories is null or (calories >= 0 and calories <= 100000)) not valid;
alter table public.food_logs add constraint food_logs_carbs_range_chk check (carbs is null or (carbs >= 0 and carbs <= 100000)) not valid;
alter table public.food_logs add constraint food_logs_fats_range_chk check (fats is null or (fats >= 0 and fats <= 100000)) not valid;
alter table public.food_logs add constraint food_logs_fibers_range_chk check (fibers is null or (fibers >= 0 and fibers <= 100000)) not valid;
alter table public.food_logs add constraint food_logs_proteins_range_chk check (proteins is null or (proteins >= 0 and proteins <= 100000)) not valid;
alter table public.food_logs add constraint food_logs_quantity_g_range_chk check (quantity_g is null or (quantity_g >= 0 and quantity_g <= 100000)) not valid;
alter table public.foods add constraint foods_calories_per_100_range_chk check (calories_per_100 is null or (calories_per_100 >= 0 and calories_per_100 <= 1000)) not valid;
alter table public.foods add constraint foods_carbs_per_100_range_chk check (carbs_per_100 is null or (carbs_per_100 >= 0 and carbs_per_100 <= 100)) not valid;
alter table public.foods add constraint foods_fats_per_100_range_chk check (fats_per_100 is null or (fats_per_100 >= 0 and fats_per_100 <= 100)) not valid;
alter table public.foods add constraint foods_fibers_per_100_range_chk check (fibers_per_100 is null or (fibers_per_100 >= 0 and fibers_per_100 <= 100)) not valid;
alter table public.foods add constraint foods_proteins_per_100_range_chk check (proteins_per_100 is null or (proteins_per_100 >= 0 and proteins_per_100 <= 100)) not valid;
alter table public.measurements add constraint measurements_abdomen_range_chk check (abdomen is null or (abdomen >= 0 and abdomen <= 500)) not valid;
alter table public.measurements add constraint measurements_arm_flexed_range_chk check (arm_flexed is null or (arm_flexed >= 0 and arm_flexed <= 500)) not valid;
alter table public.measurements add constraint measurements_arm_relaxed_range_chk check (arm_relaxed is null or (arm_relaxed >= 0 and arm_relaxed <= 500)) not valid;
alter table public.measurements add constraint measurements_calf_range_chk check (calf is null or (calf >= 0 and calf <= 500)) not valid;
alter table public.measurements add constraint measurements_chest_range_chk check (chest is null or (chest >= 0 and chest <= 500)) not valid;
alter table public.measurements add constraint measurements_forearm_range_chk check (forearm is null or (forearm >= 0 and forearm <= 500)) not valid;
alter table public.measurements add constraint measurements_hips_range_chk check (hips is null or (hips >= 0 and hips <= 500)) not valid;
alter table public.measurements add constraint measurements_neck_range_chk check (neck is null or (neck >= 0 and neck <= 500)) not valid;
alter table public.measurements add constraint measurements_shoulders_range_chk check (shoulders is null or (shoulders >= 0 and shoulders <= 500)) not valid;
alter table public.measurements add constraint measurements_thigh_range_chk check (thigh is null or (thigh >= 0 and thigh <= 500)) not valid;
alter table public.measurements add constraint measurements_waist_range_chk check (waist is null or (waist >= 0 and waist <= 500)) not valid;
alter table public.measurements add constraint measurements_weight_range_chk check (weight is null or (weight >= 0 and weight <= 500)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_activity_level_range_chk check (activity_level is null or (activity_level >= 0 and activity_level <= 3000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_age_range_chk check (age is null or (age >= 5 and age <= 120)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_bmr_range_chk check (bmr is null or (bmr >= 0 and bmr <= 20000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_calories_offset_high_range_chk check (calories_offset_high is null or (calories_offset_high >= -5000 and calories_offset_high <= 5000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_calories_offset_rest_range_chk check (calories_offset_rest is null or (calories_offset_rest >= -5000 and calories_offset_rest <= 5000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_calories_target_range_chk check (calories_target is null or (calories_target >= 0 and calories_target <= 20000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_carbs_target_range_chk check (carbs_target is null or (carbs_target >= 0 and carbs_target <= 2000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_fats_target_range_chk check (fats_target is null or (fats_target >= 0 and fats_target <= 2000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_height_range_chk check (height is null or (height >= 50 and height <= 300)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_proteins_target_range_chk check (proteins_target is null or (proteins_target >= 0 and proteins_target <= 2000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_session_duration_range_chk check (session_duration is null or (session_duration >= 0 and session_duration <= 600)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_sessions_per_week_range_chk check (sessions_per_week is null or (sessions_per_week >= 0 and sessions_per_week <= 30)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_steps_per_day_range_chk check (steps_per_day is null or (steps_per_day >= 0 and steps_per_day <= 200000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_tdee_range_chk check (tdee is null or (tdee >= 0 and tdee <= 20000)) not valid;
alter table public.nutrition_profiles add constraint nutrition_profiles_weight_range_chk check (weight is null or (weight >= 20 and weight <= 500)) not valid;
alter table public.personal_records add constraint personal_records_reps_range_chk check (reps is null or (reps >= 0 and reps <= 1000)) not valid;
alter table public.personal_records add constraint personal_records_weight_kg_range_chk check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 1000)) not valid;
alter table public.profiles add constraint profiles_weight_start_range_chk check (weight_start is null or (weight_start >= 0 and weight_start <= 500)) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_position_range_chk check (position is null or (position >= 0 and position <= 1000)) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_rest_seconds_range_chk check (rest_seconds is null or (rest_seconds >= 0 and rest_seconds <= 7200)) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_rir_range_chk check (rir is null or (rir >= 0 and rir <= 50)) not valid;
alter table public.program_template_exercises add constraint program_template_exercises_sets_range_chk check (sets is null or (sets >= 0 and sets <= 100)) not valid;
alter table public.saved_meal_items add constraint saved_meal_items_quantity_g_range_chk check (quantity_g is null or (quantity_g >= 0 and quantity_g <= 100000)) not valid;
alter table public.session_sets add constraint session_sets_previous_weight_kg_range_chk check (previous_weight_kg is null or (previous_weight_kg >= 0 and previous_weight_kg <= 1000)) not valid;
alter table public.session_sets add constraint session_sets_reps_actual_range_chk check (reps_actual is null or (reps_actual >= 0 and reps_actual <= 1000)) not valid;
alter table public.session_sets add constraint session_sets_rest_duration_seconds_range_chk check (rest_duration_seconds is null or (rest_duration_seconds >= 0 and rest_duration_seconds <= 7200)) not valid;
alter table public.session_sets add constraint session_sets_rir_actual_range_chk check (rir_actual is null or (rir_actual >= 0 and rir_actual <= 50)) not valid;
alter table public.session_sets add constraint session_sets_rir_target_range_chk check (rir_target is null or (rir_target >= 0 and rir_target <= 50)) not valid;
alter table public.session_sets add constraint session_sets_set_number_range_chk check (set_number is null or (set_number >= 1 and set_number <= 200)) not valid;
alter table public.session_sets add constraint session_sets_weight_kg_range_chk check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 1000)) not valid;
alter table public.sessions add constraint sessions_duration_minutes_range_chk check (duration_minutes is null or (duration_minutes >= 0 and duration_minutes <= 1440)) not valid;
alter table public.sessions add constraint sessions_warmup_duration_seconds_range_chk check (warmup_duration_seconds is null or (warmup_duration_seconds >= 0 and warmup_duration_seconds <= 7200)) not valid;
alter table public.step_logs add constraint step_logs_steps_actual_range_chk check (steps_actual is null or (steps_actual >= 0 and steps_actual <= 200000)) not valid;
alter table public.workout_logs add constraint workout_logs_previous_weight_kg_range_chk check (previous_weight_kg is null or (previous_weight_kg >= 0 and previous_weight_kg <= 1000)) not valid;
alter table public.workout_logs add constraint workout_logs_rir_actual_range_chk check (rir_actual is null or (rir_actual >= 0 and rir_actual <= 50)) not valid;
alter table public.workout_logs add constraint workout_logs_sets_completed_range_chk check (sets_completed is null or (sets_completed >= 0 and sets_completed <= 200)) not valid;
alter table public.workout_logs add constraint workout_logs_weight_kg_range_chk check (weight_kg is null or (weight_kg >= 0 and weight_kg <= 1000)) not valid;
alter table public.check_ins add constraint check_ins_photo_drive_link_scheme_chk check (photo_drive_link is null or photo_drive_link = '' or photo_drive_link ~* '^https?://') not valid;
alter table public.check_ins add constraint check_ins_video_drive_link_scheme_chk check (video_drive_link is null or video_drive_link = '' or video_drive_link ~* '^https?://') not valid;
alter table public.community_posts add constraint community_posts_image_url_scheme_chk check (image_url is null or image_url = '' or image_url ~* '^https?://') not valid;
alter table public.exercise_corrections add constraint exercise_corrections_video_link_scheme_chk check (video_link is null or video_link = '' or video_link ~* '^https?://') not valid;
alter table public.exercise_corrections add constraint exercise_corrections_coach_video_link_scheme_chk check (coach_video_link is null or coach_video_link = '' or coach_video_link ~* '^https?://') not valid;
alter table public.exercise_library add constraint exercise_library_video_url_scheme_chk check (video_url is null or video_url = '' or video_url ~* '^https?://') not valid;
alter table public.gyms add constraint gyms_website_scheme_chk check (website is null or website = '' or website ~* '^https?://') not valid;
alter table public.messages add constraint messages_image_url_scheme_chk check (image_url is null or image_url = '' or image_url ~* '^https?://') not valid;
alter table public.messages add constraint messages_video_url_scheme_chk check (video_url is null or video_url = '' or video_url ~* '^https?://') not valid;
alter table public.messages add constraint messages_voice_url_scheme_chk check (voice_url is null or voice_url = '' or voice_url ~* '^https?://') not valid;
alter table public.photo_updates add constraint photo_updates_drive_link_scheme_chk check (drive_link is null or drive_link = '' or drive_link ~* '^https?://') not valid;
alter table public.profiles add constraint profiles_external_payment_link_scheme_chk check (external_payment_link is null or external_payment_link = '' or external_payment_link ~* '^https?://') not valid;
alter table public.resources add constraint resources_file_url_scheme_chk check (file_url is null or file_url = '' or file_url ~* '^https?://') not valid;
alter table public.session_sets add constraint session_sets_video_url_scheme_chk check (video_url is null or video_url = '' or video_url ~* '^https?://') not valid;
alter table public.notifications add constraint notifications_url_scheme_chk check (url is null or url = '' or url ~* '^https?://' or url ~ '^/[^/]') not valid;

-- Validation des lignes historiques : 351 des 353 contraintes passent sur les
-- donnees existantes. Les deux qui restent en NOT VALID le sont a cause de
-- lignes deja presentes et manifestement erronees (voir le rapport) :
--   * daily_logs.calories_kcal : une ligne a 258 562 kcal
--   * daily_logs.proteins_g    : une ligne a 100 000 000 g
-- Elles bloquent bien toute nouvelle ecriture hors bornes ; les lignes
-- historiques ne sont volontairement pas modifiees ici, c'est une decision
-- metier (corriger ou supprimer) qui appartient au fondateur.
