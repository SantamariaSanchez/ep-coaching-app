// Coordonnées saisies à l'inscription, transmises au questionnaire de
// préqualification dans le fragment d'URL (jamais envoyé à un serveur ni
// journalisé) pour ne pas les redemander. Lu par components/Wizard.tsx du
// repo ep-coaching-formulaires (clés prenom, nom, email, telephone).
export function prequalPrefill(fullName: string, email: string, phone: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const params = new URLSearchParams();
  if (parts[0]) params.set("prenom", parts[0]);
  if (parts.length > 1) params.set("nom", parts.slice(1).join(" "));
  if (email.trim()) params.set("email", email.trim());
  if (phone.trim()) params.set("telephone", phone.trim());
  return params.toString();
}
