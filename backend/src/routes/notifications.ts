import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

export const notificationRouter = Router();

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
    const existing = await prisma.notification.findUnique({
      where: { id: String(req.params.id) },
    });

    if (!existing || existing.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const notification = await prisma.notification.update({
      where: { id: String(req.params.id) },
      data: { readAt: new Date() },
    });

    res.json({ notification });
  } catch (error) {
    next(error);
  }
});
