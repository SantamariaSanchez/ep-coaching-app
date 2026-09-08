// Version des conditions en vigueur.
//
// Sert à deux choses : horodater ce que chaque personne a réellement accepté
// (profiles.cgu_accepted_at + profiles.cgu_version), et pouvoir demander une
// nouvelle acceptation le jour où les conditions changent de façon
// substantielle. Format date pour rester lisible dans la base sans avoir à
// tenir une table de correspondance à côté.
//
// À incrémenter UNIQUEMENT lors d'un changement qui modifie les droits ou les
// obligations des utilisateurs. Une correction de faute ou une reformulation
// ne justifie pas de redemander une acceptation à tout le monde.
export const CGU_VERSION = "2026-09-08";

/** Date affichée en bas des pages légales, cohérente avec la version. */
export const LEGAL_LAST_UPDATED = "8 septembre 2026";
