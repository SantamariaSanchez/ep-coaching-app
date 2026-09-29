// Ce qu'on récupère pour chaque plateforme, avec les noms de champs exacts
// de Windsor (références : windsor.ai/data-field/{connecteur}/, relevées le
// 2026-09-29). Avant chaque synchro, ces listes sont filtrées par la liste
// réelle des champs disponibles (lib/social/windsor.ts, pickFields) : un
// champ absent n'est jamais demandé, il est signalé dans le journal.
//
// Chaque "rapport" est une requête Windsor distincte : mélanger des champs
// jour par jour, par publication et d'audience dans une même requête
// produirait des lignes croisées sans sens.

export type Platform = "tiktok" | "linkedin" | "youtube" | "facebook" | "instagram" | "threads";

export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  facebook: "Facebook",
  instagram: "Instagram",
  threads: "Threads",
};

/** Colonnes communes de social_account_daily et social_posts. */
export type DailyColumn =
  | "followers_total"
  | "followers_gained"
  | "followers_lost"
  | "views"
  | "reach"
  | "impressions"
  | "profile_views"
  | "likes"
  | "comments"
  | "shares"
  | "clicks"
  | "engagements"
  | "watch_time_seconds";

export type PostColumn =
  | "views"
  | "reach"
  | "impressions"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "clicks"
  | "new_followers"
  | "avg_watch_seconds"
  | "total_watch_seconds"
  | "completion_rate"
  | "engagement_rate";

export interface Mapping<C extends string> {
  field: string;
  column: C;
  /** Conversion vers l'unité de la colonne (ex : minutes ou ms en secondes). */
  scale?: number;
}

export interface AudienceReport {
  dimension: string;
  valueField: string;
  shareField?: string;
  countField?: string;
  /** Deuxième champ de valeur combiné (ex : âge + genre sur YouTube). */
  valueField2?: string;
}

export interface PostBreakdown {
  /** Clé dans social_posts.extra.breakdowns. */
  key: string;
  label: string;
  fields: string[];
}

export interface PlatformConfig {
  platform: Platform;
  connector: string;
  /**
   * Champ du total d'abonnés "au jour de la synchro" (pas d'historique) :
   * l'historique est alors reconstitué avec les gains et pertes du jour.
   */
  currentTotalField?: string;
  daily: { mappings: Mapping<DailyColumn>[]; extras: string[] } | null;
  posts: {
    idField: string;
    altIdFields?: string[];
    captionField?: string;
    typeField?: string;
    publishedField?: string;
    urlField?: string;
    thumbnailField?: string;
    durationField?: string;
    mappings: Mapping<PostColumn>[];
    extras: string[];
    /** Rapports complémentaires par publication, fusionnés dans les métriques. */
    supplements?: { fields: string[]; mappings: Mapping<PostColumn>[] }[];
  } | null;
  postBreakdowns: PostBreakdown[];
  audience: AudienceReport[];
  /** Limites connues, affichées dans le tableau de bord. */
  notes: string[];
}

export const PLATFORMS: Record<Platform, PlatformConfig> = {
  tiktok: {
    platform: "tiktok",
    connector: "tiktok_organic",
    daily: {
      mappings: [
        { field: "total_followers_count", column: "followers_total" },
        { field: "followers_count", column: "followers_gained" },
        { field: "daily_lost_followers", column: "followers_lost" },
        { field: "video_views", column: "views" },
        { field: "unique_video_views", column: "reach" },
        { field: "profile_views", column: "profile_views" },
        { field: "likes", column: "likes" },
        { field: "comments", column: "comments" },
        { field: "shares", column: "shares" },
        { field: "bio_link_clicks", column: "clicks" },
        { field: "engaged_audience", column: "engagements" },
      ],
      extras: ["daily_total_followers", "email_clicks", "lead_submissions", "videos_count", "total_likes", "phone_number_clicks", "address_clicks", "app_download_clicks", "following_count"],
    },
    posts: {
      idField: "video_id",
      captionField: "video_caption",
      publishedField: "video_create_datetime",
      urlField: "video_share_url",
      thumbnailField: "video_thumbnail_url",
      durationField: "video_duration",
      mappings: [
        { field: "video_views_count", column: "views" },
        { field: "video_reach", column: "reach" },
        { field: "video_likes", column: "likes" },
        { field: "video_comments", column: "comments" },
        { field: "video_shares", column: "shares" },
        { field: "video_favorites", column: "saves" },
        { field: "video_website_clicks", column: "clicks" },
        { field: "video_new_followers", column: "new_followers" },
        { field: "video_average_time_watched", column: "avg_watch_seconds" },
        { field: "video_total_time_watched", column: "total_watch_seconds" },
        { field: "video_full_watched_rate", column: "completion_rate" },
      ],
      extras: ["video_profile_views", "video_email_clicks", "video_lead_submissions", "video_phone_number_clicks", "video_address_clicks", "video_app_download_clicks", "video_embed_url"],
    },
    postBreakdowns: [
      { key: "sources", label: "Sources des vues", fields: ["video_impression_sources_impression_source", "video_impression_sources_percentage"] },
      { key: "retention", label: "Rétention seconde par seconde", fields: ["video_view_retention_second", "video_view_retention_percentage"] },
      { key: "likes_timeline", label: "Likes seconde par seconde", fields: ["video_engagement_likes_second", "video_engagement_likes_percentage"] },
      { key: "pays", label: "Pays des spectateurs", fields: ["video_audience_countries_country", "video_audience_countries_percentage"] },
      { key: "genre", label: "Genre des spectateurs", fields: ["video_audience_genders_gender", "video_audience_genders_percentage"] },
      { key: "type_audience", label: "Nouveaux ou fidèles", fields: ["video_audience_types_type", "video_audience_types_percentage"] },
    ],
    audience: [
      { dimension: "age", valueField: "audience_ages_age", shareField: "audience_ages_percentage" },
      { dimension: "genre", valueField: "audience_genders_gender", shareField: "audience_genders_percentage" },
      { dimension: "pays", valueField: "audience_countries_country", shareField: "audience_countries_percentage" },
      { dimension: "ville", valueField: "audience_cities_city_name", shareField: "audience_cities_percentage" },
      { dimension: "heure", valueField: "audience_activity_hour", countField: "audience_activity_count" },
    ],
    notes: ["TikTok ne fournit pas de données par heure de publication : le meilleur horaire est déduit de tes propres vidéos."],
  },
  linkedin: {
    platform: "linkedin",
    connector: "linkedin_organic",
    daily: {
      mappings: [
        { field: "organization_follower_count", column: "followers_total" },
        { field: "followers_gain_organic", column: "followers_gained" },
        { field: "account_analytics_impression_count", column: "impressions" },
        { field: "account_analytics_unique_impressions_count", column: "reach" },
        { field: "account_analytics_click_count", column: "clicks" },
        { field: "account_analytics_like_count", column: "likes" },
        { field: "account_analytics_comment_count", column: "comments" },
        { field: "account_analytics_share_count", column: "shares" },
        { field: "account_analytics_total_engagements", column: "engagements" },
        { field: "all_page_views", column: "profile_views" },
      ],
      extras: ["account_analytics_engagement", "all_unique_page_views", "followers_gain_paid", "all_desktop_page_views", "all_mobile_page_views", "desktop_custom_button_click_counts", "mobile_custom_button_click_counts"],
    },
    posts: {
      idField: "post_id",
      altIdFields: ["share_id", "ugc_post_id"],
      captionField: "share_text",
      typeField: "share_post_type",
      publishedField: "share_published_time",
      urlField: "share_url",
      thumbnailField: "share_image_url",
      mappings: [
        { field: "share_impression_count", column: "impressions" },
        { field: "share_unique_impressions_count", column: "reach" },
        { field: "share_clicks_count", column: "clicks" },
        { field: "share_like_count", column: "likes" },
        { field: "share_comment_count", column: "comments" },
        { field: "share_share_count", column: "shares" },
        { field: "share_engagement_rate", column: "engagement_rate" },
        { field: "share_video_views", column: "views" },
        { field: "share_video_watch_time", column: "total_watch_seconds", scale: 0.001 },
      ],
      extras: ["share_media_category", "share_title", "share_thumbnail", "share_total_engagements", "ctr", "share_video_viewers", "share_video_view_rate", "share_mention_count"],
    },
    postBreakdowns: [],
    audience: [
      { dimension: "fonction", valueField: "function_follower_type", countField: "function_follower_counts" },
      { dimension: "seniorite", valueField: "seniority_follower_type", countField: "seniority_follower_counts" },
      { dimension: "secteur", valueField: "industry_follower_type", countField: "industry_follower_counts" },
      { dimension: "pays", valueField: "country_follower_name", countField: "country_follower_counts" },
      { dimension: "region", valueField: "region_follower_name", countField: "region_follower_counts" },
      { dimension: "taille_entreprise", valueField: "staff_follower_range", countField: "staff_follower_counts" },
      { dimension: "vues_fonction", valueField: "page_function", countField: "page_views_by_function" },
      { dimension: "vues_seniorite", valueField: "page_seniority", countField: "page_views_by_seniority" },
      { dimension: "vues_secteur", valueField: "page_industry", countField: "page_views_by_industry" },
      { dimension: "vues_pays", valueField: "page_country", countField: "page_views_by_country" },
      { dimension: "vues_taille_entreprise", valueField: "page_staff_count_range", countField: "page_views_by_staff_count_range" },
    ],
    notes: ["LinkedIn ne donne ni âge ni genre : l'audience se lit par fonction, séniorité, secteur, pays et taille d'entreprise."],
  },
  youtube: {
    platform: "youtube",
    connector: "youtube",
    currentTotalField: "subscriber_count",
    daily: {
      mappings: [
        { field: "subscribers_gained_channel", column: "followers_gained" },
        { field: "subscribers_lost_channel", column: "followers_lost" },
        { field: "views", column: "views" },
        { field: "likes", column: "likes" },
        { field: "comments", column: "comments" },
        { field: "shares", column: "shares" },
        { field: "estimated_minutes_watched", column: "watch_time_seconds", scale: 60 },
      ],
      extras: ["engaged_views", "average_view_duration", "average_view_percentage", "dislikes", "videos_added_to_playlists", "videos_removed_from_playlists", "card_clicks", "card_impressions", "subscribers_gained", "subscribers_lost"],
    },
    posts: {
      idField: "video",
      captionField: "video_title",
      typeField: "creator_content_type",
      publishedField: "published_at",
      urlField: "videourl",
      thumbnailField: "videoimage",
      durationField: "video_length",
      mappings: [
        { field: "video_view_count", column: "views" },
        { field: "video_like_count", column: "likes" },
        { field: "video_comment_count", column: "comments" },
      ],
      extras: ["video_description", "video_tags", "video_category", "privacy_status"],
      supplements: [
        {
          fields: ["shares", "estimated_minutes_watched", "average_view_duration", "average_view_percentage", "subscribers_gained", "engaged_views"],
          mappings: [
            { field: "shares", column: "shares" },
            { field: "estimated_minutes_watched", column: "total_watch_seconds", scale: 60 },
            { field: "average_view_duration", column: "avg_watch_seconds" },
            { field: "average_view_percentage", column: "completion_rate" },
            { field: "subscribers_gained", column: "new_followers" },
          ],
        },
      ],
    },
    postBreakdowns: [{ key: "sources", label: "Sources de trafic", fields: ["traffic_source", "views"] }],
    audience: [
      { dimension: "age_genre", valueField: "viewer_age_group", valueField2: "viewer_gender", shareField: "viewer_percentage" },
      { dimension: "pays", valueField: "country", countField: "views" },
      { dimension: "source_trafic", valueField: "traffic_source", countField: "views" },
    ],
    notes: ["YouTube ne donne le nombre total d'abonnés qu'au jour de la synchro : l'historique est reconstitué à partir des gains et pertes quotidiens."],
  },
  facebook: {
    platform: "facebook",
    connector: "facebook_organic",
    daily: {
      mappings: [
        { field: "page_follows", column: "followers_total" },
        { field: "page_daily_follows_unique", column: "followers_gained" },
        { field: "page_daily_unfollows_unique", column: "followers_lost" },
        { field: "page_impressions", column: "impressions" },
        { field: "page_impressions_unique", column: "reach" },
        { field: "page_post_engagements", column: "engagements" },
        { field: "page_views_total", column: "profile_views" },
        { field: "page_video_views", column: "views" },
        { field: "page_actions_post_reactions_total", column: "likes" },
        { field: "page_total_actions", column: "clicks" },
        { field: "page_video_view_time", column: "watch_time_seconds", scale: 0.001 },
      ],
      extras: ["page_fans", "page_impressions_organic", "page_impressions_paid", "page_total_media_view_unique", "page_video_views_unique", "page_video_views_organic"],
    },
    posts: {
      idField: "post_id",
      captionField: "post_message",
      typeField: "type",
      publishedField: "post_created_time",
      urlField: "permalink_url",
      thumbnailField: "full_picture",
      mappings: [
        { field: "post_impressions", column: "impressions" },
        { field: "post_impressions_unique", column: "reach" },
        { field: "post_reactions_total", column: "likes" },
        { field: "post_comments_total", column: "comments" },
        { field: "post_activity_by_action_type_share", column: "shares" },
        { field: "post_clicks", column: "clicks" },
        { field: "post_video_views", column: "views" },
      ],
      extras: ["post_engagements", "post_video_views_unique", "post_video_complete_views_organic", "post_clicks_by_type_link_clicks", "post_total_media_view_unique"],
      supplements: [
        {
          fields: ["blue_reels_play_count", "fb_reels_total_plays", "post_video_avg_time_watched", "post_video_view_time", "post_video_followers", "reels_post_impressions_unique"],
          mappings: [
            { field: "post_video_avg_time_watched", column: "avg_watch_seconds", scale: 0.001 },
            { field: "post_video_view_time", column: "total_watch_seconds", scale: 0.001 },
            { field: "post_video_followers", column: "new_followers" },
          ],
        },
      ],
    },
    postBreakdowns: [],
    audience: [],
    notes: ["Meta a retiré les données démographiques des Pages (âge, genre, pays des fans) : Windsor ne les fournit plus pour Facebook."],
  },
  instagram: {
    platform: "instagram",
    connector: "instagram",
    currentTotalField: "followers_count",
    daily: {
      mappings: [
        { field: "follower_count_1d", column: "followers_gained" },
        { field: "reach_1d", column: "reach" },
        { field: "impressions_1d", column: "impressions" },
        { field: "profile_views_1d", column: "profile_views" },
        { field: "website_clicks_1d", column: "clicks" },
        { field: "views", column: "views" },
        { field: "likes", column: "likes" },
        { field: "comments", column: "comments" },
        { field: "shares", column: "shares" },
        { field: "total_interactions", column: "engagements" },
      ],
      extras: ["saves", "accounts_engaged", "reposts", "replies", "profile_links_taps", "email_contacts_1d", "follows_and_unfollows", "media_count"],
    },
    posts: {
      idField: "media_id",
      captionField: "media_caption",
      typeField: "media_product_type",
      publishedField: "timestamp",
      urlField: "media_permalink",
      thumbnailField: "media_thumbnail_url",
      mappings: [
        { field: "media_views", column: "views" },
        { field: "media_reach", column: "reach" },
        { field: "media_like_count", column: "likes" },
        { field: "media_comments_count", column: "comments" },
        { field: "media_shares", column: "shares" },
        { field: "media_saved", column: "saves" },
        { field: "media_follows", column: "new_followers" },
        { field: "media_reel_avg_watch_time", column: "avg_watch_seconds", scale: 0.001 },
        { field: "media_reel_total_watch_time", column: "total_watch_seconds", scale: 0.001 },
      ],
      extras: ["media_type", "media_url", "media_engagement", "media_profile_visits", "media_profile_activity", "media_reel_skip_rate", "media_reel_total_interactions", "media_reposts", "media_shortcode"],
    },
    postBreakdowns: [],
    audience: [
      { dimension: "age", valueField: "audience_age_name", countField: "audience_age_size" },
      { dimension: "genre", valueField: "audience_gender_name", countField: "audience_gender_size" },
      { dimension: "age_genre", valueField: "audience_gender_age_name", countField: "audience_gender_age_size" },
      { dimension: "pays", valueField: "audience_country_name", countField: "audience_country_size" },
      { dimension: "ville", valueField: "city", countField: "audience_city_size" },
    ],
    notes: [
      "Instagram ne donne le nombre total d'abonnés qu'au jour de la synchro : l'historique est reconstitué avec les nouveaux abonnés du jour (les désabonnements ne sont pas fournis).",
      "Les stories ne restent disponibles que 24 h chez Instagram : elles ne sont pas historisées.",
    ],
  },
  threads: {
    platform: "threads",
    connector: "threads",
    daily: {
      mappings: [
        { field: "profile_followers_count", column: "followers_total" },
        { field: "profile_views", column: "profile_views" },
        { field: "profile_likes", column: "likes" },
        { field: "profile_replies", column: "comments" },
        { field: "profile_reposts", column: "shares" },
      ],
      extras: ["profile_quotes"],
    },
    posts: {
      idField: "post_id",
      captionField: "post_text",
      typeField: "post_media_type",
      publishedField: "post_timestamp",
      urlField: "post_permalink",
      thumbnailField: "post_thumbnail_url",
      mappings: [
        { field: "post_views", column: "views" },
        { field: "post_likes", column: "likes" },
        { field: "post_replies", column: "comments" },
        { field: "post_reposts", column: "shares" },
      ],
      extras: ["post_quotes", "post_shares", "post_is_quote_post", "post_link_attachment_url", "post_media_product_type"],
    },
    postBreakdowns: [],
    audience: [],
    notes: ["Threads donne la démographie des abonnés sous forme de texte brut : elle n'est pas encore découpée en graphiques."],
  },
};

export function configFor(platform: string): PlatformConfig | null {
  return (PLATFORMS as Record<string, PlatformConfig>)[platform] ?? null;
}
