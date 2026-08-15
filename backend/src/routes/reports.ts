import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { requireApproved } from '../middleware/approved.js';
import { requireStaff } from '../middleware/auth.js';

export const reportRouter = Router();

reportRouter.post('/', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const schema = z.object({
      reason: z.string().min(3).max(1000),
      targetUserId: z.string().optional(),
      targetPostId: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const report = await prisma.report.create({
      data: {
        reporterId: req.user!.id,
        reason: data.reason,
        targetUserId: data.targetUserId,
        targetPostId: data.targetPostId,
      },
    });

    res.status(201).json({ report });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/mine', requireAuth, requireApproved, async (req, res, next) => {
  try {
    const reports = await prisma.report.findMany({
      where: { reporterId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ reports });
  } catch (error) {
    next(error);
  }
});

reportRouter.get('/queue', requireAuth, requireStaff, async (_req, res, next) => {
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

// Résoudre un signalement
reportRouter.post('/:reportId/resolve', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const reportId = String(req.params.reportId);
    const schema = z.object({
      status: z.enum(['REVIEWED', 'CLOSED']),
      action: z.enum(['NONE', 'DELETE_POST', 'SUSPEND_USER', 'DELETE_USER']).default('NONE'),
      notes: z.string().optional(),
    });

    const { status, action, notes } = schema.parse(req.body);

    const report = await prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Signalement non trouvé.' });
    }

    // Appliquer la sanction
    if (action === 'DELETE_POST' && report.targetPostId) {
      await prisma.post.delete({
        where: { id: report.targetPostId },
      });
    } else if (action === 'SUSPEND_USER' && report.targetUserId) {
      await prisma.user.update({
        where: { id: report.targetUserId },
        data: { verificationStatus: 'SUSPENDED' },
      });
    } else if (action === 'DELETE_USER' && report.targetUserId) {
      await prisma.user.delete({
        where: { id: report.targetUserId },
      });
    }

    // Consigner l'action d'administration
    await prisma.adminAction.create({
      data: {
        adminId: req.user!.id,
        action: `RESOLVE_REPORT_${action}`,
        targetId: reportId,
        meta: { notes, action, reportStatus: status } as any,
      },
    });

    // Mettre à jour le signalement
    const updatedReport = await prisma.report.update({
      where: { id: reportId },
      data: { status },
    });

    res.json({ success: true, report: updatedReport });
  } catch (error) {
    next(error);
  }
});
