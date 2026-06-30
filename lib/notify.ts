import { insertNotification } from "@/utils/insert-notification";
import { sendPushToUser } from "@/lib/push";

export interface NotifyParams {
  type: string;
  title: string;
  body?: string;
  url?: string;
}

// Combine la notif in-app (cloche, toujours enregistrée) et le push
// (silencieux si l'utilisateur n'a pas de souscription) — un seul appel
// pour les deux canaux. Fire-and-forget safe : n'importe jamais, donc ne
// doit jamais bloquer l'action qui l'appelle.
export async function notifyUser(userId: string, params: NotifyParams): Promise<void> {
  await Promise.allSettled([
    insertNotification({ userId, ...params }),
    sendPushToUser(userId, params.title, params.body ?? "", params.url),
  ]);
}

export async function notifyUsers(userIds: string[], params: NotifyParams): Promise<void> {
  await Promise.allSettled(userIds.map((userId) => notifyUser(userId, params)));
}
