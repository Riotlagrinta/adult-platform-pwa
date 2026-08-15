import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { emitToUser } from './socket.js';

type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Prisma.InputJsonValue;
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

  // Push notification in real-time via Socket.io
  emitToUser(input.userId, 'notification:new', notification);

  return notification;
}
