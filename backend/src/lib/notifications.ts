import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { emitToUser } from './socket.js';
import { sendPushNotification } from './push.js';

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
  url?: string;
};

export async function createNotification(input: CreateNotificationInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
    },
  });

  // 1. Notification temps réel via Socket.io (si l'app est ouverte)
  emitToUser(input.userId, 'notification:new', notification);

  // 2. Notification Web Push (si l'app est fermée ou en arrière-plan)
  sendPushNotification(input.userId, {
    title: input.title,
    body: input.body,
    url: input.url || '/notifications',
    data: { notificationId: notification.id, type: input.type },
  }).catch((err) => {
    console.error('[WebPush] Échec envoi notification:', err);
  });

  return notification;
}
