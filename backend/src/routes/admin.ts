import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin, requireStaff } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.get('/summary', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [users, approved, pending, posts, reports, conversations] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { verificationStatus: 'APPROVED' } }),
      prisma.user.count({ where: { verificationStatus: 'PENDING_REVIEW' } }),
      prisma.post.count(),
      prisma.report.count(),
      prisma.conversation.count(),
    ]);

    res.json({
      summary: {
        users,
        approved,
        pending,
        posts,
        reports,
        conversations,
      },
    });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/reports', requireAuth, requireStaff, async (_req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, displayName: true, email: true } },
        targetUser: { select: { id: true, displayName: true } },
      },
    });

    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/users/:id/role', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      role: z.enum(['USER', 'MODERATOR', 'ADMIN']),
    });

    const data = schema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: String(req.params.id) },
      data: { role: data.role as any },
      select: { id: true, email: true, displayName: true, role: true },
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/users', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
      },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});
