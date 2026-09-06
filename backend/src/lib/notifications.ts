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
  const conversationId =
    input.data && typeof input.data === 'object' && 'conversationId' in (input.data as any)
      ? (input.data as any).conversationId
      : undefined;

  sendPushNotification(input.userId, {
    title: input.title,
    body: input.body,
    url: input.url || '/notifications',
    tag: conversationId ? `msg-${conversationId}` : `notif-${notification.id}`,
    data: {
      notificationId: notification.id,
      type: input.type,
      conversationId,
      ...(typeof input.data === 'object' && input.data !== null ? (input.data as any) : {}),
    },
  }).catch((err) => {
    console.error('[WebPush] Échec envoi notification:', err);
  });

  return notification;
}
