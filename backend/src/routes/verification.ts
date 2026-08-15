import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireStaff } from '../middleware/auth.js';
import { createNotification } from '../lib/notifications.js';

export const verificationRouter = Router();

verificationRouter.post('/request', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      documentType: z.string().min(2),
      documentLast4: z.string().max(4).optional(),
      notes: z.string().max(1000).optional(),
    });

    const data = schema.parse(req.body);

    const request = await prisma.verificationRequest.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        documentType: data.documentType,
        documentLast4: data.documentLast4,
        notes: data.notes,
      },
      update: {
        documentType: data.documentType,
        documentLast4: data.documentLast4,
        notes: data.notes,
        status: 'PENDING_REVIEW',
      },
    });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { verificationStatus: 'PENDING_REVIEW' },
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

verificationRouter.get('/queue', requireAuth, requireStaff, async (_req, res, next) => {
  try {
    const queue = await prisma.verificationRequest.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            bio: true,
            role: true,
            verificationStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    res.json({ queue });
  } catch (error) {
    next(error);
  }
});

verificationRouter.post('/:id/review', requireAuth, requireStaff, async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
      rejectionNote: z.string().max(1000).optional(),
    });

    const data = schema.parse(req.body);

    const request = await prisma.verificationRequest.update({
      where: { id: String(req.params.id) },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedById: req.user!.id,
        rejectionNote: data.rejectionNote,
      },
    });

    await prisma.user.update({
      where: { id: request.userId },
      data: { verificationStatus: data.status },
    });

    await createNotification({
      userId: request.userId,
      type: 'verification.reviewed',
      title: data.status === 'APPROVED' ? 'Compte approuvé' : 'Vérification mise à jour',
      body:
        data.status === 'APPROVED'
          ? 'Votre compte a été validé par un administrateur.'
          : data.rejectionNote ?? 'Votre demande a été mise à jour.',
      data: {
        requestId: request.id,
        status: data.status,
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: req.user!.id,
        action: `verification.${data.status.toLowerCase()}`,
        targetId: request.id,
        meta: data,
      },
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
});
