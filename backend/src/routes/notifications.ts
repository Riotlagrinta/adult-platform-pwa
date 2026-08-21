import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationRouter = Router();

const notificationParamsSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
});

notificationRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

notificationRouter.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const { id } = notificationParamsSchema.parse(req.params);

    const existing = await prisma.notification.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    res.json({ notification });
  } catch (error) {
    next(error);
  }
});
