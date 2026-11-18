import { randomBytes } from "node:crypto";

// En-tête attendu sur les routes /api/cron. Avant : chaque route comparait à
// `Bearer ${process.env.CRON_SECRET}`. Si la variable manquait (nouvel
// environnement, faute de frappe), l'en-tête littéral « Bearer undefined »
// ouvrait les 31 routes (envois de mails, notifications, suppressions de
// comptes inactifs). Sans secret, plus aucune requête ne correspond.
export function cronBearer(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret || !secret.trim()) return `Bearer !${randomBytes(24).toString("hex")}`;
  return `Bearer ${secret}`;
}
