import webpush from 'web-push';
import { prisma } from './prisma.js';

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@onlyadults.com';

export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

if (isPushConfigured()) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey!, vapidPrivateKey!);
}

export function getVapidPublicKey(): string | null {
  return vapidPublicKey || null;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
};

/**
 * Envoie une notification Web Push à tous les appareils enregistrés d'un utilisateur
 * Nettoie automatiquement les abonnements expirés ou révoqués (404/410)
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured()) {
    return;
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions.length) {
      return;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/icon-192x192.jpg',
      badge: payload.badge || '/icon-192x192.jpg',
      tag: payload.tag || 'onlyadults-notification',
      data: payload.data || {},
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload);
      } catch (err: any) {
        // Si l'abonnement n'est plus valide auprès d'Apple/Google (404 ou 410 Gone), on le supprime
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[WebPush] Nettoyage de l'abonnement expiré pour l'utilisateur ${userId}`);
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`[WebPush] Erreur d'envoi à l'endpoint ${sub.endpoint}:`, err?.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error(`[WebPush] Erreur globale d'envoi pour user ${userId}:`, error);
  }
}
